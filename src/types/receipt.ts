export interface ReceiptData {
  id: string;
  date: string; // e.g. "01/11/2026"
  time: string; // e.g. "14:35:12"
  refNumber: string; // e.g. "KD-20261101-7821"
  recipientName: string; // e.g. "BUDI SANTOSO"
  bankName: string; // e.g. "BCA" or "DANA"
  accountNumber: string; // e.g. "887012345678"
  amount: number; // e.g. 150000
  adminFee: number; // e.g. 5000
  totalAmount: number; // amount + adminFee
  notes: string; // e.g. "Transfer Berhasil"
  agentName: string; // e.g. "loket ppob Athar digital payment"
  agentTagline?: string; // e.g. "gerai transaksi online & multi pembayaran"
  agentServices?: string; // e.g. "layanan transfer uang tarik tunai & pembayaran tagihan"
  agentLocation: string; // e.g. "Bekasi, Jawa Barat"
  agentContact: string; // e.g. "0812-3456-7890"
  status: 'BERHASIL' | 'SUKSES' | 'SELESAI';
  sourceApp?: string; // e.g. "BCA Mobile", "BRImo", "Livin by Mandiri", "DANA"
  rawOcrText?: string;
  imageUrl?: string;
  createdAt: number;
}

export interface AppSettings {
  defaultAgentName: string;
  defaultAgentTagline: string;
  defaultAgentServices: string;
  defaultAgentLocation: string;
  defaultAgentContact: string;
  defaultAdminFee: number;
  paperSize: '58mm' | '80mm';
  customFooterNote: string;
  pairedPrinterName: string | null;
  pairedPrinterDeviceId: string | null;
  autoSaveHistory: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultAgentName: 'loket ppob Athar digital payment',
  defaultAgentTagline: 'gerai transaksi online & multi pembayaran',
  defaultAgentServices: 'layanan transfer uang tarik tunai & pembayaran tagihan',
  defaultAgentLocation: 'Bekasi, Jawa Barat',
  defaultAgentContact: '0812-3456-7890',
  defaultAdminFee: 5000,
  paperSize: '58mm',
  customFooterNote: 'Terima kasih telah bertransaksi di Agen kami.\nStruk ini adalah bukti pembayaran yang sah.',
  pairedPrinterName: null,
  pairedPrinterDeviceId: null,
  autoSaveHistory: true,
};
