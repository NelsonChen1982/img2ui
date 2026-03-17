/**
 * Color extraction service
 * K-means color quantization from image data
 */

import { colorDist, toHex } from './colorUtils.js';

/**
 * Extract dominant colors from an image using K-means quantization
 * Processes a 160x160 downsampled canvas and returns up to 7 colors
 * @param {string} dataUrl - Image data URL
 * @param {Function} callback - Callback receiving palette array
 * @returns {void}
 */
export function extractColors(dataUrl, callback) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, 160, 160);
    const d = ctx.getImageData(0, 0, 160, 160).data;

    const map = {};
    let totalPx = 0;
    let lumSum = 0;

    // Quantize pixels to 28-value buckets and collect stats
    for (let i = 0; i < d.length; i += 16) {
      if (d[i + 3] < 100) continue; // skip transparent
      const r = Math.round(d[i] / 28) * 28;
      const g = Math.round(d[i + 1] / 28) * 28;
      const b = Math.round(d[i + 2] / 28) * 28;
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      lumSum += lum;
      totalPx++;

      const k = `${r},${g},${b}`;
      if (!map[k]) map[k] = { r, g, b, count: 0, lum };
      map[k].count++;
    }

    // Calculate average luminance
    const imgAvgLum = totalPx ? lumSum / totalPx : 128;

    // Sort buckets by frequency, take top 50
    const sorted = Object.values(map).sort((a, b) => b.count - a.count);
    const total = sorted.reduce((s, c) => s + c.count, 0);
    const candidates = sorted
      .slice(0, 50)
      .map((c) => ({
        ...c,
        hex: toHex(c.r, c.g, c.b),
        ratio: c.count / total,
      }));

    // Cluster: keep colors with distance >= 48
    const palette = [];
    for (const c of candidates) {
      if (!palette.some((p) => colorDist(c, p) < 48)) {
        palette.push(c);
      }
      if (palette.length >= 7) break;
    }

    // Ensure light and dark colors
    if (!palette.find((c) => c.lum > 200)) {
      palette.push({
        hex: '#f0f0f0',
        r: 240,
        g: 240,
        b: 240,
        lum: 240,
        ratio: 0.05,
      });
    }
    if (!palette.find((c) => c.lum < 60)) {
      palette.push({
        hex: '#1a1a1a',
        r: 26,
        g: 26,
        b: 26,
        lum: 26,
        ratio: 0.05,
      });
    }

    // Return callback with top 7 colors and avg luminance
    callback(palette.slice(0, 7), imgAvgLum);
  };
  img.src = dataUrl;
}
