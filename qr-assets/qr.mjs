import qrcodegen from './qrcodegen.mjs';

export function encode(text, level = 'M') {
  if (!text.length) throw new Error('請先輸入內容。');
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > 2953) throw new Error('內容超過單個二維碼的容量，請縮短內容或分開生成。');
  try {
    const segments = [qrcodegen.QrSegment.makeEci(26), qrcodegen.QrSegment.makeBytes(bytes)];
    const ecc = { L: 'LOW', M: 'MEDIUM', Q: 'QUARTILE', H: 'HIGH' }[level];
    if (!ecc) throw new Error('Invalid error correction level');
    return qrcodegen.QrCode.encodeSegments(segments, qrcodegen.QrCode.Ecc[ecc], 1, 40, -1, true);
  } catch {
    throw new Error('此內容在目前容錯等級下過長。請縮短內容或選擇較低的容錯等級。');
  }
}

export function svgFor(qr) {
  const size = qr.size + 8;
  const cells = [];
  for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) {
    if (qr.getModule(x, y)) cells.push(`M${x + 4},${y + 4}h1v1h-1z`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * 8}" height="${size * 8}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${cells.join('')}" fill="#1b1720"/></svg>`;
}

export function canvasFor(qr, documentRef = document) {
  const canvas = documentRef.createElement('canvas');
  const scale = Math.max(4, Math.ceil(1024 / (qr.size + 8)));
  canvas.width = canvas.height = (qr.size + 8) * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1b1720';
  for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) {
    if (qr.getModule(x, y)) ctx.fillRect((x + 4) * scale, (y + 4) * scale, scale, scale);
  }
  return canvas;
}

export function splitBatch(value) {
  const lines = value.replace(/\r\n?/g, '\n').split('\n').filter(line => line.trim().length);
  if (lines.length > 40) throw new Error('一次最多生成 40 個二維碼，請分批處理。');
  return lines;
}
