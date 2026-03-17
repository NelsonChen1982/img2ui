/**
 * Color utility functions
 * Pure functions for color manipulation and analysis
 */

/**
 * Calculate Euclidean RGB distance between two color objects
 * @param {Object} a - Color object {r, g, b}
 * @param {Object} b - Color object {r, g, b}
 * @returns {number} Distance value
 */
export function colorDist(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/**
 * Convert RGB values to hex string
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Hex color string (#RRGGBB)
 */
export function toHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.min(255, v).toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Check if a hex color is light based on luminance
 * Uses relative luminance (WCAG formula) with threshold of 145
 * @param {string} hex - Hex color string (#RRGGBB)
 * @returns {boolean} True if color is light
 */
export function isLight(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 145;
}

/**
 * Convert hex color to rgba string with alpha
 * @param {string} hex - Hex color string (#RRGGBB)
 * @param {number} a - Alpha value (0-1)
 * @returns {string} RGBA string (rgba(r,g,b,a))
 */
export function ha(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Darken a hex color by reducing RGB values
 * @param {string} hex - Hex color string (#RRGGBB)
 * @param {number} n - Amount to darken (0-255)
 * @returns {string} Darkened hex color
 */
export function darken(hex, n) {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - n);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - n);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - n);
  return toHex(r, g, b);
}

/**
 * Lighten a hex color by increasing RGB values
 * @param {string} hex - Hex color string (#RRGGBB)
 * @param {number} n - Amount to lighten (0-255)
 * @returns {string} Lightened hex color
 */
export function lighten(hex, n) {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + n);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + n);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + n);
  return toHex(r, g, b);
}

/**
 * Ensure text color has sufficient contrast against a background.
 * Only overrides when both are light or both are dark (clash).
 * Use on components with prominent/full backgrounds (hero, card brand, navbar solid, etc.)
 *
 * @param {string} bg - Background hex color
 * @param {string} preferred - Preferred text hex color
 * @param {string} [fallbackLight='#ffffff'] - Light fallback when bg is dark
 * @param {string} [fallbackDark='#111111'] - Dark fallback when bg is light
 * @returns {string} Safe text color
 */
export function safeTextColor(bg, preferred, fallbackLight = '#ffffff', fallbackDark = '#111111') {
  if (!bg || !preferred) return preferred || fallbackDark;
  // Handle non-hex values (rgba, transparent, etc.) — skip safety check
  if (!bg.startsWith('#') || bg.length < 7) return preferred;
  if (!preferred.startsWith('#') || preferred.length < 7) return preferred;
  const bgIsLight = isLight(bg);
  const textIsLight = isLight(preferred);
  if (bgIsLight && textIsLight) return fallbackDark;
  if (!bgIsLight && !textIsLight) return fallbackLight;
  return preferred;
}

/**
 * Ensure a hex color is dark enough to be readable as text on a light/white surface.
 * If the color is too light (luminance > 170), darken it proportionally.
 * Use for semantic colors (success, warning, info, accent) used as text on white/tinted backgrounds.
 *
 * @param {string} hex - Hex color to check
 * @returns {string} Original or darkened hex
 */
export function readableOnLight(hex) {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (r * 299 + g * 587 + b * 114) / 1000;
  if (lum > 170) {
    const factor = Math.max(0.45, 130 / lum);
    return toHex(Math.round(r * factor), Math.round(g * factor), Math.round(b * factor));
  }
  return hex;
}

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string (#RRGGBB)
 * @returns {Object} Color object {r, g, b}
 */
export function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}
