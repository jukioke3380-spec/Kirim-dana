import React, { useState, useEffect } from 'react';
import { ReceiptData } from '../types/receipt';
import { KNOWN_BANKS } from '../utils/ocrParser';
import { formatRupiah, generateRefNumber, getCurrentDateStr, getCurrentTimeStr, parseRupiahInput } from '../utils/numberFormat';
import { X, RefreshCw, Clock, Check, Sparkles, Building2, User, Hash, Wallet } from 'lucide-react';

interface ReceiptEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData;
  onSave: (updated: ReceiptData) => void;
  initialFocusField?: keyof ReceiptData | null;
}

export const ReceiptEditModal: React.FC<ReceiptEditModalProps> = ({
  isOpen,
  onClose,
  receipt,
  onSave,
  initialFocusField,
}) => {
  const [formData, setFormData] = useState<ReceiptData>(receipt);

  useEffect(() => {
    setFormData(receipt);
  }, [receipt, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof ReceiptData, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'amount' || field === 'adminFee') {
        const amt = field === 'amount' ? Number(value) || 0 : prev.amount;
        const fee = field === 'adminFee' ? Number(value) || 0 : prev.adminFee;
        updated.totalAmount = amt + fee;
      }
      return updated;
    });
  };

  const addAmount = (delta: number) => {
    const current = formData.amount || 0;
    handleChange('amount', current + delta);
  };

  const handleRandomizeRef = () => {
    const prefix = formData.bankName ? formData.bankName.substring(0, 3).toUpperCase() : 'KD';
    handleChange('refNumber', generateRefNumber(prefix));
  };

  const handleUseCurrentTime = () => {
    handleChange('date', getCurrentDateStr());
    handleChange('time', getCurrentTimeStr());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-sky-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-sky-600" />
              Edit Data Struk Transfer
            </h3>
            <p className="text-xs text-slate-500">
              Ubah data hasil OCR bukti transfer secara manual
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200/80 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4 space-y-4 text-sm">
          {/* Section 0: Sumber Dana (Pengirim) */}
          <div className="space-y-3 bg-sky-50/50 p-3.5 rounded-xl border border-sky-100">
            <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-sky-600" />
              Sumber Dana (Pengirim)
            </h4>

            {/* Nama Rekening Pengirim */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Rekening Pengirim
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.senderName || ''}
                  onChange={(e) => handleChange('senderName', e.target.value)}
                  placeholder="Contoh: M. CHASIN ZAUHARI"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-sm font-semibold uppercase outline-hidden"
                  autoFocus={initialFocusField === 'senderName'}
                />
                <button
                  type="button"
                  onClick={() => handleChange('senderName', (formData.senderName || '').toUpperCase())}
                  className="px-2.5 py-1 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                  title="Ubah jadi huruf besar"
                >
                  CAPS
                </button>
              </div>
            </div>

            {/* Bank Pengirim & Rekening Pengirim */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Asal Pengirim
                </label>
                <input
                  type="text"
                  value={formData.senderBank || ''}
                  onChange={(e) => handleChange('senderBank', e.target.value.toUpperCase())}
                  placeholder="Contoh: BANK BRI"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-sm font-bold uppercase outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  No. Rekening Pengirim
                </label>
                <input
                  type="text"
                  value={formData.senderAccount || ''}
                  onChange={(e) => handleChange('senderAccount', e.target.value)}
                  placeholder="Contoh: 6305 **** **** 530"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-sm font-receipt font-semibold outline-hidden"
                  autoFocus={initialFocusField === 'senderAccount'}
                />
              </div>
            </div>
          </div>

          {/* Section 1: Detail Tujuan Transfer */}
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <h4 className="text-xs font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-600" />
              Detail Tujuan Transfer
            </h4>

            {/* Nama Penerima */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Penerima
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.recipientName}
                  onChange={(e) => handleChange('recipientName', e.target.value)}
                  placeholder="Contoh: AHMAD FAUZI"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-sm font-semibold uppercase outline-hidden"
                  autoFocus={initialFocusField === 'recipientName'}
                />
                <button
                  type="button"
                  onClick={() => handleChange('recipientName', formData.recipientName.toUpperCase())}
                  className="px-2.5 py-1 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                  title="Ubah jadi huruf besar"
                >
                  CAPS
                </button>
              </div>
            </div>

            {/* Nama Bank */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Bank / E-Wallet
              </label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value.toUpperCase())}
                placeholder="Contoh: BCA / BRI / MANDIRI / DANA"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-sm font-bold uppercase outline-hidden"
              />

              {/* Quick Bank Chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {KNOWN_BANKS.slice(0, 9).map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => handleChange('bankName', bank)}
                    className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-all ${
                      formData.bankName === bank
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {bank}
                  </button>
                ))}
              </div>
            </div>

            {/* Nomor Rekening */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Nomor Rekening / No. HP E-Wallet
                </label>
                {formData.accountNumber && (
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded font-sans">
                    {formData.accountNumber.replace(/[^0-9]/g, '').length} Digit {formData.accountNumber.replace(/[^0-9]/g, '').length === 15 ? '(BRI Lengkap)' : ''}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => handleChange('accountNumber', e.target.value)}
                  placeholder="Contoh: 1160 0101 6845 502 (15 digit BRI)"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-sm font-receipt font-semibold outline-hidden"
                  autoFocus={initialFocusField === 'accountNumber'}
                />
                <Hash className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Section 2: Rincian Biaya */}
          <div className="space-y-3 bg-sky-50/60 p-3.5 rounded-xl border border-sky-100">
            <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>Rp</span>
              Rincian Biaya Transaksi
            </h4>

            {/* Nominal Transfer */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Jumlah Transfer (Nominal)
                </label>
                <span className="text-xs font-bold text-sky-700 font-receipt">
                  {formatRupiah(formData.amount)}
                </span>
              </div>
              <input
                type="text"
                value={formData.amount || ''}
                onChange={(e) => handleChange('amount', parseRupiahInput(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-base font-bold text-slate-900 outline-hidden"
              />

              {/* Quick Nominal Increment Buttons */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[10000, 50000, 100000, 250000, 500000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => addAmount(val)}
                    className="text-[11px] px-2 py-0.5 bg-white border border-sky-200 text-sky-800 rounded font-medium hover:bg-sky-100 transition-colors"
                  >
                    +{val >= 1000 ? `${val / 1000}rb` : val}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleChange('amount', 0)}
                  className="text-[11px] px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-medium hover:bg-slate-300"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Admin Bank */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Biaya Admin Bank
                </label>
                <span className="text-xs font-bold text-slate-700 font-receipt">
                  {formatRupiah(formData.adminFee)}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.adminFee || ''}
                  onChange={(e) => handleChange('adminFee', parseRupiahInput(e.target.value))}
                  placeholder="5000"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-sm font-semibold outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => handleChange('adminFee', 5000)}
                  className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100"
                >
                  5.000
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('adminFee', 2500)}
                  className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100"
                >
                  2.500
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('adminFee', 0)}
                  className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100"
                >
                  Gratis
                </button>
              </div>
            </div>

            {/* Total Pembayaran Otomatis */}
            <div className="pt-2 border-t border-sky-200 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase">
                  Total Pembayaran (Otomatis)
                </span>
                <p className="text-[10px] text-slate-500">Jumlah Transfer + Biaya Admin</p>
              </div>
              <span className="text-lg font-black text-sky-700 font-receipt">
                {formatRupiah(formData.totalAmount)}
              </span>
            </div>
          </div>

          {/* Section 3: Waktu & Nomor Referensi */}
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              Waktu & Nomor Referensi
            </h4>

            {/* Tanggal & Jam */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal
                </label>
                <input
                  type="text"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jam Transaksi
                </label>
                <input
                  type="text"
                  value={formData.time}
                  onChange={(e) => handleChange('time', e.target.value)}
                  placeholder="HH:MM:SS"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold outline-hidden"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentTime}
              className="text-xs flex items-center gap-1 text-sky-600 hover:text-sky-700 font-bold"
            >
              <Clock className="w-3.5 h-3.5" />
              Gunakan Tanggal & Jam Saat Ini
            </button>

            {/* Nomor Referensi */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Referensi (No. Ref)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.refNumber}
                  onChange={(e) => handleChange('refNumber', e.target.value)}
                  placeholder="Nomor Referensi Transaksi"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 font-receipt text-xs font-bold outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleRandomizeRef}
                  className="px-2.5 py-1 text-xs font-bold bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg flex items-center gap-1 transition-colors"
                  title="Buat No Ref Acak Otomatis"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Acak
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Info Agen & Catatan */}
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-600" />
              Nama Agen & Catatan Tambahan
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Agen Pengirim
              </label>
              <input
                type="text"
                value={formData.agentName}
                onChange={(e) => handleChange('agentName', e.target.value)}
                placeholder="Contoh: loket ppob Athar digital payment"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Keterangan Gerai / Tagline (Di bawah nama agen)
              </label>
              <input
                type="text"
                value={formData.agentTagline || ''}
                onChange={(e) => handleChange('agentTagline', e.target.value)}
                placeholder="gerai transaksi online & multi pembayaran"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Layanan Gerai (Di bawah tagline)
              </label>
              <input
                type="text"
                value={formData.agentServices || ''}
                onChange={(e) => handleChange('agentServices', e.target.value)}
                placeholder="layanan transfer uang tarik tunai & pembayaran tagihan"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Keterangan / Catatan Tambahan
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Contoh: Transfer Berhasil / Bayar tagihan"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs outline-hidden"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold shadow-md shadow-sky-600/30 flex items-center justify-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
