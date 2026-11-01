import React, { useRef, useState } from 'react';
import { ReceiptData, AppSettings } from '../types/receipt';
import { ReceiptCard } from './ReceiptCard';
import { ReceiptEditModal } from './ReceiptEditModal';
import { buildReceiptEscPos, sendEscPosToPrinter, connectBluetoothPrinter } from '../utils/bluetoothPrinter';
import { downloadReceiptImage, shareReceiptImage, buildWhatsAppCaption } from '../utils/exportImage';
import confetti from 'canvas-confetti';
import {
  Printer,
  Share2,
  Download,
  Edit3,
  Copy,
  Check,
  Smartphone,
  Eye,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface ReceiptPreviewViewProps {
  receipt: ReceiptData | null;
  settings: AppSettings;
  onUpdateReceipt: (updated: ReceiptData) => void;
  onOpenScanner: () => void;
  onOpenPrinterSettings: () => void;
  isPrinterConnected: boolean;
}

export const ReceiptPreviewView: React.FC<ReceiptPreviewViewProps> = ({
  receipt,
  settings,
  onUpdateReceipt,
  onOpenScanner,
  onOpenPrinterSettings,
  isPrinterConnected,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeFocusField, setActiveFocusField] = useState<keyof ReceiptData | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [showOriginalImage, setShowOriginalImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!receipt) {
    return (
      <div className="text-center py-12 px-4 space-y-4">
        <div className="w-16 h-16 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto">
          <Edit3 className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800">
          Belum Ada Struk Aktif
        </h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Silakan pindai bukti transfer dari menu scan atau buat struk transfer baru.
        </p>
        <button
          onClick={onOpenScanner}
          className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20"
        >
          Pindai Bukti Transfer
        </button>
      </div>
    );
  }

  const handleTapField = (fieldKey: keyof ReceiptData) => {
    setActiveFocusField(fieldKey);
    setIsEditModalOpen(true);
  };

  const handlePrintBluetooth = async () => {
    try {
      setIsPrinting(true);
      setStatusMessage(null);

      const escPosBytes = buildReceiptEscPos(receipt, settings);

      if (!isPrinterConnected) {
        // Automatically prompt pairing
        await connectBluetoothPrinter();
      }

      await sendEscPosToPrinter(escPosBytes);

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });

      setStatusMessage({
        type: 'success',
        text: 'Struk berhasil dikirim ke printer thermal Bluetooth!',
      });
    } catch (err: any) {
      console.error('Print error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal mencetak ke printer. Pastikan Bluetooth aktif dan printer sudah menyala.',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!receiptRef.current) return;
    try {
      setIsExporting(true);
      setStatusMessage(null);
      await downloadReceiptImage(
        receiptRef.current,
        `struk-${receipt.recipientName.replace(/\s+/g, '_')}-${receipt.refNumber}.png`
      );
      setStatusMessage({
        type: 'success',
        text: 'Gambar struk PNG resolusi tinggi berhasil disimpan ke galeri/unduhan.',
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menyimpan gambar.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSharePng = async () => {
    if (!receiptRef.current) return;
    try {
      setIsExporting(true);
      setStatusMessage(null);
      const res = await shareReceiptImage(receiptRef.current, receipt);
      if (res.sharedViaNative) {
        setStatusMessage({
          type: 'success',
          text: 'Struk berhasil dibagikan.',
        });
      } else if (res.error) {
        setStatusMessage({
          type: 'success',
          text: res.error,
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal membagikan struk.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyWhatsApp = () => {
    const text = buildWhatsAppCaption(receipt);
    navigator.clipboard.writeText(text);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2500);
    setStatusMessage({
      type: 'success',
      text: 'Teks format WhatsApp berhasil disalin ke clipboard!',
    });
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Tap-To-Edit Guide Banner */}
      <div className="bg-sky-50 border border-sky-200/90 rounded-2xl p-3 flex items-center justify-between text-xs text-sky-900 shadow-xs">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-sky-600 shrink-0" />
          <span className="font-semibold text-[11px] sm:text-xs">
            <strong>Tap-to-Edit:</strong> Sentuh bagian teks struk untuk mengedit
          </span>
        </div>
        <button
          onClick={() => {
            setActiveFocusField(null);
            setIsEditModalOpen(true);
          }}
          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-[11px] shrink-0 transition-colors"
        >
          Edit Lengkap
        </button>
      </div>

      {/* Status toast */}
      {statusMessage && (
        <div
          className={`p-3 rounded-2xl text-xs flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Physical Thermal Receipt Component */}
      <div className="py-1">
        <ReceiptCard
          ref={receiptRef}
          receipt={receipt}
          settings={settings}
          onTapField={handleTapField}
        />
      </div>

      {/* Quick Action Buttons Grid */}
      <div className="space-y-2.5 max-w-md mx-auto">
        {/* Cetak Bluetooth Button (Primary) */}
        <button
          onClick={handlePrintBluetooth}
          disabled={isPrinting}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 active:scale-[0.98] text-white font-black text-sm shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2.5 transition-all disabled:opacity-60"
        >
          <Printer className="w-5 h-5" />
          <span>
            {isPrinting
              ? 'Sedang Mencetak...'
              : `Cetak Struk Bluetooth (${settings.paperSize})`}
          </span>
        </button>

        {/* Share & Download Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Bagikan ke Medsos (PNG) */}
          <button
            onClick={handleSharePng}
            disabled={isExporting}
            className="py-3 px-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Share2 className="w-4 h-4 text-sky-600" />
            <span>Bagikan Medsos</span>
          </button>

          {/* Simpan Gambar PNG */}
          <button
            onClick={handleDownloadPng}
            disabled={isExporting}
            className="py-3 px-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Download className="w-4 h-4 text-sky-600" />
            <span>Simpan PNG</span>
          </button>
        </div>

        {/* WhatsApp & Scan Lagi Bar */}
        <div className="flex gap-2">
          <button
            onClick={handleCopyWhatsApp}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            {copiedCaption ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>{copiedCaption ? 'Teks Tersalin!' : 'Salin Chat WA'}</span>
          </button>

          <button
            onClick={onOpenScanner}
            className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Pindai Lagi</span>
          </button>
        </div>
      </div>

      {/* Toggle View Original Scanned Image if available */}
      {receipt.imageUrl && (
        <div className="max-w-md mx-auto pt-2">
          <button
            onClick={() => setShowOriginalImage(!showOriginalImage)}
            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showOriginalImage ? 'Sembunyikan Foto Bukti' : 'Lihat Foto Bukti Asli'}</span>
          </button>

          {showOriginalImage && (
            <div className="mt-2 p-2 bg-slate-900 rounded-2xl overflow-hidden shadow-lg animate-in fade-in">
              <img
                src={receipt.imageUrl}
                alt="Foto Bukti Transfer Asli"
                className="w-full max-h-80 object-contain rounded-xl"
              />
            </div>
          )}
        </div>
      )}

      {/* Tap-To-Edit Modal */}
      <ReceiptEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        receipt={receipt}
        onSave={(updated) => {
          onUpdateReceipt(updated);
          setStatusMessage({
            type: 'success',
            text: 'Data struk berhasil diperbarui.',
          });
        }}
        initialFocusField={activeFocusField}
      />
    </div>
  );
};
