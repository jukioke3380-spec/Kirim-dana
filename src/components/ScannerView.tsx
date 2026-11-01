import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Clipboard, Sparkles, AlertCircle, ArrowRight, UploadCloud } from 'lucide-react';
import { SAMPLE_RECEIPTS, SampleReceipt } from '../utils/sampleReceipts';
import { OcrProgress, runLocalOcr, parseReceiptText } from '../utils/ocrParser';
import { ReceiptData, AppSettings } from '../types/receipt';

interface ScannerViewProps {
  settings: AppSettings;
  onReceiptExtracted: (receipt: ReceiptData) => void;
  onManualCreate: () => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  settings,
  onReceiptExtracted,
  onManualCreate,
}) => {
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = async (file: File | Blob) => {
    try {
      setErrorMessage(null);
      setOcrProgress({ status: 'Memulai pemindaian OCR lokal...', progress: 5 });

      // Run local client-side Tesseract OCR
      const rawText = await runLocalOcr(file, (progress) => {
        setOcrProgress(progress);
      });

      // Parse Indonesian financial details
      const parsed = parseReceiptText(rawText, settings);

      // Create preview object URL
      let imageUrl = '';
      if (file instanceof Blob) {
        imageUrl = URL.createObjectURL(file);
      }

      const completeReceipt: ReceiptData = {
        ...(parsed as ReceiptData),
        imageUrl,
      };

      setOcrProgress(null);
      onReceiptExtracted(completeReceipt);
    } catch (err: any) {
      console.error('OCR Processing error:', err);
      setOcrProgress(null);
      setErrorMessage(
        err.message || 'Gagal memproses OCR pada gambar. Coba gunakan foto yang lebih jelas atau isi manual.'
      );
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      setErrorMessage(null);
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          await processImageFile(blob);
          return;
        }
      }
      setErrorMessage('Tidak ada gambar di clipboard. Silakan salin gambar bukti transfer terlebih dahulu.');
    } catch (e: any) {
      setErrorMessage('Gagal membaca clipboard. Pastikan izin akses clipboard telah diberikan pada browser.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    }
  };

  const handleSelectSample = (sample: SampleReceipt) => {
    setErrorMessage(null);
    setOcrProgress({ status: `Memuat sampel ${sample.title}...`, progress: 30 });

    setTimeout(() => {
      setOcrProgress({ status: 'Mengekstrak data transfer...', progress: 80 });
      setTimeout(() => {
        const parsed = parseReceiptText(sample.mockOcrText, settings);
        const completeReceipt: ReceiptData = {
          ...parsed,
          ...sample.defaultData,
          id: 'sample_' + Date.now(),
          agentName: settings.defaultAgentName,
          agentLocation: settings.defaultAgentLocation,
          agentContact: settings.defaultAgentContact,
          adminFee: settings.defaultAdminFee,
          totalAmount: (sample.defaultData.amount || 100000) + settings.defaultAdminFee,
          createdAt: Date.now(),
        } as ReceiptData;

        setOcrProgress(null);
        onReceiptExtracted(completeReceipt);
      }, 400);
    }, 400);
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Banner Intro */}
      <div className="bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-500 text-white rounded-3xl p-5 shadow-lg shadow-sky-500/20 relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            OCR Lokal 100% Offline di HP
          </div>
          <h2 className="text-xl font-black tracking-tight leading-snug">
            Pindai Bukti Transfer
          </h2>
          <p className="text-xs text-sky-100 leading-relaxed max-w-sm">
            Bagikan bukti transfer dari BCA, Mandiri, BRI, atau DANA ke aplikasi ini, atau unggah foto untuk mengekstrak data otomatis.
          </p>
        </div>
        {/* Abstract light decorative circles */}
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute right-6 top-4 w-16 h-16 bg-cyan-300/20 rounded-full blur-md pointer-events-none" />
      </div>

      {/* Error notification */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Terjadi Kendala</p>
            <p className="text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-rose-600 hover:text-rose-800"
          >
            Tutup
          </button>
        </div>
      )}

      {/* OCR Progress Overlay / Box */}
      {ocrProgress && (
        <div className="bg-white border-2 border-sky-400 p-5 rounded-2xl shadow-xl shadow-sky-500/10 space-y-3 animate-in fade-in">
          <div className="flex justify-between items-center text-xs">
            <span className="font-extrabold text-sky-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
              {ocrProgress.status}
            </span>
            <span className="font-bold text-sky-700 font-receipt">
              {ocrProgress.progress}%
            </span>
          </div>

          <div className="w-full bg-sky-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-500 to-cyan-500 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${ocrProgress.progress}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-500 text-center">
            Pemindaian berjalan secara lokal di perangkat Anda tanpa mengirim data ke internet.
          </p>
        </div>
      )}

      {/* Main Upload Dropzone & Action Buttons */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-3xl p-6 transition-all text-center ${
          isDragging
            ? 'border-sky-500 bg-sky-50/70 scale-[0.99]'
            : 'border-slate-300 bg-white hover:border-sky-400'
        }`}
      >
        <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3 shadow-inner">
          <UploadCloud className="w-7 h-7" />
        </div>

        <h3 className="text-sm font-bold text-slate-800 mb-1">
          Pilih Foto Bukti Transfer
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          Tarik file foto ke sini atau pilih metode di bawah
        </p>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {/* Kamera HP */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={!!ocrProgress}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            <span>Kamera Foto</span>
          </button>

          {/* Galeri File */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!!ocrProgress}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-bold text-xs border border-slate-300 shadow-xs transition-all disabled:opacity-50"
          >
            <ImageIcon className="w-4 h-4 text-sky-600" />
            <span>Galeri Foto</span>
          </button>
        </div>

        {/* Secondary helpers: Clipboard & Manual */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={handlePasteClipboard}
            disabled={!!ocrProgress}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Clipboard className="w-3.5 h-3.5 text-slate-500" />
            <span>Tempel Clipboard</span>
          </button>

          <button
            type="button"
            onClick={onManualCreate}
            disabled={!!ocrProgress}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sky-700 hover:bg-sky-50 text-xs font-bold transition-colors"
          >
            <span>Input Manual</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Section: Preset Sample Receipts for Instant Testing */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            Coba Contoh Bukti Transfer
          </h3>
          <span className="text-[11px] text-slate-400">1-Klik Test</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {SAMPLE_RECEIPTS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              disabled={!!ocrProgress}
              className="p-3 bg-white hover:bg-sky-50/60 border border-slate-200 hover:border-sky-300 rounded-2xl text-left transition-all active:scale-95 flex flex-col justify-between shadow-xs disabled:opacity-50"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-black text-white px-2 py-0.5 rounded-md ${sample.badgeColor}`}
                  >
                    {sample.bank}
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 font-receipt">
                    Rp {sample.defaultData.amount?.toLocaleString('id-ID')}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-800 line-clamp-1">
                  {sample.defaultData.recipientName}
                </p>
                <p className="text-[10px] text-slate-500 line-clamp-1">
                  {sample.title}
                </p>
              </div>

              <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-sky-600">
                <span>Pindai Sampel</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Web Share Target Guidance Note for Android */}
      <div className="bg-sky-50/80 border border-sky-200/80 rounded-2xl p-4 text-xs space-y-1.5 text-sky-950">
        <div className="font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          Tips: Gunakan Menu "Share" di Android
        </div>
        <p className="text-sky-800 text-[11px] leading-relaxed">
          Setelah aplikasi <strong>kirim dana</strong> diinstal ke layar utama (Add to Home Screen), Anda bisa membuka bukti transfer di WhatsApp atau galeri HP, lalu tekan menu <strong>Bagikan (Share)</strong> dan pilih <strong>kirim dana</strong> untuk pemindaian otomatis tanpa perlu download manual!
        </p>
      </div>
    </div>
  );
};
