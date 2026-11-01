import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Function to generate a simple uncompressed PNG buffer
function createPng(width, height, getPixel) {
  // getPixel(x, y) => [r, g, b, a]
  const bytesPerPixel = 4;
  const rowBytes = 1 + width * bytesPerPixel; // 1 filter byte (0) + pixels
  const rawData = Buffer.alloc(height * rowBytes);

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    // CRC
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Simple CRC32 implementation
function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

// Generate brand icon with nice gradient and bank/receipt motif
function generateBrandIcon(size, isMaskable) {
  return createPng(size, size, (x, y) => {
    const nx = x / size;
    const ny = y / size;

    // Center coordinates (-1 to 1)
    const cx = (x - size / 2) / (size / 2);
    const cy = (y - size / 2) / (size / 2);
    const dist = Math.sqrt(cx * cx + cy * cy);

    // If maskable, full bleed light blue gradient
    // If regular, rounded squircle
    let isInside = true;
    if (!isMaskable) {
      // Rounded rect radius 0.22
      const ax = Math.abs(cx);
      const ay = Math.abs(cy);
      const r = 0.25;
      const kx = Math.max(0, ax - (1 - r));
      const ky = Math.max(0, ay - (1 - r));
      if (Math.sqrt(kx * kx + ky * ky) > r) {
        isInside = false;
      }
    }

    if (!isInside) return [0, 0, 0, 0];

    // Background gradient: Elegant sky blue / cyan (#0284c7 -> #38bdf8)
    const bgR = Math.round(2 + nx * 50);
    const bgG = Math.round(132 + ny * 50);
    const bgB = Math.round(199 + (nx + ny) * 25);

    // Inner symbol: Receipt / Send Arrow
    // Scale for safe zone: 0.6
    const sx = cx / 0.6;
    const sy = cy / 0.6;

    // Draw receipt paper outline (white card)
    const inCard = (sx >= -0.65 && sx <= 0.65 && sy >= -0.75 && sy <= 0.75);
    if (inCard) {
      // Rounded card
      const cax = Math.abs(sx) - (0.65 - 0.15);
      const cay = Math.abs(sy) - (0.75 - 0.15);
      const cornerDist = Math.sqrt(Math.max(0, cax) ** 2 + Math.max(0, cay) ** 2);
      if (cornerDist <= 0.15) {
        // Inside card: white background
        // Draw transfer arrow / send icon inside card
        // Header bar in card (blue):
        if (sy >= -0.75 && sy <= -0.45) {
          return [14, 165, 233, 255]; // Cyan header
        }
        // Small lines in card (receipt lines)
        if (sy >= -0.3 && sy <= -0.22 && sx >= -0.45 && sx <= 0.45) return [186, 230, 253, 255];
        if (sy >= -0.12 && sy <= -0.04 && sx >= -0.45 && sx <= 0.2) return [203, 213, 225, 255];
        if (sy >= 0.06 && sy <= 0.14 && sx >= -0.45 && sx <= 0.35) return [203, 213, 225, 255];
        // Green success checkmark or blue circle at bottom
        const scx = sx;
        const scy = sy - 0.42;
        if (scx * scx + scy * scy <= 0.04) {
          return [16, 185, 129, 255]; // Emerald badge
        }

        return [255, 255, 255, 255];
      }
    }

    return [bgR, bgG, bgB, 255];
  });
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA icons...');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generateBrandIcon(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generateBrandIcon(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generateBrandIcon(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generateBrandIcon(180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.png'), generateBrandIcon(64, false));

// Also write an SVG version
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#bg)" />
  <rect x="110" y="80" width="292" height="352" rx="24" fill="#ffffff" filter="drop-shadow(0 12px 24px rgba(0,0,0,0.15))" />
  <path d="M110 104 C110 90.7 120.7 80 134 80 L378 80 C391.3 80 402 90.7 402 104 L402 150 L110 150 Z" fill="#0284c7" />
  <circle cx="150" cy="115" r="14" fill="#ffffff" opacity="0.9" />
  <rect x="150" y="190" width="212" height="16" rx="8" fill="#bae6fd" />
  <rect x="150" y="225" width="160" height="14" rx="7" fill="#cbd5e1" />
  <rect x="150" y="255" width="190" height="14" rx="7" fill="#cbd5e1" />
  <line x1="150" y1="295" x2="362" y2="295" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 6" />
  <rect x="150" y="320" width="120" height="16" rx="8" fill="#0284c7" />
  <circle cx="340" cy="355" r="32" fill="#10b981" />
  <path d="M328 355 L337 364 L353 346" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

console.log('Icons generated successfully.');
