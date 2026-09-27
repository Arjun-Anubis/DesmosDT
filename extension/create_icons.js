const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size) {
  const width = size;
  const height = size;

  // RGBA buffer: 4 bytes per pixel + 1 filter byte per scanline
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(scanlineLength * height);

  // Background color: Deep modern blue #1d4ed8
  const bg = [0x1d, 0x4e, 0xd8, 0xff];
  // Accent white: #ffffff
  const fg = [0xff, 0xff, 0xff, 0xff];
  // Stem light blue: #93c5fd
  const stem = [0x93, 0xc5, 0xfd, 0xff];

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter byte 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Rounded rectangle mask
      const r = size * 0.2;
      const dx = Math.max(Math.abs(x - width / 2) - (width / 2 - r), 0);
      const dy = Math.max(Math.abs(y - height / 2) - (height / 2 - r), 0);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > r) {
        // Transparent outside
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Default background
      let [pr, pg, pb, pa] = bg;

      // Draw 3 discrete stems with lollipop markers
      const baselineY = Math.floor(height * 0.75);
      const stemXPositions = [
        Math.floor(width * 0.28),
        Math.floor(width * 0.50),
        Math.floor(width * 0.72)
      ];
      const stemTops = [
        Math.floor(height * 0.45),
        Math.floor(height * 0.22),
        Math.floor(height * 0.55)
      ];
      const markerRadius = Math.max(2, Math.floor(size * 0.08));

      // Draw baseline
      if (y === baselineY && x >= width * 0.18 && x <= width * 0.82) {
        [pr, pg, pb, pa] = stem;
      }

      // Check stems
      for (let i = 0; i < 3; i++) {
        const sx = stemXPositions[i];
        const sy = stemTops[i];

        // Vertical stem
        const stemWidth = Math.max(1, Math.floor(size * 0.04));
        if (Math.abs(x - sx) <= stemWidth / 2 && y >= sy && y <= baselineY) {
          [pr, pg, pb, pa] = stem;
        }

        // Circular head
        const headDist = Math.sqrt((x - sx) * (x - sx) + (y - sy) * (y - sy));
        if (headDist <= markerRadius) {
          [pr, pg, pb, pa] = fg;
        }
      }

      rawData[pixelOffset] = pr;
      rawData[pixelOffset + 1] = pg;
      rawData[pixelOffset + 2] = pb;
      rawData[pixelOffset + 3] = pa;
    }
  }

  // Build minimal PNG chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.concat([typeBuf, data]);

    const crc = calcCRC(crcBuf);
    const crcOut = Buffer.alloc(4);
    crcOut.writeUInt32BE(crc >>> 0, 0);

    return Buffer.concat([len, typeBuf, data, crcOut]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const idatData = zlib.deflateSync(rawData);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function calcCRC(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ 0xffffffff;
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const png = createPNG(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  console.log(`Generated icon${size}.png`);
});
