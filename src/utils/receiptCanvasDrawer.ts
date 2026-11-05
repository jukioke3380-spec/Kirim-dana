import { ReceiptData, AppSettings } from '../types/receipt';
import { formatRupiah } from './numberFormat';

/**
 * Safe rounded rectangle drawer using universal Canvas 2D arcTo.
 * Guarantees 100% compatibility across all Android, iOS, and desktop browsers
 * without relying on modern ctx.roundRect which fails on older WebViews.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

/**
 * Draws a high-resolution, pixel-perfect financial receipt on an HTML5 Canvas.
 * Outputs razor-sharp PNG images suitable for WhatsApp, Instagram, Telegram,
 * printing, and image saving.
 */
export function generateReceiptCanvas(receipt: ReceiptData, settings?: AppSettings): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context tidak tersedia.');
  }

  // 720px width = 2x Retina scale for standard mobile 360px container
  const width = 720;
  const padding = 44;
  const contentWidth = width - padding * 2;

  // Determine dynamic height based on presence of fields
  const hasSumberDana = Boolean(receipt?.senderName || receipt?.senderAccount || receipt?.senderBank);
  const hasNotes = Boolean(receipt?.notes && receipt.notes !== 'Transfer Berhasil' && receipt.notes !== '-');
  const hasLocation = Boolean(receipt?.agentLocation);
  const hasContact = Boolean(receipt?.agentContact);

  let height = 980;
  if (hasSumberDana) height += 160;
  if (hasNotes) height += 50;
  if (hasLocation) height += 24;
  if (hasContact) height += 24;

  canvas.width = width;
  canvas.height = height;

  // 1. Background (Crisp Paper White)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 2. Paper Edge Border (Subtle receipt outline)
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // 3. Top Accent Bar (Gradient Cyan/Sky)
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, '#0284c7');
  grad.addColorStop(0.5, '#38bdf8');
  grad.addColorStop(1, '#06b6d4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, 10);

  let y = 52;

  // Helper functions
  const drawDashedDivider = (currY: number) => {
    ctx.save();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(padding, currY);
    ctx.lineTo(width - padding, currY);
    ctx.stroke();
    ctx.restore();
  };

  const drawSolidDivider = (currY: number, lineW = 2.5, color = '#000000') => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    ctx.moveTo(padding, currY);
    ctx.lineTo(width - padding, currY);
    ctx.stroke();
    ctx.restore();
  };

  const drawRow = (
    label: string,
    value: string,
    currY: number,
    opts: { boldVal?: boolean; monoVal?: boolean; colorVal?: string; size?: number } = {}
  ): number => {
    const fontSize = opts.size || 22;
    ctx.font = `800 ${fontSize}px 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'left';
    ctx.fillText(label, padding, currY);

    const fontFam = opts.monoVal
      ? `'JetBrains Mono', 'Courier New', monospace`
      : `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif`;
    ctx.font = `900 ${fontSize}px ${fontFam}`;
    ctx.fillStyle = opts.colorVal || '#000000';
    ctx.textAlign = 'right';

    // Handle long right-side text wrapping (e.g. recipient name)
    const maxValW = contentWidth - 210;
    const textW = ctx.measureText(value).width;
    if (textW > maxValW) {
      const words = value.split(' ');
      let line1 = '';
      let line2 = '';
      for (const w of words) {
        if (ctx.measureText(line1 + ' ' + w).width < maxValW) {
          line1 += (line1 ? ' ' : '') + w;
        } else {
          line2 += (line2 ? ' ' : '') + w;
        }
      }
      ctx.fillText(line1, width - padding, currY);
      if (line2) {
        ctx.fillText(line2, width - padding, currY + fontSize + 6);
        return currY + fontSize + 34;
      }
    } else {
      ctx.fillText(value, width - padding, currY);
    }

    return currY + 36;
  };

  // --- HEADER: NAMA AGEN & LAYANAN ---
  const agentName = receipt?.agentName || settings?.defaultAgentName || 'Athar digital payment';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000000';
  ctx.font = "900 32px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(agentName.toUpperCase(), width / 2, y);
  y += 32;

  // Tagline
  const tagline = receipt?.agentTagline || settings?.defaultAgentTagline || 'gerai transaksi online & multi pembayaran';
  ctx.fillStyle = '#0284c7';
  ctx.font = "900 18px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(tagline.toUpperCase(), width / 2, y);
  y += 26;

  // Services description
  const services = receipt?.agentServices || settings?.defaultAgentServices || 'layanan transfer uang tarik tunai & pembayaran tagihan';
  ctx.fillStyle = '#000000';
  ctx.font = "800 15px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(services, width / 2, y);
  y += 24;

  if (receipt?.agentLocation) {
    ctx.font = "800 14px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = '#1e293b';
    ctx.fillText(receipt.agentLocation, width / 2, y);
    y += 20;
  }
  if (receipt?.agentContact) {
    ctx.font = "900 14px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = '#0369a1';
    ctx.fillText(`WA/CS: ${receipt.agentContact}`, width / 2, y);
    y += 20;
  }

  y += 8;
  drawDashedDivider(y);
  y += 34;

  // --- STATUS BADGE (BERHASIL) ---
  const badgeW = 290;
  const badgeH = 42;
  const badgeX = (width - badgeW) / 2;
  const badgeY = y - 28;

  ctx.fillStyle = '#ecfdf5';
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 20);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#047857';
  ctx.font = "900 18px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText('✓  TRANSAKSI BERHASIL', width / 2, y - 1);
  y += 36;

  // --- METADATA TRANSAKSI ---
  const dateStr = receipt?.date || '01/01/2026';
  const timeStr = receipt?.time ? `${receipt.time} WIB` : '00:00:00 WIB';
  y = drawRow('Waktu Transaksi', `${dateStr} ${timeStr}`, y, { size: 21 });
  y = drawRow('No. Referensi', receipt?.refNumber || 'KD-' + Date.now(), y, { boldVal: true, monoVal: true, size: 22 });
  y = drawRow('Metode / Saluran', receipt?.sourceApp || 'Transfer Bank', y, { size: 21 });

  y += 6;
  drawDashedDivider(y);
  y += 32;

  // --- SUMBER DANA (PENGIRIM) ---
  if (hasSumberDana) {
    ctx.font = "900 16px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.fillText('SUMBER DANA (PENGIRIM)', padding, y);
    y += 28;

    if (receipt?.senderName) {
      y = drawRow('Nama Pengirim', receipt.senderName, y, { boldVal: true, size: 22 });
    }
    if (receipt?.senderBank) {
      y = drawRow('Bank Asal', receipt.senderBank, y, { size: 21 });
    }
    if (receipt?.senderAccount) {
      y = drawRow('No. Rekening Asal', receipt.senderAccount, y, { monoVal: true, size: 22 });
    }

    y += 6;
    drawDashedDivider(y);
    y += 32;
  }

  // --- DETAIL TUJUAN TRANSFER ---
  ctx.font = "900 16px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.fillText('DETAIL TUJUAN TRANSFER', padding, y);
  y += 28;

  y = drawRow('Bank / E-Wallet', receipt?.bankName || 'BANK TUJUAN', y, { boldVal: true, colorVal: '#0284c7', size: 22 });
  y = drawRow('No. Rekening / ID', receipt?.accountNumber || '-', y, { boldVal: true, monoVal: true, size: 23 });
  y = drawRow('Nama Penerima', receipt?.recipientName || 'PENERIMA TRANSFER', y, { boldVal: true, size: 22 });

  y += 8;
  drawSolidDivider(y, 3, '#000000');
  y += 32;

  // --- RINCIAN BIAYA TRANSAKSI ---
  ctx.font = "900 16px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.fillText('RINCIAN PEMBAYARAN', padding, y);
  y += 28;

  const amountVal = Number(receipt?.amount) || 0;
  const adminVal = Number(receipt?.adminFee) || 0;
  const totalVal = Number(receipt?.totalAmount) || (amountVal + adminVal);

  y = drawRow('Jumlah Transfer', formatRupiah(amountVal), y, { boldVal: true, size: 22 });
  y = drawRow('Biaya Admin', formatRupiah(adminVal), y, { size: 21 });

  y += 6;
  drawDashedDivider(y);
  y += 36;

  // TOTAL PEMBAYARAN (Large and Bold)
  ctx.font = "900 24px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL BAYAR', padding, y);

  ctx.font = "900 34px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillStyle = '#0284c7';
  ctx.textAlign = 'right';
  ctx.fillText(formatRupiah(totalVal), width - padding, y);
  y += 42;

  drawSolidDivider(y, 3, '#000000');
  y += 32;

  // --- CATATAN (IF ANY) ---
  if (hasNotes) {
    ctx.font = "500 18px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText(`Catatan: ${receipt.notes}`, padding, y);
    y += 28;
    drawDashedDivider(y);
    y += 28;
  }

  // --- STAMP LUNAS (WATERMARK STAMP) ---
  ctx.save();
  ctx.translate(width - 150, y + 42);
  ctx.rotate((-12 * Math.PI) / 180);
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, -75, -24, 150, 48, 8);
  ctx.stroke();
  ctx.fillStyle = 'rgba(16, 185, 129, 0.45)';
  ctx.font = "800 22px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText('LUNAS / SAH', 0, 8);
  ctx.restore();

  // --- FOOTER ---
  ctx.textAlign = 'center';
  ctx.font = "500 15px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = '#64748b';

  const footerText = settings?.customFooterNote || 'Terima kasih telah bertransaksi di Agen kami.\nStruk ini adalah bukti pembayaran yang sah.';
  const footerLines = footerText.split('\n');
  for (const line of footerLines) {
    ctx.fillText(line, width / 2, y);
    y += 22;
  }

  y += 10;
  ctx.font = "600 13px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Cetak Digital via PWA kirim dana • ${dateStr} ${timeStr}`, width / 2, y);

  return canvas;
}
