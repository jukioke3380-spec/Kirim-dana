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

      // Max dimension around 1800px for balanced speed and OCR crispness
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

        // Grayscale & gentle contrast enhancement
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          // Luminance formula
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;
          // Gentle contrast (1.1 instead of 1.35 to avoid blowing out watermark background)
          gray = (gray - 128) * 1.1 + 128;
          gray = Math.max(0, Math.min(255, gray));

          d[i] = gray;
          d[i + 1] = gray;
          d[i + 2] = gray;
        }

        ctx.putImageData(imgData, 0, 0);
        // Lossless PNG for crisp OCR character recognition
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        // Fallback to PNG
        resolve(canvas.toDataURL('image/png'));
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
  const upper = cleanText.toUpperCase();

  // 1. Detect Source App
  let sourceApp = 'Transfer Bank';
  if (upper.includes('BRIMO') || upper.includes('BANK BRI') || upper.includes('BANK RAKYAT INDONESIA')) sourceApp = 'BRImo';
  else if (upper.includes('BCA') || upper.includes('M-BCA') || upper.includes('MYBCA')) sourceApp = 'BCA Mobile';
  else if (upper.includes('LIVIN') || upper.includes('MANDIRI')) sourceApp = "Livin' by Mandiri";
  else if (upper.includes('BNI') || upper.includes('WONDROUS')) sourceApp = 'BNI Mobile';
  else if (upper.includes('DANA')) sourceApp = 'DANA';
  else if (upper.includes('OVO')) sourceApp = 'OVO';
  else if (upper.includes('GOPAY') || upper.includes('GOJEK')) sourceApp = 'GoPay';
  else if (upper.includes('SHOPEEPAY') || upper.includes('SHOPEE')) sourceApp = 'ShopeePay';
  else if (upper.includes('SEABANK')) sourceApp = 'SeaBank';
  else if (upper.includes('JAGO')) sourceApp = 'Bank Jago';
  else if (upper.includes('BSI')) sourceApp = 'BSI Mobile';

  // 2. Extract Reference Number (No. Ref) first
  // Having this first prevents ref digits from being mistakenly extracted as account number!
  let refNumber = '';
  const refPatterns = [
    /(?:NO\.?\s*REF(?:ERENSI)?|ID\s+TRANSAKSI|TRANSACTION\s+ID|NO\.?\s*RESI|KODE\s+REFERENSI|NO\.?\s*JURNAL|REF\s*NO)\s*[:=\-|]?\s*([A-Za-z0-9\-_]{6,30})/i,
    /(?:REF|RESI|ID)\s*[:=\-|]\s*([0-9]{8,24})/i,
  ];

  for (const pat of refPatterns) {
    const match = cleanText.match(pat);
    if (match && match[1]) {
      refNumber = match[1].trim();
      break;
    }
  }

  const cleanRefDigits = refNumber.replace(/[^0-9]/g, '');

  // 3a. Extract Source of Funds (Sumber Dana / Pengirim)
  const sumberIdx = lines.findIndex((l) => {
    const cleanL = l.replace(/^[^a-zA-Z0-9]+/, '').trim();
    return /^(SUMBER\s+DANA|DARI\s+REKENING|DARI|PENGIRIM|REKENING\s+ASAL|SUMBER)\b/i.test(cleanL);
  });

  let senderName = '';
  let senderAccount = '';
  let senderBank = '';

  if (sumberIdx !== -1) {
    for (let i = sumberIdx + 1; i < Math.min(sumberIdx + 6, lines.length); i++) {
      const line = lines[i].replace(/[|]/g, '').trim();
      if (/^(Tujuan|Transfer\s+Ke|Penerima|Rekening\s+Tujuan|Jenis\s+Transaksi|Catatan|Nominal)/i.test(line)) {
        break;
      }

      // Check account (masked e.g. 6305 **** 530 or unmasked digits)
      if (/^[0-9]{2,6}\s*[*+xXwW_\-~\s]{2,}\s*[0-9]{2,6}$/.test(line) || /[0-9]{8,20}/.test(line.replace(/\s+/g, ''))) {
        if (!senderAccount && (line.includes('*') || line.includes('+') || line.includes('x') || line.replace(/[^0-9]/g, '').length >= 8)) {
          senderAccount = line.replace(/[*+xXwW_\-~]{2,}/g, '****').replace(/\s+/g, ' ').trim();
          continue;
        }
      }

      // Check bank
      if (/BANK\s+[A-Za-z]+|BCA|MANDIRI|BRI|BNI|DANA/i.test(line)) {
        if (!senderBank) {
          senderBank = line.replace(/^\(?[a-zA-Z]{2,3}\)?\s+/, '').trim().toUpperCase();
        }
        continue;
      }

      // Check sender name
      const cleanLine = line.replace(/^\(?[a-zA-Z]{2,3}\)?\s+/, '').trim();
      if (
        cleanLine.length > 2 &&
        !cleanLine.match(/[0-9]{4}/) &&
        !cleanLine.includes('*') &&
        !/^(BANK|SUMBER|DANA|REKENING)/i.test(cleanLine) &&
        !senderName
      ) {
        senderName = cleanLine.toUpperCase();
      }
    }
  }

  // Fallback for sender bank if detected from sourceApp
  if (!senderBank) {
    if (sourceApp === 'BRImo') senderBank = 'BANK BRI';
    else if (sourceApp === 'BCA Mobile') senderBank = 'BCA';
    else if (sourceApp === "Livin' by Mandiri") senderBank = 'BANK MANDIRI';
    else if (sourceApp === 'BNI Mobile') senderBank = 'BNI';
    else if (sourceApp === 'DANA') senderBank = 'DANA';
  }

  // 3b. Locate Destination Section ("TUJUAN" / "TRANSFER KE" / "PENERIMA" / "REKENING TUJUAN")
  const tujuanIdx = lines.findIndex((l) => {
    const cleanL = l.replace(/^[^a-zA-Z0-9]+/, '').trim();
    return (
      /^(TUJUAN|TRANSFER\s+KE|PENERIMA|REKENING\s+TUJUAN|KE\s+REKENING)\b/i.test(cleanL) ||
      /\bTUJUAN\b/i.test(cleanL)
    ) && !/SUMBER/i.test(cleanL);
  });

  const tujuanLines: string[] = [];
  if (tujuanIdx !== -1) {
    // Check line itself (if it contains data after "Tujuan") and subsequent lines
    for (let i = tujuanIdx; i < Math.min(tujuanIdx + 7, lines.length); i++) {
      const line = lines[i];
      if (i > tujuanIdx && /^(Jenis\s+Transaksi|Catatan|Nominal|Biaya|Total|INFORMASI|Sumber\s+Dana|Detail\s+Transaksi|Waktu)/i.test(line)) {
        break;
      }
      tujuanLines.push(line);
    }
  }

  // 4. Extract Destination Account Number (Nomor Rekening Tujuan)
  let accountNumber = '';

  // Priority A: Search inside the Tujuan lines and join all digit fragments
  // This handles both single line "1160 0101 6845 502" and multi-line wraps (e.g. "1160 0101" + "6845 502" = 15 digits!)
  if (tujuanLines.length > 0) {
    const digitSegments: string[] = [];
    for (const line of tujuanLines) {
      // Skip lines that are purely bank names or avatar headers
      if (/BANK\s+[A-Za-z]+|^(BCA|BRI|MANDIRI|BNI|DANA)\b/i.test(line)) continue;
      // Skip lines that have no digits (e.g. pure recipient names)
      if (/^[A-Za-z\s.,']+$/.test(line) && !/[0-9]/.test(line)) continue;

      // Extract all digit groups from the line
      const matches = line.matchAll(/(?:\b[0-9]{2,6}[\s\-]+){1,5}[0-9]{2,6}\b|\b[0-9]{3,20}\b/g);
      for (const m of matches) {
        const raw = m[0].replace(/[^0-9]/g, '');
        if (raw !== cleanRefDigits) {
          digitSegments.push(m[0].trim());
        }
      }
    }

    if (digitSegments.length > 0) {
      const combined = digitSegments.join(' ').replace(/\s+/g, ' ').trim();
      const rawCombined = combined.replace(/[^0-9]/g, '');
      if (rawCombined.length >= 8 && rawCombined !== cleanRefDigits) {
        // If 15 digits (standard Bank BRI), format cleanly into 4 groups: 1160 0101 6845 502
        if (rawCombined.length === 15) {
          accountNumber = `${rawCombined.slice(0, 4)} ${rawCombined.slice(4, 8)} ${rawCombined.slice(8, 12)} ${rawCombined.slice(12, 15)}`;
        } else {
          accountNumber = combined;
        }
      }
    }
  }

  // Priority B: Search for explicit label (e.g. "No. Rekening: 1160 0101 6845 502")
  if (!accountNumber) {
    const labelMatch = cleanText.match(/(?:NO\.?\s*REK(?:ENING)?(?:\s*TUJUAN)?|REKENING\s*TUJUAN|NOMOR\s*REKENING|NO\s*AKUN)\s*[:=\-|]?\s*([0-9\s\-]{8,28})/i);
    if (labelMatch && labelMatch[1]) {
      const cand = labelMatch[1].trim();
      const raw = cand.replace(/[^0-9]/g, '');
      if (raw.length >= 8 && raw !== cleanRefDigits) {
        if (raw.length === 15) {
          accountNumber = `${raw.slice(0, 4)} ${raw.slice(4, 8)} ${raw.slice(8, 12)} ${raw.slice(12, 15)}`;
        } else {
          accountNumber = cand.replace(/\s+/g, ' ').trim();
        }
      }
    }
  }

  // Priority C: Check lines directly under destination bank keywords
  if (!accountNumber) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      if (line.includes('BANK BRI') || line.includes('BCA') || line.includes('BANK MANDIRI') || line.includes('BNI')) {
        // Exclude Sumber Dana lines
        if (i > 0 && /SUMBER/i.test(lines[i - 1])) continue;
        if (/SUMBER/i.test(line)) continue;

        // Check subsequent lines and join multi-line digit chunks
        const followingDigits: string[] = [];
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const l = lines[j];
          if (/^(Jenis\s+Transaksi|Catatan|Nominal|Biaya|Total|INFORMASI)/i.test(l)) break;
          const m = l.match(/(?:\b[0-9]{2,6}[\s\-]+){1,5}[0-9]{2,6}\b|\b[0-9]{3,20}\b/g);
          if (m) {
            for (const item of m) {
              const raw = item.replace(/[^0-9]/g, '');
              if (raw !== cleanRefDigits) {
                followingDigits.push(item.trim());
              }
            }
          }
        }

        if (followingDigits.length > 0) {
          const combined = followingDigits.join(' ').replace(/\s+/g, ' ').trim();
          const raw = combined.replace(/[^0-9]/g, '');
          if (raw.length >= 8 && raw !== cleanRefDigits) {
            if (raw.length === 15) {
              accountNumber = `${raw.slice(0, 4)} ${raw.slice(4, 8)} ${raw.slice(8, 12)} ${raw.slice(12, 15)}`;
            } else {
              accountNumber = combined;
            }
            break;
          }
        }
      }
    }
  }

  // Priority D: Find any 8-20 digit sequence not matching refNumber, masked source account, or NPWP
  if (!accountNumber) {
    const allMatches = cleanText.matchAll(/(?:\b[0-9]{2,6}[\s\-]+){1,5}[0-9]{2,6}\b|\b[0-9]{8,20}\b/g);
    for (const match of allMatches) {
      const cand = match[0].trim();
      const raw = cand.replace(/[^0-9]/g, '');
      // Exclude ref number, NPWP (010016087...), and masked numbers
      if (raw.length >= 8 && raw !== cleanRefDigits && !raw.startsWith('010016087') && !cand.includes('*')) {
        if (raw.length === 15) {
          accountNumber = `${raw.slice(0, 4)} ${raw.slice(4, 8)} ${raw.slice(8, 12)} ${raw.slice(12, 15)}`;
        } else {
          accountNumber = cand.replace(/\s+/g, ' ').trim();
        }
        break;
      }
    }
  }

  // Priority E: Check e-wallet phone number format (08xx or 628xx)
  if (!accountNumber) {
    const phoneMatch = cleanText.match(/\b(08[0-9]{8,12}|628[0-9]{8,12})\b/);
    if (phoneMatch && phoneMatch[1]) {
      accountNumber = phoneMatch[1];
    }
  }

  // If still not found, leave as empty string or dash (NEVER inject fake/dummy account numbers!)
  if (!accountNumber) {
    accountNumber = '-';
  }

  // CRITICAL CHECK: Destination account number must NEVER be equal to the Reference Number!
  if (accountNumber && cleanRefDigits && accountNumber.replace(/[^0-9]/g, '') === cleanRefDigits) {
    accountNumber = '';
    const allMatches = cleanText.matchAll(/(?:\b[0-9]{2,6}[\s\-]+){1,5}[0-9]{2,6}\b|\b[0-9]{8,20}\b/g);
    for (const match of allMatches) {
      const cand = match[0].trim();
      const raw = cand.replace(/[^0-9]/g, '');
      if (raw !== cleanRefDigits && raw.length >= 8 && !raw.startsWith('010016087') && !cand.includes('*')) {
        if (raw.length === 15) {
          accountNumber = `${raw.slice(0, 4)} ${raw.slice(4, 8)} ${raw.slice(8, 12)} ${raw.slice(12, 15)}`;
        } else {
          accountNumber = cand.replace(/\s+/g, ' ').trim();
        }
        break;
      }
    }
    if (!accountNumber) {
      accountNumber = '-';
    }
  }

  // 5. Extract Recipient Name (Nama Penerima)
  let recipientName = '';

  // Priority A: From Tujuan block lines
  if (tujuanLines.length > 0) {
    for (const line of tujuanLines) {
      // Remove avatar abbreviations like "AP " or "(AP) " from BRImo UI
      const cleanLine = line.replace(/^\(?[A-Z]{2,3}\)?\s+/, '').trim();
      // Skip if contains 4+ consecutive digits (that's an account number), or is a known header
      if (
        !cleanLine.match(/[0-9]{4}/) &&
        !/^(BANK|TRANSFER|JENIS|CATATAN|TOTAL|NOMINAL|SUMBER|TUJUAN)/i.test(cleanLine) &&
        cleanLine.length > 2
      ) {
        recipientName = cleanLine.toUpperCase();
        break;
      }
    }
  }

  // Priority B: From explicit keyword matching
  if (!recipientName) {
    const recipientKeywords = [
      /(?:PENERIMA|NAMA PENERIMA|KEPADA|TUJUAN|TRANSFER KE|KE REKENING|AKUN TUJUAN|NAME|BENEFICIARY)\s*[:=\-|]?\s*([A-Z\s.,'/]+)/i,
      /(?:ATAS NAMA|A\.?N\.?)\s*[:=\-|]?\s*([A-Z\s.,'/]+)/i,
    ];
    for (const pat of recipientKeywords) {
      const match = cleanText.match(pat);
      if (match && match[1]) {
        const candidate = match[1].split('\n')[0].trim();
        if (candidate.length > 2 && !/^(RP|BERHASIL|SUKSES|SELESAI|BANK|TRANSFER|TANGGAL)/i.test(candidate)) {
          recipientName = candidate.replace(/[^A-Za-z\s.,]/g, '').trim().toUpperCase();
          break;
        }
      }
    }
  }

  if (!recipientName) {
    recipientName = 'PENERIMA TRANSFER';
  }

  // 6. Extract Destination Bank Name
  let bankName = '';
  // Check tujuanLines first
  for (const line of tujuanLines) {
    for (const b of KNOWN_BANKS) {
      if (new RegExp(`\\b${b}\\b`, 'i').test(line)) {
        bankName = b;
        break;
      }
    }
    if (bankName) break;
  }

  // Check 'Jenis Transaksi' line (e.g. "Jenis Transaksi Transfer Bank BRI")
  if (!bankName) {
    const jtMatch = cleanText.match(/Jenis\s+Transaksi\s+Transfer\s+Bank\s+([A-Za-z]+)/i);
    if (jtMatch && jtMatch[1]) {
      bankName = jtMatch[1].toUpperCase();
    }
  }

  // Fallback to checking overall text
  if (!bankName) {
    for (const b of KNOWN_BANKS) {
      const regex = new RegExp(`\\b${b}\\b`, 'i');
      if (regex.test(cleanText)) {
        bankName = b;
        break;
      }
    }
  }

  if (!bankName) {
    if (upper.includes('BANK CENTRAL ASIA')) bankName = 'BCA';
    else if (upper.includes('BANK RAKYAT INDONESIA') || upper.includes('BRI')) bankName = 'BRI';
    else if (upper.includes('BANK MANDIRI') || upper.includes('MANDIRI')) bankName = 'MANDIRI';
    else if (upper.includes('BANK NEGARA INDONESIA') || upper.includes('BNI')) bankName = 'BNI';
    else if (upper.includes('BANK SYARIAH INDONESIA') || upper.includes('BSI')) bankName = 'BSI';
    else bankName = 'BRI';
  }

  // 7. Extract Nominal (Amount)
  let amount = 0;
  const amountPatterns = [
    /(?:NOMINAL|JUMLAH|SEBESAR|TOTAL TRANSAKSI|TOTAL TRANSFER|NILAI|TOTAL PEMBAYARAN|NOMINAL TRANSFER|TRANSFER)\D{0,15}(?:RP\.?|IDR)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/i,
    /(?:RP\.?|IDR)\s*([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{2})?)/i,
    /([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{2})?)\s*(?:RUPIAH|IDR)/i,
    /\b([1-9][0-9]{0,2}(?:\.[0-9]{3})+)\b/,
  ];

  for (const pat of amountPatterns) {
    const match = cleanText.match(pat);
    if (match && match[1]) {
      let rawNumStr = match[1];
      if (rawNumStr.includes(',') && rawNumStr.indexOf(',') === rawNumStr.length - 3) {
        rawNumStr = rawNumStr.substring(0, rawNumStr.indexOf(','));
      }
      const parsed = parseInt(rawNumStr.replace(/[^0-9]/g, ''), 10);
      if (parsed >= 1000 && parsed <= 500000000) {
        amount = parsed;
        break;
      }
    }
  }

  // 8. If refNumber was not found above, generate a unique KD code
  if (!refNumber) {
    refNumber = generateRefNumber(bankName ? bankName.substring(0, 3).toUpperCase() : 'KD');
  }

  // 9. Extract Date and Time
  let date = getCurrentDateStr();
  let time = getCurrentTimeStr();

  // Match Indonesian date like "15 Oktober 2026" or "1 Nov 2026"
  const indoDateMatch = cleanText.match(/\b([0-3]?[0-9])\s*(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Ags|Agu|Sep|Okt|Nov|Des)[a-z]*\s*(20[2-3][0-9])\b/i);
  if (indoDateMatch) {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'ag', 'sep', 'okt', 'nov', 'des'];
    const mIdx = monthNames.findIndex((m) => indoDateMatch[2].toLowerCase().startsWith(m));
    const mStr = String(mIdx !== -1 ? mIdx + 1 : 1).padStart(2, '0');
    date = `${String(indoDateMatch[1]).padStart(2, '0')}/${mStr}/${indoDateMatch[3]}`;
  } else {
    // Date match: DD/MM/YYYY or DD-MM-YYYY
    const dateMatch = cleanText.match(/\b([0-3]?[0-9][\/\-.][0-1]?[0-9][\/\-.](?:20)?[2-3][0-9])\b/);
    if (dateMatch && dateMatch[1]) {
      date = dateMatch[1].replace(/[-.]/g, '/');
    }
  }

  // Time match: HH:MM or HH:MM:SS
  const timeMatch = cleanText.match(/\b([0-2]?[0-9]:[0-5][0-9](?::[0-5][0-9])?)\b/);
  if (timeMatch && timeMatch[1]) {
    time = timeMatch[1];
    if (time.length === 5) time += ':00';
  }

  // 10. Notes / Keterangan
  let notes = 'Transfer Berhasil';
  const notesMatch = cleanText.match(/(?:CATATAN|BERITA|KETERANGAN|PESAN)\s*[:=\-|]?\s*([^\n\r]+)/i);
  if (notesMatch && notesMatch[1]) {
    const rawCandidate = notesMatch[1].replace(/^[-–—:\s|]+/, '').trim();
    if (
      rawCandidate.length > 1 &&
      !/^(NOMINAL|BIAYA|TOTAL|RP|TRANSFER|JENIS|INFORMASI)/i.test(rawCandidate)
    ) {
      notes = rawCandidate;
    }
  }

  // 11. Admin Fee & Total
  const adminFee = settings.defaultAdminFee || 5000;
  const totalAmount = amount + adminFee;

  return {
    id: 'receipt_' + Date.now(),
    date,
    time,
    refNumber,
    // Sumber Dana
    senderName,
    senderAccount,
    senderBank,
    // Detail Tujuan
    recipientName,
    bankName,
    accountNumber,
    amount: amount || 100000,
    adminFee,
    totalAmount,
    notes,
    agentName: settings.defaultAgentName || 'loket ppob Athar digital payment',
    agentTagline: settings.defaultAgentTagline || 'gerai transaksi online & multi pembayaran',
    agentServices: settings.defaultAgentServices || 'layanan transfer uang tarik tunai & pembayaran tagihan',
    agentLocation: settings.defaultAgentLocation || '',
    agentContact: settings.defaultAgentContact || '',
    status: 'BERHASIL',
    sourceApp,
    rawOcrText: ocrText,
    createdAt: Date.now(),
  };
}
