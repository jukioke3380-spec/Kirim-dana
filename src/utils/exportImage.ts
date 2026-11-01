import html2canvas from 'html2canvas';
import { ReceiptData } from '../types/receipt';
import { formatRupiah } from './numberFormat';

/**
 * Capture receipt DOM element as crisp PNG Blob
 */
export async function captureReceiptAsBlob(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale: 3, // High DPI rendering for sharp print/screen quality
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: element.scrollWidth,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Gagal menghasilkan gambar struk.'));
      }
    }, 'image/png', 1.0);
  });
}

/**
 * Download receipt as PNG file to user device
 */
export async function downloadReceiptImage(element: HTMLElement, filename = 'struk-kirim-dana.png'): Promise<void> {
  const blob = await captureReceiptAsBlob(element);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Share receipt image via Web Share API (WhatsApp, Telegram, IG, etc.)
 */
export async function shareReceiptImage(
  element: HTMLElement,
  receipt: ReceiptData
): Promise<{ sharedViaNative: boolean; error?: string }> {
  try {
    const blob = await captureReceiptAsBlob(element);
    const fileName = `struk-${receipt.refNumber || 'transfer'}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    const shareData: ShareData = {
      title: `Struk Transfer - ${receipt.recipientName}`,
      text: `Bukti Transfer Dana Senilai ${formatRupiah(receipt.amount)} ke ${receipt.bankName} (${receipt.recipientName}). No Ref: ${receipt.refNumber}. Oleh: ${receipt.agentName}`,
      files: [file],
    };

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share(shareData);
      return { sharedViaNative: true };
    } else {
      // Fallback: download the image and prompt user to send manually
      await downloadReceiptImage(element, fileName);
      return { sharedViaNative: false, error: 'Browser tidak mendukung kirim file langsung. Gambar telah diunduh ke HP Anda.' };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { sharedViaNative: false }; // User cancelled sharing
    }
    // Fallback: download image
    const fileName = `struk-${receipt.refNumber || 'transfer'}.png`;
    await downloadReceiptImage(element, fileName);
    return { sharedViaNative: false, error: err.message };
  }
}

/**
 * Format receipt text for WhatsApp caption
 */
export function buildWhatsAppCaption(receipt: ReceiptData): string {
  return `*BUKTI TRANSFER DANA*
*${receipt.agentName}*
--------------------------------
*Status:* ${receipt.status}
*Tanggal:* ${receipt.date} ${receipt.time} WIB
*No. Ref:* ${receipt.refNumber}
--------------------------------
*DETAIL TUJUAN:*
Bank/E-Wallet: *${receipt.bankName}*
No. Rekening: *${receipt.accountNumber}*
Nama Penerima: *${receipt.recipientName}*
--------------------------------
*RINCIAN TRANSAKSI:*
Nominal: ${formatRupiah(receipt.amount)}
Biaya Admin: ${formatRupiah(receipt.adminFee)}
*TOTAL DIBAYAR:* *${formatRupiah(receipt.totalAmount)}*
--------------------------------
_Terima kasih telah bertransaksi di Agen Batara Bekasi._`;
}
