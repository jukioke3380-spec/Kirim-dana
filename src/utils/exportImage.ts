import { ReceiptData, AppSettings } from '../types/receipt';
import { formatRupiah } from './numberFormat';
import { generateReceiptCanvas } from './receiptCanvasDrawer';

/**
 * Capture receipt as high-resolution PNG Blob using Canvas 2D
 * (Zero CSS dependencies, immune to Tailwind v4 OKLCH color parsing errors)
 */
export async function captureReceiptAsBlob(
  receipt: ReceiptData,
  settings: AppSettings
): Promise<Blob> {
  const canvas = generateReceiptCanvas(receipt, settings);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          // Fallback to dataURL conversion if toBlob fails
          try {
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            const byteString = atob(dataUrl.split(',')[1]);
            const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            resolve(new Blob([ab], { type: mimeString }));
          } catch (e: any) {
            reject(new Error(e.message || 'Gagal menghasilkan gambar struk.'));
          }
        }
      },
      'image/png',
      1.0
    );
  });
}

/**
 * Download receipt as PNG file directly to user device/gallery
 */
export async function downloadReceiptImage(
  receipt: ReceiptData,
  settings: AppSettings,
  customFilename?: string
): Promise<void> {
  const blob = await captureReceiptAsBlob(receipt, settings);
  const fileName =
    customFilename ||
    `struk-${(receipt.recipientName || 'transfer').replace(/\s+/g, '_')}-${receipt.refNumber || Date.now()}.png`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();

  // Cleanup after trigger
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 3000);
}

/**
 * Share receipt image via Web Share API (WhatsApp, Telegram, IG, etc.)
 */
export async function shareReceiptImage(
  receipt: ReceiptData,
  settings: AppSettings
): Promise<{ sharedViaNative: boolean; error?: string }> {
  try {
    const blob = await captureReceiptAsBlob(receipt, settings);
    const fileName = `struk-${(receipt.recipientName || 'transfer').replace(/\s+/g, '_')}-${receipt.refNumber}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    const caption = buildWhatsAppCaption(receipt);

    // Check if browser supports Web Share API with files
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        // Try sharing both file and caption
        await navigator.share({
          title: `Struk Transfer - ${receipt.recipientName}`,
          text: caption,
          files: [file],
        });
        return { sharedViaNative: true };
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          // User cancelled picker
          return { sharedViaNative: false };
        }
        // If combined share failed (e.g. WhatsApp on certain Android versions), try file only
        try {
          await navigator.share({
            files: [file],
          });
          return { sharedViaNative: true };
        } catch (innerErr: any) {
          if (innerErr.name === 'AbortError') return { sharedViaNative: false };
          throw innerErr;
        }
      }
    }

    // Fallback if Web Share API with files is not supported:
    // Download image to device and notify user
    await downloadReceiptImage(receipt, settings, fileName);
    return {
      sharedViaNative: false,
      error: 'Browser tidak mendukung bagikan gambar langsung. Gambar struk telah diunduh ke HP Anda dan siap dikirim via galeri.',
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { sharedViaNative: false };
    }
    // Fallback: download image
    await downloadReceiptImage(receipt, settings);
    return { sharedViaNative: false, error: err.message || 'Gagal membagikan struk.' };
  }
}

/**
 * Direct WhatsApp Share: Opens WhatsApp with preformatted text caption AND downloads the PNG image
 */
export async function shareDirectToWhatsApp(
  receipt: ReceiptData,
  settings: AppSettings
): Promise<void> {
  // 1. Download image to gallery first
  await downloadReceiptImage(receipt, settings);

  // 2. Open WhatsApp with caption
  const caption = buildWhatsAppCaption(receipt);
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(caption)}`;
  window.open(waUrl, '_blank');
}

/**
 * Format receipt text for WhatsApp caption
 */
export function buildWhatsAppCaption(receipt: ReceiptData): string {
  const tagline = receipt.agentTagline || 'gerai transaksi online & multi pembayaran';
  const services = receipt.agentServices || 'layanan transfer uang tarik tunai & pembayaran tagihan';

  let caption = `*BUKTI TRANSFER DANA*
*${receipt.agentName || 'loket ppob Athar digital payment'}*
_${tagline}_
_${services}_
--------------------------------
*Status:* ${receipt.status || 'BERHASIL'}
*Tanggal:* ${receipt.date} ${receipt.time} WIB
*No. Ref:* ${receipt.refNumber}
--------------------------------
`;

  if (receipt.senderName || receipt.senderAccount || receipt.senderBank) {
    caption += `*SUMBER DANA (PENGIRIM):*
Nama Pengirim: *${receipt.senderName || '-'}*
`;
    if (receipt.senderBank) caption += `Bank Asal: *${receipt.senderBank}*\n`;
    if (receipt.senderAccount) caption += `No. Rekening: *${receipt.senderAccount}*\n`;
    caption += `--------------------------------\n`;
  }

  caption += `*DETAIL TUJUAN:*
Bank/E-Wallet: *${receipt.bankName}*
No. Rekening: *${receipt.accountNumber}*
Nama Penerima: *${receipt.recipientName}*
--------------------------------
*RINCIAN TRANSAKSI:*
Nominal: ${formatRupiah(receipt.amount)}
Biaya Admin: ${formatRupiah(receipt.adminFee)}
*TOTAL DIBAYAR:* *${formatRupiah(receipt.totalAmount)}*
--------------------------------
`;

  if (receipt.notes && receipt.notes !== 'Transfer Berhasil') {
    caption += `Catatan: ${receipt.notes}\n--------------------------------\n`;
  }

  caption += `_Terima kasih telah bertransaksi di ${receipt.agentName || 'loket ppob Athar digital payment'}._`;

  return caption;
}
