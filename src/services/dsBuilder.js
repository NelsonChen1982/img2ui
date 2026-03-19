/**
 * Design system builder
 * Constructs the design system object and semantic tokens from color slots
 */

import { ha, isLight } from './colorUtils.js';

/**
 * Build design system object from color slots and extracted data
 * Derives typography scale, spacing, and other design tokens
 * @param {Object} colorSlots - Semantic color slots {primary, secondary, accent, surface, text, border, ...}
 * @param {Array} extractedColors - Array of color objects for palette
 * @param {number} imgAvgLum - Average luminance of source image
 * @param {HTMLElement} [canvasElement] - Optional canvas element for image dimensions
 * @param {Array} [detectedFonts] - Font detection results
 * @param {boolean} [forceIsDark] - If provided, overrides imgAvgLum-based isDark detection
 * @returns {Object} Complete DS object with colors, typography, spacing, etc.
 */
export function buildDS(colorSlots, extractedColors, imgAvgLum, canvasElement, detectedFonts, forceIsDark) {
  const primary =
    colorSlots?.primary || extractedColors[0]?.hex || '#888';
  const secondary =
    colorSlots?.secondary || extractedColors[1]?.hex || '#666';
  const accent =
    colorSlots?.accent || extractedColors[2]?.hex || '#aaa';
  const surface =
    colorSlots?.surface ||
    extractedColors.find((c) => c.lum > 200)?.hex ||
    '#f0f0f0';
  const text =
    colorSlots?.text ||
    extractedColors.find((c) => c.lum < 60)?.hex ||
    '#1a1a1a';
  const border =
    colorSlots?.border || ha(imgAvgLum < 128 ? surface : text, 0.14);
  const isDark = forceIsDark !== undefined ? forceIsDark : imgAvgLum < 128;

  // Derive typography scale from image dimensions
  const imgW = canvasElement?._img?.naturalWidth || 1440;
  const imgH = canvasElement?._img?.naturalHeight || 900;
  const scaleFactor = Math.max(0.75, Math.min(1.35, imgW / 1440));

  // Content density heuristic: taller images suggest denser content → smaller type
  const aspectRatio = imgW / imgH;
  const densityAdj = aspectRatio < 0.8 ? 0.9 : aspectRatio > 2 ? 1.05 : 1;
  const sf = scaleFactor * densityAdj;

  const round = (v) => Math.round(v);

  const typo = [
    {
      name: 'Display',
      size: round(36 * sf) + 'px',
      weight: '800',
      lh: '1.15',
    },
    { name: 'H1', size: round(28 * sf) + 'px', weight: '700', lh: '1.25' },
    { name: 'H2', size: round(22 * sf) + 'px', weight: '600', lh: '1.35' },
    { name: 'Body', size: round(16 * sf) + 'px', weight: '400', lh: '1.65' },
    { name: 'Small', size: round(14 * sf) + 'px', weight: '400', lh: '1.55' },
    {
      name: 'Caption',
      size: round(12 * sf) + 'px',
      weight: '500',
      lh: '1.4',
    },
  ];

  return {
    isDark,
    colors: {
      primary,
      secondary,
      accent,
      surface,
      text,
      border,
      success: colorSlots?.success || '#22c55e',
      warning: colorSlots?.warning || '#f59e0b',
      danger: colorSlots?.danger || '#ef4444',
      info: colorSlots?.info || accent,
    },
    allColors: extractedColors.map((c) => c.hex),
    colorRatios: extractedColors.map((c) => c.ratio),
    imageInfo: {
      width: imgW,
      height: imgH,
      scaleFactor: Math.round(sf * 100) / 100,
    },
    typo,
    spacing: [4, 8, 12, 16, 24, 32, 48, 64].map((v) =>
      Math.round(v * sf)
    ),
    radius: {
      sm: round(4 * sf) + 'px',
      md: round(8 * sf) + 'px',
      lg: round(16 * sf) + 'px',
      xl: round(24 * sf) + 'px',
      full: '999px',
    },
    fonts: {
      heading: (detectedFonts || []).find(f => f.role === 'heading')?.family || 'Inter',
      body: (detectedFonts || []).find(f => f.role === 'body')?.family || 'Inter',
    },
    shadows: {
      sm: isDark
        ? '0 1px 4px rgba(0,0,0,.4)'
        : '0 1px 3px rgba(0,0,0,.08)',
      md: isDark
        ? '0 4px 16px rgba(0,0,0,.5)'
        : '0 4px 14px rgba(0,0,0,.09)',
      lg: isDark
        ? '0 10px 30px rgba(0,0,0,.6)'
        : '0 10px 28px rgba(0,0,0,.12)',
    },
  };
}

/**
 * Build semantic tokens (flat dot-notation) from color primitives
 * These are high-level tokens derived from the design system colors
 * @param {Object} colors - Design system colors object {primary, secondary, ...}
 * @param {boolean} isDark - Whether design system is in dark mode
 * @returns {Object} Semantic tokens with dot-notation keys
 */
export function buildSemanticTokens(colors, isDark) {
  return {
    'bg.page': colors.surface,
    'bg.card': isDark ? ha('#ffffff', 0.06) : '#ffffff',
    'bg.elevated': isDark ? ha('#ffffff', 0.08) : '#ffffff',
    'bg.sunken': isDark ? ha('#000000', 0.3) : ha('#000000', 0.03),
    'bg.overlay': isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)',
    'text.primary': colors.text,
    'text.secondary': ha(colors.text, 0.65),
    'text.disabled': ha(colors.text, 0.35),
    'text.inverse': colors.surface,
    'text.onAction': isLight(colors.primary) ? '#1a1a1a' : '#ffffff',
    'border.default': colors.border,
    'border.strong': ha(colors.text, 0.25),
    'border.focus': ha(colors.primary, 0.5),
    'action.primary': colors.primary,
    'action.primaryHover': ha(colors.primary, 0.85),
    'action.secondary': colors.secondary,
    'action.disabled': ha(colors.primary, 0.4),
    'state.success': colors.success || '#22c55e',
    'state.warning': colors.warning || '#f59e0b',
    'state.danger': colors.danger || '#ef4444',
    'state.info': colors.info || colors.accent,
  };
}
