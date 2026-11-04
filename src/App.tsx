import React, { useState, useEffect, useCallback } from 'react';
import { ReceiptData, AppSettings, DEFAULT_SETTINGS } from './types/receipt';
import { SAMPLE_RECEIPTS } from './utils/sampleReceipts';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { ScannerView } from './components/ScannerView';
import { ReceiptPreviewView } from './components/ReceiptPreviewView';
import { SettingsView } from './components/SettingsView';
import { HistoryView } from './components/HistoryView';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { useSharedReceipt } from './hooks/useSharedReceipt';
import { runLocalOcr, parseReceiptText } from './utils/ocrParser';
import { generateRefNumber, getCurrentDateStr, getCurrentTimeStr } from './utils/numberFormat';

export default function App() {
  // Load settings from localStorage
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('kirim-dana-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        let changed = false;
        // Automatically migrate old default to new default
        if (parsed.defaultAgentName === 'Agen Batara Bekasi' || !parsed.defaultAgentName) {
          parsed.defaultAgentName = 'loket ppob Athar digital payment';
          changed = true;
        }
        if (parsed.defaultAgentLocation === 'Bekasi, Jawa Barat') {
          parsed.defaultAgentLocation = '';
          changed = true;
        }
        if (parsed.defaultAgentContact === '0812-3456-7890') {
          parsed.defaultAgentContact = '';
          changed = true;
        }
        if (changed) {
          localStorage.setItem('kirim-dana-settings', JSON.stringify({ ...DEFAULT_SETTINGS, ...parsed }));
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
      return DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  });

  // Load history from localStorage
  const [history, setHistory] = useState<ReceiptData[]>(() => {
    try {
      const saved = localStorage.getItem('kirim-dana-history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Active Receipt state (initialize with first sample for immediate instant testing)
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptData | null>(() => {
    return {
      id: 'init_' + Date.now(),
      date: getCurrentDateStr(),
      time: getCurrentTimeStr(),
      refNumber: generateRefNumber('BCA'),
      recipientName: 'AHMAD FAUZI',
      bankName: 'BRI',
      accountNumber: '034101002345508',
      amount: 350000,
      adminFee: 5000,
      totalAmount: 355000,
      notes: 'Bayar sewa bulanan',
      agentName: 'loket ppob Athar digital payment',
      agentTagline: 'gerai transaksi online & multi pembayaran',
      agentServices: 'layanan transfer uang tarik tunai & pembayaran tagihan',
      agentLocation: '',
      agentContact: '',
      status: 'BERHASIL',
      sourceApp: 'BCA Mobile',
      createdAt: Date.now(),
    };
  });

  const [activeTab, setActiveTab] = useState<NavTab>('receipt');
  const [isPrinterConnected, setIsPrinterConnected] = useState<boolean>(false);
  const [connectedPrinterName, setConnectedPrinterName] = useState<string | null>(null);

  // Sync settings to localStorage
  const handleUpdateSettings = (updated: AppSettings) => {
    setSettings(updated);
    try {
      localStorage.setItem('kirim-dana-settings', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  };

  // Sync history to localStorage
  const saveToHistory = useCallback((receipt: ReceiptData) => {
    setHistory((prev) => {
      // Remove duplicate ID if editing
      const filtered = prev.filter((item) => item.id !== receipt.id);
      const updated = [receipt, ...filtered].slice(0, 50); // keep last 50 receipts
      try {
        localStorage.setItem('kirim-dana-history', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save history:', e);
      }
      return updated;
    });
  }, []);

  const handleUpdateReceipt = (updated: ReceiptData) => {
    setCurrentReceipt(updated);
    saveToHistory(updated);
  };

  const handleReceiptExtracted = (receipt: ReceiptData) => {
    setCurrentReceipt(receipt);
    saveToHistory(receipt);
    setActiveTab('receipt');
  };

  // Handle incoming shared image from Android Web Share Target
  const handleSharedImage = useCallback(
    async (blob: Blob, fileName: string) => {
      setActiveTab('scan');
      try {
        const text = await runLocalOcr(blob);
        const parsed = parseReceiptText(text, settings);
        const receipt: ReceiptData = {
          ...(parsed as ReceiptData),
          id: 'shared_' + Date.now(),
          imageUrl: URL.createObjectURL(blob),
          notes: parsed.notes || `Diterima via Share (${fileName})`,
        };
        handleReceiptExtracted(receipt);
      } catch (err) {
        console.error('Error handling shared image OCR:', err);
      }
    },
    [settings, saveToHistory]
  );

  useSharedReceipt(handleSharedImage);

  // Manual create new receipt
  const handleManualCreate = () => {
    const newReceipt: ReceiptData = {
      id: 'manual_' + Date.now(),
      date: getCurrentDateStr(),
      time: getCurrentTimeStr(),
      refNumber: generateRefNumber('KD'),
      recipientName: 'NAMA PENERIMA',
      bankName: 'BCA',
      accountNumber: '',
      amount: 100000,
      adminFee: settings.defaultAdminFee,
      totalAmount: 100000 + settings.defaultAdminFee,
      notes: 'Transfer Berhasil',
      agentName: settings.defaultAgentName,
      agentTagline: settings.defaultAgentTagline,
      agentServices: settings.defaultAgentServices,
      agentLocation: settings.defaultAgentLocation,
      agentContact: settings.defaultAgentContact,
      status: 'BERHASIL',
      sourceApp: 'Input Manual',
      createdAt: Date.now(),
    };
    setCurrentReceipt(newReceipt);
    saveToHistory(newReceipt);
    setActiveTab('receipt');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        isPrinterConnected={isPrinterConnected}
        printerName={connectedPrinterName}
        onOpenPrinterSettings={() => setActiveTab('settings')}
      />

      {/* Main Content Area (Mobile Container) */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-3 pb-8">
        {/* PWA Install Banner */}
        <PWAInstallBanner />

        {/* Tab 1: Pindai OCR */}
        {activeTab === 'scan' && (
          <ScannerView
            settings={settings}
            onReceiptExtracted={handleReceiptExtracted}
            onManualCreate={handleManualCreate}
          />
        )}

        {/* Tab 2: Struk & Tap-to-Edit */}
        {activeTab === 'receipt' && (
          <ReceiptPreviewView
            receipt={currentReceipt}
            settings={settings}
            onUpdateReceipt={handleUpdateReceipt}
            onOpenScanner={() => setActiveTab('scan')}
            onOpenPrinterSettings={() => setActiveTab('settings')}
            isPrinterConnected={isPrinterConnected}
          />
        )}

        {/* Tab 3: Riwayat Transaksi */}
        {activeTab === 'history' && (
          <HistoryView
            history={history}
            onSelectReceipt={(receipt) => {
              setCurrentReceipt(receipt);
              setActiveTab('receipt');
            }}
            onClearHistory={() => {
              setHistory([]);
              localStorage.removeItem('kirim-dana-history');
            }}
            onDeleteReceipt={(id) => {
              setHistory((prev) => {
                const next = prev.filter((r) => r.id !== id);
                localStorage.setItem('kirim-dana-history', JSON.stringify(next));
                return next;
              });
            }}
            onOpenScanner={() => setActiveTab('scan')}
          />
        )}

        {/* Tab 4: Pengaturan */}
        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            isPrinterConnected={isPrinterConnected}
            connectedPrinterName={connectedPrinterName}
            onPrinterConnectedChange={(connected, name) => {
              setIsPrinterConnected(connected);
              setConnectedPrinterName(name);
            }}
          />
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav
        currentTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        hasActiveReceipt={!!currentReceipt}
      />
    </div>
  );
}
