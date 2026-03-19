/**
 * Derive Light and Dark color palettes from brand colors
 * Produces two complete colorSlots sets with WCAG contrast enforcement
 */

import { ha, adjustForContrast } from './colorUtils.js';

const LIGHT_SURFACE = '#ffffff';
const LIGHT_TEXT = '#1a1a1a';
const DARK_SURFACE = '#121212';
const DARK_TEXT = '#f0f0f0';
const MIN_CONTRAST = 3.0;

/**
 * Derive a themed palette from brand colors for a specific theme
 * @param {Object} brand - Brand colors { primary, secondary, accent, success, warning, danger, info }
 * @param {boolean} isDark - Whether to derive for dark theme
 * @returns {Object} Complete colorSlots with surface/text/border + contrast-adjusted brand colors
 */
function deriveForTheme(brand, isDark) {
  const surface = isDark ? DARK_SURFACE : LIGHT_SURFACE;
  const text = isDark ? DARK_TEXT : LIGHT_TEXT;
  const border = ha(text, 0.12);

  return {
    primary: adjustForContrast(brand.primary, surface, MIN_CONTRAST),
    secondary: adjustForContrast(brand.secondary, surface, MIN_CONTRAST),
    accent: adjustForContrast(brand.accent, surface, MIN_CONTRAST),
    success: adjustForContrast(brand.success, surface, MIN_CONTRAST),
    warning: adjustForContrast(brand.warning, surface, MIN_CONTRAST),
    danger: adjustForContrast(brand.danger, surface, MIN_CONTRAST),
    info: adjustForContrast(brand.info, surface, MIN_CONTRAST),
    surface,
    text,
    border,
  };
}

/**
 * Derive both Light and Dark palettes from brand colors
 * @param {Object} brand - Brand colors { primary, secondary, accent, success, warning, danger, info }
 * @returns {{ light: Object, dark: Object }} Two complete colorSlots sets
 */
export function deriveThemePair(brand) {
  return {
    light: deriveForTheme(brand, false),
    dark: deriveForTheme(brand, true),
  };
}
