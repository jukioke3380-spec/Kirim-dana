import { ReceiptData, AppSettings } from '../types/receipt';
import { formatRupiah } from './numberFormat';

// Common Bluetooth Printer Service UUIDs
export const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Chinese POS / MPT-II / ESC-POS
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent
  '0000e0ff-3c17-d293-8e48-14fe2e4da212',
  '0000ff00-0000-1000-8000-00805f9b34fb',
];

export const PRINTER_CHARACTERISTIC_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '49535343-aca3-481c-91ec-d34e2c60233e',
  '0000ff02-0000-1000-8000-00805f9b34fb',
];

// ESC/POS Command Constants
const ESC = 0x1b;
const GS = 0x1d;

export class EscPosEncoder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  // Initialize printer
  init(): this {
    this.buffer.push(ESC, 0x40); // ESC @
    return this;
  }

  // Align: 0 = Left, 1 = Center, 2 = Right
  align(alignment: 'left' | 'center' | 'right'): this {
    const val = alignment === 'center' ? 1 : alignment === 'right' ? 2 : 0;
    this.buffer.push(ESC, 0x61, val);
    return this;
  }

  // Bold on/off
  bold(enable: boolean): this {
    this.buffer.push(ESC, 0x45, enable ? 1 : 0);
    return this;
  }

  // Text size: double width / double height
  size(size: 'normal' | 'double'): this {
    this.buffer.push(GS, 0x21, size === 'double' ? 0x11 : 0x00);
    return this;
  }

  // Add raw text
  text(str: string): this {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  // Add text with newline
  line(str = ''): this {
    this.text(str + '\n');
    return this;
  }

  // Key-Value line with spaces between
  twoColumns(left: string, right: string, maxCols = 32): this {
    const totalLen = left.length + right.length;
    if (totalLen >= maxCols) {
      this.line(left);
      this.align('right').line(right).align('left');
      return this;
    }
    const spaces = ' '.repeat(maxCols - totalLen);
    this.line(left + spaces + right);
    return this;
  }

  // Full divider line
  divider(char = '-', maxCols = 32): this {
    this.line(char.repeat(maxCols));
    return this;
  }

  // Feed lines
  feed(lines = 3): this {
    this.buffer.push(ESC, 0x64, lines);
    return this;
  }

  // Partial or full cut
  cut(): this {
    this.buffer.push(GS, 0x56, 0x42, 0x00); // GS V 'B' 0
    return this;
  }

  // Get raw Uint8Array
  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Format receipt data into ESC/POS binary format for 58mm (32 chars) or 80mm (48 chars).
 */
export function buildReceiptEscPos(receipt: ReceiptData, settings: AppSettings): Uint8Array {
  const is80mm = settings.paperSize === '80mm';
  const cols = is80mm ? 48 : 32;

  const encoder = new EscPosEncoder();

  // Header
  encoder.align('center');
  encoder.bold(true).size('double').line(receipt.agentName ? receipt.agentName.toUpperCase() : 'ATHAR DIGITAL PAYMENT').size('normal');
  const tagline = receipt.agentTagline || settings.defaultAgentTagline || 'gerai transaksi online & multi pembayaran';
  const services = receipt.agentServices || settings.defaultAgentServices || 'layanan transfer uang tarik tunai & pembayaran tagihan';
  encoder.bold(true).line(tagline.toUpperCase());
  encoder.bold(true).line(services);
  if (receipt.agentLocation) {
    encoder.line(receipt.agentLocation);
  }
  if (receipt.agentContact) {
    encoder.line(`Telp/WA: ${receipt.agentContact}`);
  }
  encoder.bold(false);
  encoder.divider('=', cols);

  // Title
  encoder.bold(true).line('BUKTI TRANSFER DANA').bold(false);
  encoder.bold(true).line(`STATUS: ${receipt.status || 'BERHASIL'}`).bold(false);
  encoder.divider('-', cols);

  // Transaction Details
  encoder.align('left');
  encoder.bold(true);
  encoder.twoColumns('Tanggal', receipt.date, cols);
  encoder.twoColumns('Waktu', receipt.time + ' WIB', cols);
  encoder.twoColumns('No. Ref', receipt.refNumber, cols);
  encoder.twoColumns('Metode', receipt.sourceApp || 'Transfer Bank', cols);
  encoder.bold(false);
  encoder.divider('-', cols);

  // Source of Funds details (Sumber Dana)
  if (receipt.senderName || receipt.senderAccount || receipt.senderBank) {
    encoder.bold(true).line('SUMBER DANA (PENGIRIM):');
    if (receipt.senderName) encoder.twoColumns('Pengirim', receipt.senderName, cols);
    if (receipt.senderBank) encoder.twoColumns('Bank Asal', receipt.senderBank, cols);
    if (receipt.senderAccount) encoder.twoColumns('No. Rekening', receipt.senderAccount, cols);
    encoder.bold(false);
    encoder.divider('-', cols);
  }

  // Recipient details
  encoder.bold(true).line('TUJUAN TRANSFER:');
  encoder.twoColumns('Bank/E-Wallet', receipt.bankName, cols);
  encoder.twoColumns('No. Rekening', receipt.accountNumber, cols);
  encoder.twoColumns('Nama Penerima', receipt.recipientName, cols);
  encoder.bold(false);
  encoder.divider('-', cols);

  // Financial Breakdown
  encoder.bold(true);
  encoder.twoColumns('Jumlah Transfer', formatRupiah(receipt.amount), cols);
  encoder.twoColumns('Biaya Admin', formatRupiah(receipt.adminFee), cols);
  encoder.divider('=', cols);

  // Total
  encoder.bold(true).size('double');
  encoder.twoColumns('TOTAL', formatRupiah(receipt.totalAmount), cols);
  encoder.size('normal').bold(false);
  encoder.divider('-', cols);

  if (receipt.notes && receipt.notes !== 'Transfer Berhasil') {
    encoder.align('left').bold(true).line(`Catatan: ${receipt.notes}`).bold(false);
    encoder.divider('-', cols);
  }

  // Footer
  encoder.align('center');
  const footerLines = (settings.customFooterNote || 'Terima kasih atas kepercayaan Anda.\nStruk bukti transaksi yang sah.').split('\n');
  for (const f of footerLines) {
    encoder.line(f);
  }
  encoder.line('');
  encoder.line(`Waktu Cetak: ${receipt.date} ${receipt.time}`);
  encoder.feed(4);
  encoder.cut();

  return encoder.getBytes();
}

/**
 * Build test print ticket
 */
export function buildTestPrintEscPos(settings: AppSettings): Uint8Array {
  const is80mm = settings.paperSize === '80mm';
  const cols = is80mm ? 48 : 32;

  const encoder = new EscPosEncoder();
  encoder.align('center');
  encoder.bold(true).size('double').line('TEST PRINTER').size('normal');
  encoder.bold(true).line(settings.defaultAgentName ? settings.defaultAgentName.toUpperCase() : 'ATHAR DIGITAL PAYMENT');
  encoder.line(settings.defaultAgentTagline || 'gerai transaksi online & multi pembayaran');
  encoder.line(settings.defaultAgentServices || 'layanan transfer uang tarik tunai & pembayaran tagihan');
  encoder.divider('=', cols);
  encoder.line('Koneksi Bluetooth Berhasil!');
  encoder.line(`Ukuran Kertas: ${settings.paperSize}`);
  encoder.line(`Kapasitas Kolom: ${cols} Karakter`);
  encoder.divider('-', cols);
  encoder.align('left');
  encoder.twoColumns('Status Printer', 'TERHUBUNG', cols);
  encoder.twoColumns('Biaya Admin Def', formatRupiah(settings.defaultAdminFee), cols);
  encoder.twoColumns('Waktu Uji', new Date().toLocaleTimeString('id-ID'), cols);
  encoder.divider('=', cols);
  encoder.align('center');
  encoder.line('kirim dana - PWA POS');
  encoder.feed(3);
  encoder.cut();

  return encoder.getBytes();
}

// Global cached bluetooth connection state
let cachedDevice: any = null;
let cachedCharacteristic: any = null;

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Connect to Bluetooth Thermal Printer
 */
export async function connectBluetoothPrinter(): Promise<{
  device: any;
  characteristic: any;
  deviceName: string;
  deviceId: string;
}> {
  if (!isWebBluetoothSupported()) {
    throw new Error('Web Bluetooth tidak didukung pada browser ini. Gunakan Google Chrome di Android atau Desktop dengan HTTPS.');
  }

  // Request Bluetooth Device
  const device = await (navigator as any).bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICE_UUIDS,
  });

  if (!device || !device.gatt) {
    throw new Error('Gagal memilih perangkat Bluetooth.');
  }

  // Connect GATT
  const server = await device.gatt.connect();

  // Find printer service
  let printerService = null;
  for (const uuid of PRINTER_SERVICE_UUIDS) {
    try {
      printerService = await server.getPrimaryService(uuid);
      if (printerService) break;
    } catch (e) {
      // try next
    }
  }

  if (!printerService) {
    // If specific UUID not found, get all services
    try {
      const services = await server.getPrimaryServices();
      if (services && services.length > 0) {
        printerService = services[0];
      }
    } catch (e) {
      // ignore
    }
  }

  if (!printerService) {
    throw new Error('Layanan printer Bluetooth tidak ditemukan pada perangkat ini.');
  }

  // Find writable characteristic
  const characteristics = await printerService.getCharacteristics();
  let writableChar = null;

  for (const char of characteristics) {
    if (char.properties.write || char.properties.writeWithoutResponse) {
      writableChar = char;
      break;
    }
  }

  if (!writableChar) {
    throw new Error('Karakteristik write printer tidak ditemukan.');
  }

  cachedDevice = device;
  cachedCharacteristic = writableChar;

  // Listen for disconnect
  device.addEventListener('gattserverdisconnected', () => {
    cachedDevice = null;
    cachedCharacteristic = null;
  });

  return {
    device,
    characteristic: writableChar,
    deviceName: device.name || 'Printer Bluetooth',
    deviceId: device.id,
  };
}

/**
 * Sends binary data to the thermal printer in chunks (max 64-100 bytes)
 */
export async function sendEscPosToPrinter(
  data: Uint8Array,
  characteristic?: any
): Promise<void> {
  const targetChar = characteristic || cachedCharacteristic;
  if (!targetChar) {
    throw new Error('Printer Bluetooth belum terhubung. Silakan sambungkan printer terlebih dahulu.');
  }

  const CHUNK_SIZE = 64; // Safe chunk size for Bluetooth LE thermal printers
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    if (targetChar.writeValueWithoutResponse) {
      await targetChar.writeValueWithoutResponse(chunk);
    } else {
      await targetChar.writeValue(chunk);
    }
    // Small delay between packets to prevent printer buffer overrun
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}

/**
 * Disconnect current bluetooth device
 */
export function disconnectBluetoothPrinter(): void {
  if (cachedDevice && cachedDevice.gatt && cachedDevice.gatt.connected) {
    cachedDevice.gatt.disconnect();
  }
  cachedDevice = null;
  cachedCharacteristic = null;
}
