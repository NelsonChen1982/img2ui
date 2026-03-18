/**
 * Auto-assign semantic color slots based on extracted colors
 * Pure function that returns color slot assignments
 */

import { ha } from './colorUtils.js';

/**
 * Get HSL from RGB values
 */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Score how "green-ish" a color is (for success)
 */
function greenScore(c) {
  const hsl = rgbToHsl(c.r, c.g, c.b);
  // Green hue range: ~80-160
  if (hsl.s < 15) return 0; // too gray
  const hDist = Math.min(Math.abs(hsl.h - 120), 360 - Math.abs(hsl.h - 120));
  if (hDist > 60) return 0;
  return (60 - hDist) * (hsl.s / 100);
}

/**
 * Score how "yellow/orange-ish" a color is (for warning)
 */
function warningScore(c) {
  const hsl = rgbToHsl(c.r, c.g, c.b);
  if (hsl.s < 15) return 0;
  // Yellow-orange hue range: ~30-60
  const hDist = Math.min(Math.abs(hsl.h - 45), 360 - Math.abs(hsl.h - 45));
  if (hDist > 40) return 0;
  return (40 - hDist) * (hsl.s / 100);
}

/**
 * Score how "red-ish" a color is (for danger)
 */
function dangerScore(c) {
  const hsl = rgbToHsl(c.r, c.g, c.b);
  if (hsl.s < 15) return 0;
  // Red hue range: 0-20 or 340-360
  const hDist = Math.min(Math.abs(hsl.h - 0), Math.abs(hsl.h - 360));
  if (hDist > 30) return 0;
  return (30 - hDist) * (hsl.s / 100);
}

/**
 * Auto-assign extracted colors to semantic slots (primary, secondary, etc.)
 * Uses saturation and luminance heuristics to determine semantic roles.
 * Success/warning/danger/info always get a color from the palette.
 * @param {Array} extractedColors - Array of color objects {hex, r, g, b, lum, ratio}
 * @returns {Object} Color slots object {primary, secondary, accent, ...}
 */
export function autoAssignSlots(extractedColors) {
  const cols = extractedColors || [];

  // Helper: sort by luminance
  const byLum = [...cols].sort((a, b) => a.lum - b.lum);

  // Helper: sort by saturation (descending)
  const bySat = [...cols].sort((a, b) => {
    const satA = Math.max(a.r, a.g, a.b) - Math.min(a.r, a.g, a.b);
    const satB = Math.max(b.r, b.g, b.b) - Math.min(b.r, b.g, b.b);
    return satB - satA; // most saturated first
  });

  // Filter mid-tones (40-200 lum)
  const midTones = bySat.filter((c) => c.lum > 40 && c.lum < 200);

  const primaryHex = midTones[0]?.hex || cols[0]?.hex || '#6366f1';
  const secondaryHex = midTones[1]?.hex || cols[1]?.hex || '#8b5cf6';
  const accentHex = midTones[2]?.hex || cols[2]?.hex || '#ec4899';

  // Assign core slots
  const colorSlots = {
    primary: primaryHex,
    secondary: secondaryHex,
    accent: accentHex,
    surface:
      (byLum.find((c) => c.lum > 200) || byLum[byLum.length - 1])?.hex ||
      '#f5f5f5',
    text: (byLum.find((c) => c.lum < 60) || byLum[0])?.hex || '#1a1a1a',
    border:
      (byLum.find((c) => c.lum > 150 && c.lum < 230) ||
       byLum.find((c) => c.lum > 100 && c.lum < 230))?.hex ||
      '#d0d0d0',
  };

  // Already-used hexes (avoid reusing primary/secondary/accent for feedback slots)
  const usedCore = new Set([primaryHex, secondaryHex, accentHex]);

  // For feedback colors, try to find a hue-matched color in the palette first.
  // If not found, pick any remaining saturated color from the palette.
  // Only fall back to hardcoded defaults if palette is very small (<= 3 colors).

  const remaining = bySat.filter((c) => !usedCore.has(c.hex) && c.lum > 30 && c.lum < 220);

  // Score-based matching
  const bestGreen = [...cols].sort((a, b) => greenScore(b) - greenScore(a))[0];
  const bestWarning = [...cols].sort((a, b) => warningScore(b) - warningScore(a))[0];
  const bestDanger = [...cols].sort((a, b) => dangerScore(b) - dangerScore(a))[0];

  // Success: best green-ish, or a remaining mid-tone, or accent
  if (bestGreen && greenScore(bestGreen) > 5) {
    colorSlots.success = bestGreen.hex;
  } else if (remaining.length > 0) {
    colorSlots.success = remaining[0]?.hex || accentHex;
  } else {
    colorSlots.success = accentHex;
  }

  // Warning: best yellow/orange-ish, or a remaining mid-tone, or secondary
  if (bestWarning && warningScore(bestWarning) > 5) {
    colorSlots.warning = bestWarning.hex;
  } else if (remaining.length > 1) {
    colorSlots.warning = remaining[1]?.hex || secondaryHex;
  } else {
    colorSlots.warning = secondaryHex;
  }

  // Danger: best red-ish, or a remaining mid-tone, or primary
  if (bestDanger && dangerScore(bestDanger) > 5) {
    colorSlots.danger = bestDanger.hex;
  } else if (remaining.length > 2) {
    colorSlots.danger = remaining[2]?.hex || primaryHex;
  } else {
    colorSlots.danger = primaryHex;
  }

  // Info = accent
  colorSlots.info = accentHex;

  return colorSlots;
}
