import { ReceiptData } from '../types/receipt';
import { generateRefNumber } from './numberFormat';

export interface SampleReceipt {
  id: string;
  title: string;
  bank: string;
  badgeColor: string;
  mockOcrText: string;
  defaultData: Partial<ReceiptData>;
}

export const SAMPLE_RECEIPTS: SampleReceipt[] = [
  {
    id: 'sample-bca',
    title: 'BCA Mobile (Transfer Antar Bank)',
    bank: 'BCA',
    badgeColor: 'bg-blue-600',
    mockOcrText: `m-Transfer
BERHASIL
01/11/2026 14:35:20
No. Ref : 902817290123
Transfer Ke: BRI
No. Rekening: 034101002345508
Nama: AHMAD FAUZI
Jumlah: Rp. 350.000,00
Berita: Bayar sewa bulanan
Status: Transaksi Berhasil`,
    defaultData: {
      bankName: 'BRI',
      recipientName: 'AHMAD FAUZI',
      accountNumber: '034101002345508',
      amount: 350000,
      adminFee: 5000,
      totalAmount: 355000,
      refNumber: generateRefNumber('BCA'),
      notes: 'Bayar sewa bulanan',
      sourceApp: 'BCA Mobile',
      status: 'BERHASIL',
    },
  },
  {
    id: 'sample-dana',
    title: 'DANA (Kirim Uang ke Bank)',
    bank: 'DANA',
    badgeColor: 'bg-sky-500',
    mockOcrText: `DANA
Kirim Uang Berhasil!
Total Bayar: Rp 150.000
Ke: BANK MANDIRI
1560012349876
a.n SITI NURHALIZA
ID Transaksi: DN20261101998877
01 Nov 2026 09:15:40 WIB
Metode Pembayaran: Saldo DANA`,
    defaultData: {
      bankName: 'MANDIRI',
      recipientName: 'SITI NURHALIZA',
      accountNumber: '1560012349876',
      amount: 150000,
      adminFee: 5000,
      totalAmount: 155000,
      refNumber: generateRefNumber('DN'),
      notes: 'Kirim Uang Berhasil',
      sourceApp: 'DANA',
      status: 'BERHASIL',
    },
  },
  {
    id: 'sample-brimo',
    title: 'BRImo (Transfer Sesama BRI)',
    bank: 'BRI',
    badgeColor: 'bg-blue-700',
    mockOcrText: `BRImo
Transaksi Berhasil
01/11/2026 16:42:10 WIB
Nomor Referensi: BR202611018899
Tujuan: BANK BRI
Nomor Rekening: 102938475610
Nama Penerima: RIAN HIDAYAT
Nominal: Rp 750.000
Biaya Admin: Rp 0
Total: Rp 750.000
Catatan: Pembelian material`,
    defaultData: {
      bankName: 'BRI',
      recipientName: 'RIAN HIDAYAT',
      accountNumber: '102938475610',
      amount: 750000,
      adminFee: 5000,
      totalAmount: 755000,
      refNumber: generateRefNumber('BRI'),
      notes: 'Pembelian material',
      sourceApp: 'BRImo',
      status: 'BERHASIL',
    },
  },
  {
    id: 'sample-mandiri',
    title: 'Livin by Mandiri (Transfer BI-FAST)',
    bank: 'MANDIRI',
    badgeColor: 'bg-amber-600',
    mockOcrText: `Livin' by Mandiri
Resi Transfer Berhasil
Tanggal: 01/11/2026 11:20:05
No. Referensi: LVN9988221100
Transfer ke: BANK CENTRAL ASIA (BCA)
No. Rek: 8870345211
Penerima: DEWI LESTARI
Nominal Transfer: Rp 1.200.000
Metode: BI-FAST
Keterangan: Tagihan supplier`,
    defaultData: {
      bankName: 'BCA',
      recipientName: 'DEWI LESTARI',
      accountNumber: '8870345211',
      amount: 1200000,
      adminFee: 5000,
      totalAmount: 1205000,
      refNumber: generateRefNumber('LVN'),
      notes: 'Tagihan supplier',
      sourceApp: "Livin' by Mandiri",
      status: 'BERHASIL',
    },
  },
];
