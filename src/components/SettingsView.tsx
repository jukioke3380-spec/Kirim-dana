import React, { useState } from 'react';
import { AppSettings } from '../types/receipt';
import {
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  buildTestPrintEscPos,
  sendEscPosToPrinter,
  isWebBluetoothSupported,
} from '../utils/bluetoothPrinter';
import { formatRupiah, parseRupiahInput } from '../utils/numberFormat';
import {
  Printer,
  Bluetooth,
  BluetoothConnected,
  Building2,
  Phone,
  MapPin,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  isPrinterConnected: boolean;
  connectedPrinterName: string | null;
  onPrinterConnectedChange: (connected: boolean, name: string | null) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  isPrinterConnected,
  connectedPrinterName,
  onPrinterConnectedChange,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTestPrinting, setIsTestPrinting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isBluetoothSupported = isWebBluetoothSupported();

  const handleFieldChange = (key: keyof AppSettings, value: any) => {
    const updated = { ...formData, [key]: value };
    setFormData(updated);
    onUpdateSettings(updated);
  };

  const handleConnectPrinter = async () => {
    try {
      setIsConnecting(true);
      setToast(null);
      const res = await connectBluetoothPrinter();
      onPrinterConnectedChange(true, res.deviceName);
      handleFieldChange('pairedPrinterName', res.deviceName);
      handleFieldChange('pairedPrinterDeviceId', res.deviceId);
      setToast({
        type: 'success',
        message: `Berhasil terhubung ke printer ${res.deviceName}! Pengaturan tersimpan otomatis.`,
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.message || 'Gagal menyambungkan ke printer Bluetooth.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectPrinter = () => {
    disconnectBluetoothPrinter();
    onPrinterConnectedChange(false, null);
    handleFieldChange('pairedPrinterName', null);
    handleFieldChange('pairedPrinterDeviceId', null);
    setToast({
      type: 'success',
      message: 'Koneksi printer Bluetooth berhasil diputuskan.',
    });
  };

  const handleTestPrint = async () => {
    try {
      setIsTestPrinting(true);
      setToast(null);

      if (!isPrinterConnected) {
        // connect first
        const res = await connectBluetoothPrinter();
        onPrinterConnectedChange(true, res.deviceName);
        handleFieldChange('pairedPrinterName', res.deviceName);
      }

      const testBytes = buildTestPrintEscPos(formData);
      await sendEscPosToPrinter(testBytes);

      setToast({
        type: 'success',
        message: 'Perintah Test Print berhasil dikirim ke printer!',
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.message || 'Gagal melakukan test print.',
      });
    } finally {
      setIsTestPrinting(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Kembalikan semua pengaturan ke nilai bawaan pabrik?')) {
      const defaults: AppSettings = {
        defaultAgentName: 'Agen Batara Bekasi',
        defaultAgentLocation: 'Bekasi, Jawa Barat',
        defaultAgentContact: '0812-3456-7890',
        defaultAdminFee: 5000,
        paperSize: '58mm',
        customFooterNote: 'Terima kasih telah bertransaksi di Agen kami.\nStruk ini adalah bukti pembayaran yang sah.',
        pairedPrinterName: null,
        pairedPrinterDeviceId: null,
        autoSaveHistory: true,
      };
      setFormData(defaults);
      onUpdateSettings(defaults);
      setToast({ type: 'success', message: 'Pengaturan berhasil direset ke default.' });
    }
  };

  return (
    <div className="space-y-5 pb-28 text-slate-800">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between border ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="font-bold opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Section 1: Bluetooth Printer Connection */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Printer Thermal Bluetooth
              </h3>
              <p className="text-[11px] text-slate-500">
                Mendukung printer thermal 58mm & 80mm
              </p>
            </div>
          </div>

          <div
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
              isPrinterConnected
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isPrinterConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Terhubung
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Terputus
              </>
            )}
          </div>
        </div>

        {/* Printer Name & Status */}
        {isPrinterConnected ? (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BluetoothConnected className="w-4 h-4 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-emerald-950">
                  {connectedPrinterName || formData.pairedPrinterName || 'Printer Bluetooth'}
                </p>
                <p className="text-[10px] text-emerald-700">Tersimpan di memori perangkat</p>
              </div>
            </div>
            <button
              onClick={handleDisconnectPrinter}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1 bg-white rounded-lg border border-rose-200"
            >
              Putus
            </button>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bluetooth className="w-4 h-4 text-slate-400" />
              <span>Belum ada printer Bluetooth terhubung</span>
            </div>
          </div>
        )}

        {/* Bluetooth compatibility warning if on unsupported platform */}
        {!isBluetoothSupported && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              Web Bluetooth membutuhkan Google Chrome di Android atau Chrome Desktop melalui koneksi HTTPS.
            </div>
          </div>
        )}

        {/* Action Buttons: Connect & Test Print */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={handleConnectPrinter}
            disabled={isConnecting}
            className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Bluetooth className="w-4 h-4" />
            <span>{isConnecting ? 'Mencari...' : isPrinterConnected ? 'Ganti Printer' : 'Hubungkan'}</span>
          </button>

          <button
            onClick={handleTestPrint}
            disabled={isTestPrinting}
            className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 active:scale-95 text-slate-800 font-bold text-xs border border-slate-300 shadow-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-sky-600" />
            <span>{isTestPrinting ? 'Mencetak...' : 'Test Cetak Struk'}</span>
          </button>
        </div>

        {/* Paper size setting */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Ukuran Kertas Thermal Struk
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleFieldChange('paperSize', '58mm')}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                formData.paperSize === '58mm'
                  ? 'bg-sky-50 text-sky-700 border-sky-400 ring-2 ring-sky-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              58mm (Standar POS Mobile)
            </button>
            <button
              type="button"
              onClick={() => handleFieldChange('paperSize', '80mm')}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                formData.paperSize === '80mm'
                  ? 'bg-sky-50 text-sky-700 border-sky-400 ring-2 ring-sky-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              80mm (Lebar / Kasir)
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: Default Agen Information */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Identitas Agen Pengirim
            </h3>
            <p className="text-[11px] text-slate-500">
              Dicantumkan pada kepala struk resi transfer
            </p>
          </div>
        </div>

        {/* Nama Agen (Default: Agen Batara Bekasi) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nama Agen (Default)
          </label>
          <input
            type="text"
            value={formData.defaultAgentName}
            onChange={(e) => handleFieldChange('defaultAgentName', e.target.value)}
            placeholder="Agen Batara Bekasi"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-sm font-bold text-slate-900 outline-hidden"
          />
        </div>

        {/* Alamat Agen */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Lokasi / Alamat Agen
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.defaultAgentLocation}
              onChange={(e) => handleFieldChange('defaultAgentLocation', e.target.value)}
              placeholder="Bekasi, Jawa Barat"
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-xs font-medium text-slate-800 outline-hidden"
            />
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* No. Kontak Agen */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            No. WhatsApp / CS Agen
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.defaultAgentContact}
              onChange={(e) => handleFieldChange('defaultAgentContact', e.target.value)}
              placeholder="0812-3456-7890"
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-xs font-medium text-slate-800 outline-hidden"
            />
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* Section 3: Default Biaya Admin */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-sm">
            Rp
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Biaya Admin Transaksi
            </h3>
            <p className="text-[11px] text-slate-500">
              Nilai default biaya admin otomatis untuk setiap transaksi
            </p>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-slate-700">
              Nominal Biaya Admin Default
            </label>
            <span className="text-xs font-bold text-sky-700 font-receipt">
              {formatRupiah(formData.defaultAdminFee)}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={formData.defaultAdminFee || ''}
              onChange={(e) => handleFieldChange('defaultAdminFee', parseRupiahInput(e.target.value))}
              placeholder="5000"
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-sm font-bold text-slate-900 outline-hidden"
            />
            <button
              type="button"
              onClick={() => handleFieldChange('defaultAdminFee', 5000)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
            >
              5.000
            </button>
            <button
              type="button"
              onClick={() => handleFieldChange('defaultAdminFee', 3000)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
            >
              3.000
            </button>
            <button
              type="button"
              onClick={() => handleFieldChange('defaultAdminFee', 2500)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
            >
              2.500
            </button>
          </div>
        </div>

        {/* Footer Note Customization */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Catatan Kaki Struk (Footer)
          </label>
          <textarea
            rows={2}
            value={formData.customFooterNote}
            onChange={(e) => handleFieldChange('customFooterNote', e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-xs font-medium text-slate-700 outline-hidden"
          />
        </div>
      </div>

      {/* Reset Defaults Button */}
      <div className="text-center pt-2">
        <button
          onClick={handleResetDefaults}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Kembalikan ke Pengaturan Default</span>
        </button>
      </div>
    </div>
  );
};
