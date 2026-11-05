import { ReceiptData, AppSettings } from '../types/receipt';
import { formatRupiah } from './numberFormat';

/**
 * Draws a high-resolution, pixel-perfect financial receipt on an HTML5 Canvas.
 * This runs completely offline, has zero CSS/OKLCH dependencies, and outputs
 * razor-sharp PNG images suitable for thermal printers, WhatsApp, and social media.
 */
export function generateReceiptCanvas(receipt: ReceiptData, settings: AppSettings): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context tidak tersedia di browser ini.');
  }

  // 720px width = 2x Retina scale for standard mobile 360px container
  const width = 720;
  const padding = 44;
  const contentWidth = width - padding * 2;

  // Pre-calculate dynamic height
  let estimatedHeight = 560; // Base header, status, footer, rincian
  if (receipt.agentTagline) estimatedHeight += 32;
  if (receipt.agentServices) estimatedHeight += 44;
  if (receipt.agentLocation) estimatedHeight += 26;
  if (receipt.agentContact) estimatedHeight += 26;
  if (receipt.senderName || receipt.senderAccount) estimatedHeight += 150; // Sumber dana block
  if (receipt.notes && receipt.notes !== 'Transfer Berhasil') estimatedHeight += 45;
  if (settings.customFooterNote) estimatedHeight += 40;

  const height = Math.max(estimatedHeight, 880);
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

  let y = 48;

  // Helper functions
  const drawDashedDivider = (currY: number) => {
    ctx.save();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(padding, currY);
    ctx.lineTo(width - padding, currY);
    ctx.stroke();
    ctx.restore();
  };

  const drawSolidDivider = (currY: number, lineW = 2, color = '#cbd5e1') => {
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
    ctx.font = `500 ${fontSize}px 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText(label, padding, currY);

    const valFontWeight = opts.boldVal ? '700' : '600';
    const fontFam = opts.monoVal
      ? `'JetBrains Mono', monospace`
      : `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif`;
    ctx.font = `${valFontWeight} ${fontSize}px ${fontFam}`;
    ctx.fillStyle = opts.colorVal || '#0f172a';
    ctx.textAlign = 'right';

    // Measure and wrap if right-side text is very long (e.g. long recipient name)
    const maxValW = contentWidth - 210;
    const textW = ctx.measureText(value).width;
    if (textW > maxValW) {
      // Split into 2 lines
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
        ctx.fillText(line2, width - padding, currY + fontSize + 4);
        return currY + fontSize + 30;
      }
    } else {
      ctx.fillText(value, width - padding, currY);
    }

    return currY + 34;
  };

  // --- HEADER: NAMA AGEN & LAYANAN ---
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = "800 28px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(receipt.agentName || 'LOKET PPOB ATHAR DIGITAL PAYMENT', width / 2, y);
  y += 30;

  // Tagline
  const tagline = receipt.agentTagline || settings.defaultAgentTagline || 'gerai transaksi online & multi pembayaran';
  ctx.fillStyle = '#0284c7';
  ctx.font = "700 18px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(tagline.toUpperCase(), width / 2, y);
  y += 26;

  // Services description
  const services = receipt.agentServices || settings.defaultAgentServices || 'layanan transfer uang tarik tunai & pembayaran tagihan';
  ctx.fillStyle = '#64748b';
  ctx.font = "500 15px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(services, width / 2, y);
  y += 24;

  if (receipt.agentLocation) {
    ctx.font = "500 14px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(receipt.agentLocation, width / 2, y);
    y += 20;
  }
  if (receipt.agentContact) {
    ctx.font = "600 14px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = '#0369a1';
    ctx.fillText(`WA/CS: ${receipt.agentContact}`, width / 2, y);
    y += 20;
  }

  y += 12;
  drawDashedDivider(y);
  y += 34;

  // --- STATUS BADGE (BERHASIL) ---
  const badgeW = 280;
  const badgeH = 40;
  const badgeX = (width - badgeW) / 2;
  const badgeY = y - 26;

  ctx.fillStyle = '#ecfdf5';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 20);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#047857';
  ctx.font = "700 17px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText('✓  TRANSAKSI BERHASIL', width / 2, y - 1);
  y += 34;

  // --- METADATA TRANSAKSI ---
  y = drawRow('Waktu Transaksi', `${receipt.date} ${receipt.time} WIB`, y, { size: 20 });
  y = drawRow('No. Referensi', receipt.refNumber, y, { boldVal: true, monoVal: true, size: 21 });
  y = drawRow('Metode / Saluran', receipt.sourceApp || 'Transfer Bank', y, { size: 20 });

  y += 6;
  drawDashedDivider(y);
  y += 30;

  // --- SUMBER DANA (PENGIRIM) ---
  if (receipt.senderName || receipt.senderAccount || receipt.senderBank) {
    ctx.font = "700 14px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('SUMBER DANA (PENGIRIM)', padding, y);
    y += 28;

    if (receipt.senderName) {
      y = drawRow('Nama Pengirim', receipt.senderName, y, { boldVal: true, size: 21 });
    }
    if (receipt.senderBank) {
      y = drawRow('Bank Asal', receipt.senderBank, y, { size: 20 });
    }
    if (receipt.senderAccount) {
      y = drawRow('No. Rekening Asal', receipt.senderAccount, y, { monoVal: true, size: 21 });
    }

    y += 4;
    drawDashedDivider(y);
    y += 30;
  }

  // --- DETAIL TUJUAN TRANSFER ---
  ctx.font = "700 14px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'left';
  ctx.fillText('DETAIL TUJUAN TRANSFER', padding, y);
  y += 28;

  y = drawRow('Bank / E-Wallet', receipt.bankName || 'BANK TUJUAN', y, { boldVal: true, colorVal: '#0369a1', size: 22 });
  y = drawRow('No. Rekening / ID', receipt.accountNumber || '-', y, { boldVal: true, monoVal: true, size: 22 });
  y = drawRow('Nama Penerima', receipt.recipientName || 'PENERIMA TRANSFER', y, { boldVal: true, size: 22 });

  y += 8;
  drawSolidDivider(y, 2, '#0f172a');
  y += 32;

  // --- RINCIAN BIAYA TRANSAKSI ---
  ctx.font = "700 14px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'left';
  ctx.fillText('RINCIAN PEMBAYARAN', padding, y);
  y += 28;

  y = drawRow('Jumlah Transfer', formatRupiah(receipt.amount), y, { boldVal: true, size: 22 });
  y = drawRow('Biaya Admin', formatRupiah(receipt.adminFee), y, { size: 21 });

  y += 4;
  drawDashedDivider(y);
  y += 36;

  // TOTAL PEMBAYARAN (Large and Bold)
  ctx.font = "800 24px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL BAYAR', padding, y);

  ctx.font = "800 32px 'JetBrains Mono', monospace";
  ctx.fillStyle = '#0284c7';
  ctx.textAlign = 'right';
  ctx.fillText(formatRupiah(receipt.totalAmount), width - padding, y);
  y += 40;

  drawSolidDivider(y, 2, '#0f172a');
  y += 30;

  // --- CATATAN (IF ANY) ---
  if (receipt.notes && receipt.notes !== 'Transfer Berhasil') {
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
  ctx.translate(width - 160, y + 40);
  ctx.rotate((-12 * Math.PI) / 180);
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
  ctx.lineWidth = 3;
  ctx.strokeRect(-80, -25, 160, 50);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
  ctx.font = "800 24px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText('LUNAS / SAH', 0, 8);
  ctx.restore();

  // --- FOOTER ---
  ctx.textAlign = 'center';
  ctx.font = "500 15px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = '#64748b';

  const footerText = settings.customFooterNote || 'Terima kasih telah bertransaksi di Agen kami.\nStruk ini adalah bukti pembayaran yang sah.';
  const footerLines = footerText.split('\n');
  for (const line of footerLines) {
    ctx.fillText(line, width / 2, y);
    y += 22;
  }

  y += 10;
  ctx.font = "600 13px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Cetak Digital via PWA kirim dana • ${receipt.date} ${receipt.time}`, width / 2, y);

  return canvas;
}
