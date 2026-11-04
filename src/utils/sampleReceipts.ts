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
    title: 'BRImo (Transfer Bank BRI)',
    bank: 'BRI',
    badgeColor: 'bg-blue-700',
    mockOcrText: `Transaksi Berhasil
15 Oktober 2026, 19:46:07 WIB
Total Transaksi |
Rp250.000 |
No. Ref 232547592186 |
Sumber Dana |
M. CHASIN ZAUHARI |
(vz) BANK BRI
6305 *+++ *xwx 530
Tujuan
ALDIANTO DONNY PRANA
AP BANK BRI
1160 0101 6845 502
Jenis Transaksi Transfer Bank BRI
Catatan -
Nominal Rp250.000
Biaya Admin Rpo`,
    defaultData: {
      senderName: 'M. CHASIN ZAUHARI',
      senderBank: 'BANK BRI',
      senderAccount: '6305 **** **** 530',
      bankName: 'BRI',
      recipientName: 'ALDIANTO DONNY PRANA',
      accountNumber: '1160 0101 6845 502',
      amount: 250000,
      adminFee: 5000,
      totalAmount: 255000,
      refNumber: '232547592186',
      date: '15/10/2026',
      time: '19:46:07',
      notes: 'Transfer Berhasil',
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
