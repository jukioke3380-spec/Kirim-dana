import React, { useState } from 'react';
import { ReceiptData } from '../types/receipt';
import { formatRupiah } from '../utils/numberFormat';
import { Search, History, Trash2, ArrowRight, Calendar, Building2, User } from 'lucide-react';

interface HistoryViewProps {
  history: ReceiptData[];
  onSelectReceipt: (receipt: ReceiptData) => void;
  onClearHistory: () => void;
  onDeleteReceipt: (id: string) => void;
  onOpenScanner: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onSelectReceipt,
  onClearHistory,
  onDeleteReceipt,
  onOpenScanner,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = history.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.recipientName.toLowerCase().includes(q) ||
      item.bankName.toLowerCase().includes(q) ||
      item.refNumber.toLowerCase().includes(q) ||
      (item.accountNumber && item.accountNumber.includes(q))
    );
  });

  return (
    <div className="space-y-4 pb-28 text-slate-800">
      {/* Search Header */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-xs flex items-center gap-2.5">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama penerima, bank, no ref..."
          className="w-full text-xs font-semibold outline-hidden placeholder:text-slate-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 px-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* History Stats & Clear Button */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="font-bold text-slate-500">
          Total {filtered.length} Transaksi Tercatat
        </span>
        {history.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Hapus seluruh riwayat transaksi tersimpan?')) {
                onClearHistory();
              }
            }}
            className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-12 px-4 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
            <History className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">
            {searchQuery ? 'Tidak Ada Hasil Pencarian' : 'Belum Ada Riwayat Transaksi'}
          </h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {searchQuery
              ? 'Coba gunakan kata kunci pencarian yang berbeda.'
              : 'Struk bukti transfer yang dipindai akan tersimpan otomatis di sini.'}
          </p>
          {!searchQuery && (
            <button
              onClick={onOpenScanner}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Mulai Pindai Sekarang
            </button>
          )}
        </div>
      )}

      {/* List of Receipt Records */}
      <div className="space-y-2.5">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-sky-300 transition-all flex items-center justify-between gap-3 group"
          >
            <div
              onClick={() => onSelectReceipt(item)}
              className="flex-1 cursor-pointer space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-sky-50 text-sky-700 border border-sky-100">
                  {item.bankName}
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-receipt">
                  {item.refNumber}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors uppercase">
                {item.recipientName}
              </h4>

              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {item.date} {item.time}
                </span>
              </div>

              <div className="pt-1 flex items-baseline gap-2">
                <span className="text-xs font-extrabold text-slate-900 font-receipt">
                  {formatRupiah(item.totalAmount)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  (Nominal: {formatRupiah(item.amount)} + Admin {formatRupiah(item.adminFee)})
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <button
                onClick={() => onSelectReceipt(item)}
                className="p-2 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 font-bold text-xs flex items-center gap-1 transition-colors"
                title="Buka Struk"
              >
                <span>Buka</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteReceipt(item.id);
                }}
                className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Hapus dari riwayat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
