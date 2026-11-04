import { createWorker } from 'tesseract.js';
import { ReceiptData, AppSettings } from '../types/receipt';
import { generateRefNumber, getCurrentDateStr, getCurrentTimeStr } from './numberFormat';

export interface OcrProgress {
  status: string;
  progress: number;
}

// Indonesian Banks & E-Wallets recognition list
export const KNOWN_BANKS = [
  'BCA',
  'MANDIRI',
  'BRI',
  'BNI',
  'DANA',
  'OVO',
  'GOPAY',
  'SHOPEEPAY',
  'SEABANK',
  'BANK JAGO',
  'BSI',
  'CIMB NIAGA',
  'PERMATA',
  'BTN',
  'PANIN',
  'BANK MEGA',
  'OCBC NISP',
  'NEO COMMERCE',
  'BLU BCA',
  'LINKAJA',
  'ALADIN',
  'ALLO BANK',
  'BTPN',
  'JENIUS',
];

/**
 * Pre-processes image on a canvas to boost OCR accuracy:
 * - Upscaling small screenshots
 * - Grayscale conversion
 * - High contrast stretch
 */
export async function preprocessImage(imageSource: string | File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let objectUrl = '';
    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      objectUrl = URL.createObjectURL(imageSource);
      img.src = objectUrl;
    }

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource));
        return;
      }

      // Max dimension around 1600px for balanced speed and OCR crispness
      let width = img.width;
      let height = img.height;
      const maxDim = 1800;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const imgData = ctx.getImageData(0, 0, width, height);
        const d = imgData.data;

        // Grayscale & contrast enhancement
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          // Luminance formula
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;
          // Contrast stretch
          gray = (gray - 128) * 1.35 + 128;
          gray = Math.max(0, Math.min(255, gray));

          d[i] = gray;
          d[i + 1] = gray;
          d[i + 2] = gray;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (e) {
        // Fallback to data URL if security/canvas tainted
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      }
    };

    img.onerror = (err) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(err);
    };
  });
}

/**
 * Runs local offline Tesseract OCR on the image.
 */
export async function runLocalOcr(
  imageSource: string | File | Blob,
  onProgress?: (progress: OcrProgress) => void
): Promise<string> {
  onProgress?.({ status: 'Mempersiapkan gambar untuk OCR...', progress: 10 });
  const preprocessedUrl = await preprocessImage(imageSource);

  onProgress?.({ status: 'Memuat modul OCR Tesseract...', progress: 25 });
  const worker = await createWorker('ind+eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const p = Math.round(25 + m.progress * 65);
        onProgress?.({ status: `Membaca teks bukti transfer (${Math.round(m.progress * 100)}%)...`, progress: p });
      }
    },
  });

  onProgress?.({ status: 'Menganalisis teks bukti transaksi...', progress: 85 });
  const ret = await worker.recognize(preprocessedUrl);
  await worker.terminate();

  onProgress?.({ status: 'Pengecekan data selesai!', progress: 100 });
  return ret.data.text;
}

/**
 * Heuristic parser designed for Indonesian Bank & E-Wallet transfer receipts.
 */
export function parseReceiptText(ocrText: string, settings: AppSettings): Partial<ReceiptData> {
  const lines = ocrText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const cleanText = ocrText.replace(/\r/g, ' ');

  // 1. Detect Source App
  let sourceApp = 'Transfer Bank';
  const upper = cleanText.toUpperCase();
  if (upper.includes('BCA') || upper.includes('M-BCA') || upper.includes('MYBCA')) sourceApp = 'BCA Mobile';
  else if (upper.includes('BRIMO') || upper.includes('BRI ')) sourceApp = 'BRImo';
  else if (upper.includes('LIVIN') || upper.includes('MANDIRI')) sourceApp = "Livin' by Mandiri";
  else if (upper.includes('BNI') || upper.includes('WONDROUS')) sourceApp = 'BNI Mobile';
  else if (upper.includes('DANA')) sourceApp = 'DANA';
  else if (upper.includes('OVO')) sourceApp = 'OVO';
  else if (upper.includes('GOPAY') || upper.includes('GOJEK')) sourceApp = 'GoPay';
  else if (upper.includes('SHOPEEPAY') || upper.includes('SHOPEE')) sourceApp = 'ShopeePay';
  else if (upper.includes('SEABANK')) sourceApp = 'SeaBank';
  else if (upper.includes('JAGO')) sourceApp = 'Bank Jago';
  else if (upper.includes('BSI')) sourceApp = 'BSI Mobile';

  // 2. Extract Bank Name
  let bankName = '';
  for (const b of KNOWN_BANKS) {
    const regex = new RegExp(`\\b${b}\\b`, 'i');
    if (regex.test(cleanText)) {
      bankName = b;
      break;
    }
  }
  if (!bankName) {
    if (upper.includes('BANK CENTRAL ASIA')) bankName = 'BCA';
    else if (upper.includes('BANK RAKYAT INDONESIA')) bankName = 'BRI';
    else if (upper.includes('BANK NEGARA INDONESIA')) bankName = 'BNI';
    else if (upper.includes('BANK SYARIAH INDONESIA')) bankName = 'BSI';
    else bankName = 'BCA'; // sensible fallback
  }

  // 3. Extract Nominal (Amount)
  // Common patterns:
  // "Rp 150.000", "Rp. 150.000,00", "Rp150.000", "150.000,00", "Jumlah 150.000", "Nominal 250.000"
  let amount = 0;
  const amountPatterns = [
    /(?:JUMLAH|NOMINAL|SEBESAR|TOTAL TRANSFER|NILAI|TOTAL PEMBAYARAN|NOMINAL TRANSFER|TRANSFER SEBESAR|TRANSFER)\D{0,15}(?:RP\.?|IDR)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/i,
    /(?:RP\.?|IDR)\s*([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{2})?)/i,
    /([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{2})?)\s*(?:RUPIAH|IDR)/i,
    /\b([1-9][0-9]{0,2}(?:\.[0-9]{3})+)\b/,
  ];

  for (const pat of amountPatterns) {
    const match = cleanText.match(pat);
    if (match && match[1]) {
      // Remove dots and commas (e.g. 150.000,00 -> 150000)
      let rawNumStr = match[1];
      if (rawNumStr.includes(',') && rawNumStr.indexOf(',') === rawNumStr.length - 3) {
        // e.g. "150.000,00"
        rawNumStr = rawNumStr.substring(0, rawNumStr.indexOf(','));
      }
      const parsed = parseInt(rawNumStr.replace(/[^0-9]/g, ''), 10);
      if (parsed >= 1000 && parsed <= 500000000) {
        amount = parsed;
        break;
      }
    }
  }

  // 4. Extract Recipient Name (Nama Penerima)
  let recipientName = '';
  const recipientKeywords = [
    /(?:PENERIMA|NAMA PENERIMA|KEPADA|TUJUAN|TRANSFER KE|KE REKENING|AKUN TUJUAN|NAME|BENEFICIARY)\s*[:=\-]?\s*([A-Z\s.,'/]+)/i,
    /(?:ATAS NAMA|A\.?N\.?)\s*[:=\-]?\s*([A-Z\s.,'/]+)/i,
  ];

  for (const pat of recipientKeywords) {
    const match = cleanText.match(pat);
    if (match && match[1]) {
      const candidate = match[1].split('\n')[0].trim();
      // Filter out invalid keywords like "BERHASIL", "RP", etc.
      if (candidate.length > 2 && !/^(RP|BERHASIL|SUKSES|SELESAI|BANK|TRANSFER|TANGGAL)/i.test(candidate)) {
        recipientName = candidate.replace(/[^A-Za-z\s.,]/g, '').trim().toUpperCase();
        break;
      }
    }
  }

  // If not found by keyword, scan lines near bank name or account number
  if (!recipientName) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      if (line.includes('PENERIMA') || line.includes('TUJUAN') || line.includes('TRANSFER KE')) {
        // check next line
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim().toUpperCase();
          if (nextLine.length >= 3 && !/[0-9]/.test(nextLine) && !nextLine.includes('BERHASIL')) {
            recipientName = nextLine;
            break;
          }
        }
      }
    }
  }

  if (!recipientName) {
    recipientName = 'PENERIMA TRANSFER';
  }

  // 5. Extract Account / Phone Number
  let accountNumber = '';
  // Match digits sequence of 8 to 18 digits or digits with dashes/spaces
  const accMatch = cleanText.match(/\b([0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{2,8}|[0-9]{8,18})\b/);
  if (accMatch && accMatch[1]) {
    accountNumber = accMatch[1].replace(/[-\s]/g, '');
  } else {
    // Check if e-wallet phone number format (08xx or 628xx)
    const phoneMatch = cleanText.match(/\b(08[0-9]{8,12}|628[0-9]{8,12})\b/);
    if (phoneMatch && phoneMatch[1]) {
      accountNumber = phoneMatch[1];
    }
  }

  // 6. Extract Reference Number (No. Ref)
  let refNumber = '';
  const refPatterns = [
    /(?:NO\.?\s*REF(?:ERENSI)?|ID TRANSAKSI|TRANSACTION ID|NO\.?\s*RESI|KODE REFERENSI|NO JURNAL|REF NO)\s*[:=\-]?\s*([A-Za-z0-9\-_]{6,30})/i,
    /\b([0-9]{12,24})\b/,
  ];

  for (const pat of refPatterns) {
    const match = cleanText.match(pat);
    if (match && match[1]) {
      refNumber = match[1].trim();
      break;
    }
  }
  // Requirement C.2: jika tidak ada/kosong, hasilkan kode acak unik/random otomatis
  if (!refNumber) {
    refNumber = generateRefNumber('KD');
  }

  // 7. Extract Date and Time
  let date = getCurrentDateStr();
  let time = getCurrentTimeStr();

  // Date match: DD/MM/YYYY or DD-MM-YYYY or DD Mon YYYY
  const dateMatch = cleanText.match(/\b([0-3]?[0-9][\/\-.][0-1]?[0-9][\/\-.](?:20)?[2-3][0-9])\b/);
  if (dateMatch && dateMatch[1]) {
    date = dateMatch[1].replace(/[-.]/g, '/');
  } else {
    // Match Indonesian date like "01 Nov 2026" or "1 November 2026"
    const indoDateMatch = cleanText.match(/\b([0-3]?[0-9])\s*(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Ags|Agu|Sep|Okt|Nov|Des)[a-z]*\s*(20[2-3][0-9])\b/i);
    if (indoDateMatch) {
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'ag', 'sep', 'okt', 'nov', 'des'];
      const mIdx = monthNames.findIndex((m) => indoDateMatch[2].toLowerCase().startsWith(m));
      const mStr = String(mIdx !== -1 ? mIdx + 1 : 1).padStart(2, '0');
      date = `${String(indoDateMatch[1]).padStart(2, '0')}/${mStr}/${indoDateMatch[3]}`;
    }
  }

  // Time match: HH:MM or HH:MM:SS
  const timeMatch = cleanText.match(/\b([0-2]?[0-9]:[0-5][0-9](?::[0-5][0-9])?)\b/);
  if (timeMatch && timeMatch[1]) {
    time = timeMatch[1];
    if (time.length === 5) time += ':00';
  }

  // 8. Notes / Keterangan
  let notes = 'Transfer Berhasil';
  const notesMatch = cleanText.match(/(?:CATATAN|BERITA|KETERANGAN|PESAN)\s*[:=\-]?\s*([^\n\r]+)/i);
  if (notesMatch && notesMatch[1]) {
    notes = notesMatch[1].trim();
  }

  // 9. Admin Fee & Total
  const adminFee = settings.defaultAdminFee || 5000;
  const totalAmount = amount + adminFee;

  return {
    id: 'receipt_' + Date.now(),
    date,
    time,
    refNumber,
    recipientName,
    bankName,
    accountNumber: accountNumber || '8839210948',
    amount: amount || 100000,
    adminFee,
    totalAmount,
    notes,
    agentName: settings.defaultAgentName || 'loket ppob Athar digital payment',
    agentLocation: settings.defaultAgentLocation || 'Bekasi, Jawa Barat',
    agentContact: settings.defaultAgentContact || '0812-3456-7890',
    status: 'BERHASIL',
    sourceApp,
    rawOcrText: ocrText,
    createdAt: Date.now(),
  };
}
