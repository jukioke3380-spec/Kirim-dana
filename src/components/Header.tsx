import React from 'react';
import { Bluetooth, BluetoothConnected, Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  isPrinterConnected: boolean;
  printerName: string | null;
  onOpenPrinterSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isPrinterConnected,
  printerName,
  onOpenPrinterSettings,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-sky-100 shadow-xs px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 via-sky-500 to-cyan-400 flex items-center justify-center shadow-md shadow-sky-500/20 text-white font-black text-sm tracking-tighter">
            KD
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold tracking-tight text-slate-900">
                kirim dana
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-sky-100 text-sky-700 uppercase tracking-wider">
                PWA
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 leading-none">
              Cetak Struk & OCR Transaksi
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          {/* Bluetooth Status Indicator Button */}
          <button
            onClick={onOpenPrinterSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              isPrinterConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title={isPrinterConnected ? `Terhubung ke ${printerName}` : 'Printer Bluetooth Belum Terhubung'}
          >
            {isPrinterConnected ? (
              <>
                <BluetoothConnected className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span className="hidden sm:inline max-w-[80px] truncate">{printerName || 'Printer'}</span>
              </>
            ) : (
              <>
                <Bluetooth className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px]">Printer</span>
              </>
            )}
          </button>

          {/* In-App PWA Install Button */}
          {!isInstalled && isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instal</span>
            </button>
          )}

          {!isInstalled && isIOS && (
            <button
              onClick={() => alert('Untuk menginstal di iOS:\n1. Tekan tombol Bagikan (Share) di Safari\n2. Pilih "Add to Home Screen"')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Instal</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
