import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X, Smartphone, Share } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled || isDismissed) {
    return null;
  }

  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <div className="bg-gradient-to-r from-sky-600 to-cyan-600 text-white px-4 py-2.5 rounded-2xl shadow-md mb-4 flex items-center justify-between gap-3 animate-in fade-in">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">
              Instal Aplikasi "kirim dana"
            </p>
            <p className="text-[11px] text-sky-100">
              Akses cepat di layar HP & aktifkan menu Share Android
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isInstallable && (
            <button
              onClick={install}
              className="px-3 py-1.5 rounded-xl bg-white text-sky-700 hover:bg-sky-50 text-xs font-black shadow-xs transition-colors flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pasang</span>
            </button>
          )}

          {isIOS && (
            <button
              onClick={() => setShowIOSModal(true)}
              className="px-3 py-1.5 rounded-xl bg-white text-sky-700 hover:bg-sky-50 text-xs font-black shadow-xs transition-colors flex items-center gap-1"
            >
              <Share className="w-3.5 h-3.5" />
              <span>Panduan</span>
            </button>
          )}

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
            title="Tutup banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Modal instructions */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start">
              <h3 className="text-base font-bold text-slate-900">
                Cara Pasang di iPhone / iPad
              </h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="text-xs space-y-3 text-slate-600 list-decimal list-inside font-medium leading-relaxed">
              <li>
                Buka website ini menggunakan browser <strong>Safari</strong>.
              </li>
              <li>
                Tekan tombol <strong>Bagikan (Share)</strong> berbentuk kotak dengan panah ke atas di bagian bawah layar.
              </li>
              <li>
                Gulir ke bawah lalu pilih opsi <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.
              </li>
              <li>
                Tekan <strong>Tambah (Add)</strong> di pojok kanan atas.
              </li>
            </ol>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
