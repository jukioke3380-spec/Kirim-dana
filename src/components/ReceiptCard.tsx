import React from 'react';
import { ReceiptData, AppSettings } from '../types/receipt';
import { formatRupiah } from '../utils/numberFormat';
import { CheckCircle2, Edit3, ShieldCheck } from 'lucide-react';

interface ReceiptCardProps {
  receipt: ReceiptData;
  settings: AppSettings;
  onTapField?: (fieldKey: keyof ReceiptData) => void;
  isPrintMode?: boolean;
}

export const ReceiptCard = React.forwardRef<HTMLDivElement, ReceiptCardProps>(
  ({ receipt, settings, onTapField, isPrintMode = false }, ref) => {
    const is80mm = settings.paperSize === '80mm';

    const handleTap = (fieldKey: keyof ReceiptData) => {
      if (!isPrintMode && onTapField) {
        onTapField(fieldKey);
      }
    };

    const tapClass = !isPrintMode
      ? 'cursor-pointer hover:bg-sky-50/70 p-1 -m-1 rounded transition-colors group relative'
      : '';

    return (
      <div
        ref={ref}
        className={`bg-white text-slate-800 font-receipt select-text mx-auto border border-slate-200/90 shadow-md ${
          is80mm ? 'w-full max-w-[380px] p-6' : 'w-full max-w-[320px] p-4 sm:p-5'
        } rounded-2xl relative overflow-hidden`}
        style={{ letterSpacing: '-0.02em' }}
      >
        {/* Top Paper Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-500" />

        {/* 1. Header Agen Info */}
        <div
          onClick={() => handleTap('agentName')}
          className={`text-center pt-2 pb-3 border-b-2 border-dashed border-slate-200 ${tapClass}`}
        >
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
              {receipt.agentName || 'loket ppob Athar digital payment'}
            </h2>
            {!isPrintMode && <Edit3 className="w-3.5 h-3.5 text-sky-400 opacity-60 group-hover:opacity-100" />}
          </div>

          {/* Subheading / Tagline & Services requested by user */}
          <div className="space-y-0.5 mb-1.5">
            <p className="text-[11px] sm:text-xs font-extrabold text-sky-800 uppercase tracking-wide">
              {receipt.agentTagline || settings.defaultAgentTagline || 'gerai transaksi online & multi pembayaran'}
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-600 font-sans font-medium capitalize">
              {receipt.agentServices || settings.defaultAgentServices || 'layanan transfer uang tarik tunai & pembayaran tagihan'}
            </p>
          </div>

          {receipt.agentLocation ? (
            <p className="text-[11px] text-slate-500 font-sans font-medium">
              {receipt.agentLocation}
            </p>
          ) : null}
          {receipt.agentContact ? (
            <p className="text-[10px] text-slate-400 font-sans">
              WA / CS: {receipt.agentContact}
            </p>
          ) : null}
        </div>

        {/* 2. Status Badge */}
        <div className="my-3 py-2 px-3 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center justify-center gap-2 text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold tracking-wide uppercase font-sans">
            TRANSAKSI BERHASIL
          </span>
        </div>

        {/* 3. Transaction Meta (Tanggal, Waktu, No Ref) */}
        <div className="space-y-1.5 text-xs pb-3 border-b border-dashed border-slate-200">
          {/* Tanggal & Jam */}
          <div
            onClick={() => handleTap('date')}
            className={`flex justify-between items-center text-slate-600 ${tapClass}`}
          >
            <span>Waktu Transaksi</span>
            <span className="font-semibold text-slate-800">
              {receipt.date} {receipt.time} WIB
            </span>
          </div>

          {/* Nomor Referensi */}
          <div
            onClick={() => handleTap('refNumber')}
            className={`flex justify-between items-center text-slate-600 ${tapClass}`}
          >
            <span>No. Referensi</span>
            <span className="font-bold text-slate-900 font-receipt tracking-wider">
              {receipt.refNumber}
            </span>
          </div>

          {/* Sumber Aplikasi (BCA / Mandiri / dll) */}
          <div className="flex justify-between items-center text-slate-500 text-[11px]">
            <span>Metode / Saluran</span>
            <span className="font-medium text-slate-700 font-sans bg-slate-100 px-1.5 py-0.5 rounded">
              {receipt.sourceApp || 'Transfer Bank'}
            </span>
          </div>
        </div>

        {/* 3b. Sumber Dana (Pengirim) */}
        {(receipt.senderName || receipt.senderAccount || receipt.senderBank) ? (
          <div className="py-3 border-b border-dashed border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                Sumber Dana (Pengirim)
              </span>
              {receipt.senderBank && (
                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-sans">
                  {receipt.senderBank}
                </span>
              )}
            </div>

            {/* Nama Rekening Pengirim */}
            {receipt.senderName && (
              <div
                onClick={() => handleTap('senderName')}
                className={`flex justify-between items-start text-xs ${tapClass}`}
              >
                <span className="text-slate-600 shrink-0">Nama Pengirim</span>
                <span className="font-bold text-slate-900 text-right uppercase max-w-[170px] break-words">
                  {receipt.senderName}
                </span>
              </div>
            )}

            {/* Rekening Pengirim */}
            {receipt.senderAccount && (
              <div
                onClick={() => handleTap('senderAccount')}
                className={`flex justify-between items-center text-xs ${tapClass}`}
              >
                <span className="text-slate-600">No. Rekening Asal</span>
                <span className="font-semibold text-slate-800 tracking-wider">
                  {receipt.senderAccount}
                </span>
              </div>
            )}
          </div>
        ) : !isPrintMode ? (
          <div
            onClick={() => handleTap('senderName')}
            className="py-2 border-b border-dashed border-slate-200 flex justify-between items-center text-xs text-sky-600 hover:text-sky-700 cursor-pointer"
          >
            <span className="text-[11px] font-semibold">+ Tambah Sumber Dana (Pengirim)</span>
            <Edit3 className="w-3 h-3" />
          </div>
        ) : null}

        {/* 4. Detail Tujuan Transfer (Wajib ada) */}
        <div className="py-3 border-b border-dashed border-slate-200 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
            Detail Tujuan Transfer
          </div>

          {/* Bank / E-Wallet */}
          <div
            onClick={() => handleTap('bankName')}
            className={`flex justify-between items-center text-xs ${tapClass}`}
          >
            <span className="text-slate-600">Bank / E-Wallet</span>
            <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded font-sans text-xs">
              {receipt.bankName || 'BANK TUJUAN'}
            </span>
          </div>

          {/* Nomor Rekening */}
          <div
            onClick={() => handleTap('accountNumber')}
            className={`flex justify-between items-center text-xs ${tapClass}`}
          >
            <span className="text-slate-600">No. Rekening / ID</span>
            <span className="font-semibold text-slate-800 tracking-wider">
              {receipt.accountNumber || '-'}
            </span>
          </div>

          {/* Nama Penerima */}
          <div
            onClick={() => handleTap('recipientName')}
            className={`flex justify-between items-start text-xs ${tapClass}`}
          >
            <span className="text-slate-600 shrink-0">Nama Penerima</span>
            <span className="font-bold text-slate-900 text-right uppercase max-w-[170px] break-words">
              {receipt.recipientName || 'PENERIMA TRANSFER'}
            </span>
          </div>
        </div>

        {/* 5. Rincian Biaya (Wajib ada) */}
        <div className="py-3 border-b-2 border-slate-900 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
            Rincian Pembayaran
          </div>

          {/* Jumlah Transfer (Nominal) */}
          <div
            onClick={() => handleTap('amount')}
            className={`flex justify-between items-center text-xs ${tapClass}`}
          >
            <span className="text-slate-600">Jumlah Transfer</span>
            <span className="font-semibold text-slate-900">
              {formatRupiah(receipt.amount)}
            </span>
          </div>

          {/* Admin Bank */}
          <div
            onClick={() => handleTap('adminFee')}
            className={`flex justify-between items-center text-xs ${tapClass}`}
          >
            <span className="text-slate-600">Admin Bank</span>
            <span className="font-medium text-slate-800">
              {formatRupiah(receipt.adminFee)}
            </span>
          </div>

          {/* Total Pembayaran */}
          <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
            <span className="text-xs font-bold text-slate-900 uppercase">
              Total Pembayaran
            </span>
            <span className="text-base font-extrabold text-sky-700">
              {formatRupiah(receipt.totalAmount)}
            </span>
          </div>
        </div>

        {/* 6. Catatan / Keterangan */}
        {receipt.notes && (
          <div
            onClick={() => handleTap('notes')}
            className={`py-2 text-[11px] text-slate-600 border-b border-dashed border-slate-200 ${tapClass}`}
          >
            <span className="font-medium text-slate-500">Catatan: </span>
            <span className="italic">{receipt.notes}</span>
          </div>
        )}

        {/* 7. Footer Struk */}
        <div className="pt-3 pb-1 text-center space-y-1">
          <div className="text-[10px] font-medium text-slate-500 whitespace-pre-line leading-relaxed font-sans">
            {settings.customFooterNote ||
              'Terima kasih telah bertransaksi di Agen kami.\nSimpan struk ini sebagai bukti pembayaran yang sah.'}
          </div>
          <div className="pt-1 flex items-center justify-center gap-1 text-[9px] text-slate-400 font-sans">
            <ShieldCheck className="w-3 h-3 text-sky-500" />
            <span>Resi Sah & Terverifikasi Sistem</span>
          </div>
        </div>

        {/* Serrated Thermal Paper Cut Effect at bottom */}
        <div className="mt-4 pt-2 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 bg-slate-100 h-3 border-t border-dashed border-slate-300 receipt-jagged-edge" />
      </div>
    );
  }
);

ReceiptCard.displayName = 'ReceiptCard';
