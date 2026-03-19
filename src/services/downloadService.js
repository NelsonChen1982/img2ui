/**
 * Download service
 * Generate and export design system artifacts (JSON, SKILL.md, HTML)
 */

import { buildSemanticTokens, buildDS } from './dsBuilder.js';
import { ha, isLight } from './colorUtils.js';

/**
 * Generate the complete JSON output for the design system
 * @param {Object} DS - Design system object
 * @param {Array} annotations - Array of annotation objects
 * @param {Object} COMP_META - Component metadata
 * @param {Object} extractedColors - Array of extracted colors
 * @param {string} [selectedCSSFramework] - CSS framework (tailwind, vanilla, cssvar)
 * @returns {Object} Complete JSON output
 */
export function getJSONOutput(
  DS,
  annotations,
  COMP_META,
  extractedColors,
  selectedCSSFramework,
  holisticResult,
  analysisLog
) {
  const { colors, allColors, typo, spacing, radius, shadows, isDark, colorRatios, fonts } =
    DS;
  const cssFramework = selectedCSSFramework || 'tailwind';

  // Build semantic tokens
  const semanticTokens = buildSemanticTokens(colors, isDark);

  // Holistic data (may be null if AI unavailable)
  const holistic = holisticResult || null;
  const detectedSet = new Set((holistic?.detectedComponents) || []);

  // Analysis log stats
  const logEntries = analysisLog || [];
  const aiCount = logEntries.filter(l => l.method === 'ai' || l.method === 'ai-grouped').length;

  // Build annotated component data
  const annotatedGroups = {};
  for (const a of annotations || []) {
    if (!annotatedGroups[a.typeId]) annotatedGroups[a.typeId] = [];
    annotatedGroups[a.typeId].push(a);
  }

  // All components with full metadata + 4-level confidence
  const ALL_IDS = Object.keys(COMP_META || {});
  const components = {};
  let compConfidenceSum = 0;

  for (const tid of ALL_IDS) {
    const meta = COMP_META[tid];
    const comp = {
      description: meta.description || '',
      anatomy: meta.anatomy || [],
      variants: meta.variants || [],
      sizes: meta.sizes || [],
      states: meta.states || [],
      baseClass: meta.baseClass || '',
      sizeClasses: meta.sizeClasses || {},
      variantClasses: meta.variantClasses || {},
      stateRules: meta.stateRules || {},
      usageRules: meta.usageRules || [],
    };

    // Merge annotation-analyzed styles if present
    const hasAnnotation = !!annotatedGroups[tid];
    const hasAIStyles = hasAnnotation && annotatedGroups[tid].some(a => a.aiCSS);
    const detectedInImage = detectedSet.has(tid);

    if (hasAnnotation) {
      const items = annotatedGroups[tid];
      comp.annotated = true;
      comp.annotationCount = items.length;
      comp.analyzedStyles = items.map((a) => {
        const obj = {};
        if (a.aiCSS) {
          const slots = { ...a.aiCSS };
          if (slots.css) {
            Object.assign(slots, slots.css);
            delete slots.css;
          }
          obj.aiAnalyzed = slots;
        }
        if (a.visual) {
          obj.pixelExtracted = {
            bgColor: a.visual.bgColor || null,
            fgColor: a.visual.fgColor || null,
            inferredSize: a.visual.inferredSize || null,
            estimatedRadius: a.visual.estimatedRadius || null,
          };
        }
        return obj;
      });
    }

    // 4-level confidence per component:
    //   0.9  — annotated + AI-analyzed
    //   0.7  — annotated (local pixel only) OR detected by holistic AI
    //   0.4  — in schema but not seen in image, no annotation
    //   0.2  — fallback minimum
    let compConf;
    if (hasAIStyles) compConf = 0.9;
    else if (hasAnnotation || detectedInImage) compConf = 0.7;
    else compConf = 0.4;

    comp.confidence = compConf;
    comp.detectedInImage = detectedInImage || hasAnnotation;
    compConfidenceSum += compConf;
    components[tid] = comp;
  }

  // Global confidence scores
  const hasColors = (allColors || []).length >= 3;
  const hasAnnotations = (annotations || []).length > 0;
  const holisticConf = holistic?.confidence || 0;
  const confidence = {
    tokens: hasColors ? 0.85 : 0.5,
    semanticTokens: hasColors ? (holisticConf > 0.5 ? 0.8 : 0.7) : 0.4,
    components:
      ALL_IDS.length > 0
        ? Math.round((compConfidenceSum / ALL_IDS.length) * 100) / 100
        : 0,
    holistic: Math.round(holisticConf * 100) / 100,
    overall: Math.round(
      ((hasColors ? 0.85 : 0.5) * 0.3 +
        (ALL_IDS.length > 0 ? compConfidenceSum / ALL_IDS.length : 0) * 0.5 +
        holisticConf * 0.2) * 100
    ) / 100,
  };

  // Generate CSS variable block
  const cssVariables = {
    '--color-primary': colors.primary,
    '--color-secondary': colors.secondary,
    '--color-accent': colors.accent,
    '--color-surface': colors.surface,
    '--color-text': colors.text,
    '--color-border': colors.border,
    '--color-success': colors.success,
    '--color-warning': colors.warning,
    '--color-danger': colors.danger,
    '--color-info': colors.info,
    ...Object.fromEntries(Object.entries(semanticTokens).map(([k, v]) => [`--${k.replace(/\./g, '-')}`, v])),
    '--font-heading': `'${fonts?.heading || 'Inter'}', sans-serif`,
    '--font-body': `'${fonts?.body || 'Inter'}', sans-serif`,
    '--radius-sm': radius.sm,
    '--radius-md': radius.md,
    '--radius-lg': radius.lg,
    '--radius-xl': radius.xl,
    '--radius-full': radius.full,
    '--shadow-sm': shadows.sm,
    '--shadow-md': shadows.md,
    '--shadow-lg': shadows.lg,
    ...Object.fromEntries((spacing || []).map((v, i) => [`--spacing-${i}`, `${v}px`])),
  };

  // Generate Tailwind config snippet
  const tailwindConfig = {
    theme: {
      extend: {
        colors: {
          primary: colors.primary,
          secondary: colors.secondary,
          accent: colors.accent,
          surface: colors.surface,
          border: colors.border,
          success: colors.success,
          warning: colors.warning,
          danger: colors.danger,
          info: colors.info,
        },
        fontFamily: {
          heading: [`'${fonts?.heading || 'Inter'}'`, 'sans-serif'],
          body: [`'${fonts?.body || 'Inter'}'`, 'sans-serif'],
        },
        borderRadius: {
          sm: radius.sm,
          md: radius.md,
          lg: radius.lg,
          xl: radius.xl,
        },
        boxShadow: {
          sm: shadows.sm,
          md: shadows.md,
          lg: shadows.lg,
        },
      },
    },
  };

  return {
    name: DS.name || 'Custom Design System',
    generatedBy: 'img2ui',
    version: '0.1.0',
    mode: isDark ? 'dark' : 'light',
    cssFramework,
    tokens: {
      colors: {
        primary: colors.primary,
        secondary: colors.secondary,
        accent: colors.accent,
        surface: colors.surface,
        text: colors.text,
        border: colors.border,
        success: colors.success,
        warning: colors.warning,
        danger: colors.danger,
        info: colors.info,
      },
      fonts: {
        heading: fonts?.heading || 'Inter',
        body: fonts?.body || 'Inter',
        headingStack: `'${fonts?.heading || 'Inter'}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
        bodyStack: `'${fonts?.body || 'Inter'}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
      },
      typography: typo,
      palette: allColors || [],
      paletteRatios:
        (colorRatios || []).map((r) => Math.round(r * 100) / 100) || [],
      spacing,
      radius,
      shadows,
    },
    semanticTokens,
    styleProfile: holistic?.styleProfile || null,
    globalHints: holistic?.globalHints || null,
    cssVariables,
    tailwindConfig,
    components,
    confidence,
    analysis: {
      aiAnalyzed: aiCount,
      totalAnnotations: (annotations || []).length,
      holisticAvailable: !!holistic,
    },
  };
}

/**
 * Copy JSON to clipboard (with fallback to new window)
 * @param {Object} jsonOutput - JSON output object
 * @returns {Promise<void>}
 */
export async function copyJSON(jsonOutput) {
  const str = JSON.stringify(jsonOutput, null, 2);
  try {
    await navigator.clipboard.writeText(str);
    return true;
  } catch {
    // Fallback: open in new window
    const w = window.open('', '_blank');
    if (w) {
      w.document.write('<pre>' + str + '</pre>');
      w.document.close();
    }
    return false;
  }
}

/**
 * Helper to download file as blob
 * @param {string} content - File content
 * @param {string} filename - Download filename
 * @param {string} mimeType - MIME type
 * @returns {void}
 */
function dl(content, filename, mimeType) {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 200);
  } catch (e) {
    // Fallback: open in new window
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(
        `<html><head><title>${filename}</title></head><body><pre style="white-space:pre-wrap;font-size:13px;font-family:monospace;padding:20px;">${content
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</pre></body></html>`
      );
      w.document.close();
    }
  }
}

/**
 * Download design system as JSON
 * @param {Object} DS - Design system object
 * @param {Array} annotations - Annotations array
 * @param {Object} COMP_META - Component metadata
 * @param {Array} extractedColors - Extracted colors
 * @param {string} cssFramework - CSS framework selection
 * @returns {void}
 */
export function downloadJSON(
  DS,
  annotations,
  COMP_META,
  extractedColors,
  cssFramework
) {
  if (!DS?.colors) {
    alert('Complete pipeline first');
    return;
  }
  const out = getJSONOutput(
    DS,
    annotations,
    COMP_META,
    extractedColors,
    cssFramework
  );
  dl(JSON.stringify(out, null, 2), 'design-system.json', 'application/json');
}

/**
 * Download design system as SKILL.md (agent-readable markdown)
 * @param {Object} DS - Design system object
 * @param {Array} annotations - Annotations array
 * @param {string} lang - Language (en, zh, ja)
 * @param {Object} COMP_META - Component metadata
 * @param {Array} extractedColors - Extracted colors
 * @param {string} cssFramework - CSS framework selection
 * @returns {void}
 */
export function downloadSKILL(
  DS,
  annotations,
  lang,
  COMP_META,
  extractedColors,
  cssFramework,
  holisticResult
) {
  if (!DS?.colors) {
    alert('Complete pipeline first');
    return;
  }

  const { colors, allColors, isDark, typo, spacing, radius, shadows, fonts } = DS;
  const fw = cssFramework || 'tailwind';
  const holistic = holisticResult || null;
  const fwLabel =
    {
      tailwind: 'Tailwind CSS',
      vanilla: 'Vanilla CSS',
      cssvar: 'CSS Custom Properties (Variables)',
    }[fw] || 'Tailwind CSS';

  const semanticTokens = buildSemanticTokens(colors, isDark);
  const headingFont = fonts?.heading || 'Inter';
  const bodyFont = fonts?.body || 'Inter';

  // ── Build the complete SKILL.md content ──
  const L = lang || 'en';
  const lines = [];

  // ─── HEADER ───
  lines.push(`# img2ui — Design System Skill`);
  lines.push(``);
  if (L === 'zh') {
    lines.push(`> 從參考圖片萃取的完整 Design System 規範，供 AI coding agent 直接使用於產生元件。`);
    lines.push(`> **所有色碼、字體、間距、圓角、陰影皆為從圖片分析得來的精確值，請嚴格遵守。**`);
  } else if (L === 'ja') {
    lines.push(`> 参照画像から抽出した完全なデザインシステム仕様。AIコーディングエージェントがコンポーネント生成に直接使用。`);
    lines.push(`> **全ての色、フォント、間隔、角丸、影は画像分析から得た正確な値です。厳密に遵守してください。**`);
  } else {
    lines.push(`> Complete Design System specification extracted from a reference image, ready for AI coding agents.`);
    lines.push(`> **All color codes, fonts, spacing, radius, and shadow values are precise values analyzed from the image. Follow them strictly.**`);
  }
  lines.push(``);
  lines.push(`- **Mode:** ${isDark ? 'Dark' : 'Light'}`);
  lines.push(`- **CSS Framework:** ${fwLabel}`);
  lines.push(`- **Generated:** ${new Date().toISOString().slice(0, 10)}`);
  lines.push(``);

  // ─── STYLE PROFILE (from holistic AI analysis) ───
  if (holistic?.styleProfile) {
    const sp = holistic.styleProfile;
    const gh = holistic.globalHints || {};
    lines.push(`### Style Profile`);
    lines.push(``);
    lines.push(`| Aspect | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Border Style | ${sp.borderStyle} |`);
    lines.push(`| Density | ${sp.density} |`);
    lines.push(`| Mood | ${sp.mood} |`);
    lines.push(`| Elevation | ${sp.elevation} |`);
    lines.push(`| Colorfulness | ${sp.colorfulness} |`);
    if (gh.layoutStyle) lines.push(`| Layout | ${gh.layoutStyle} |`);
    if (gh.primaryUsage) lines.push(`| Primary Color Usage | ${gh.primaryUsage} |`);
    lines.push(``);
  }

  // ─── HOW TO USE ───
  lines.push(`---`);
  lines.push(``);
  lines.push(L === 'zh' ? `## 使用方式` : L === 'ja' ? `## 使用方法` : `## How to Use`);
  lines.push(``);
  if (L === 'zh') {
    lines.push(`1. 將此檔案放在專案根目錄的 \`.claude/skills/\` 或 \`.cursorrules\` 或 \`codex.md\``);
    lines.push(`2. 在 agent 指令中加入：「請嚴格依照 SKILL.md 的 Design System 來實作所有 UI 元件」`);
    lines.push(`3. Agent 會根據下方的 token 值、元件結構、視覺參數自動產生對應元件`);
    lines.push(`4. **不要猜測值** — 所有顏色、字體、間距請使用下方明確定義的值`);
  } else if (L === 'ja') {
    lines.push(`1. このファイルを \`.claude/skills/\` または \`.cursorrules\` または \`codex.md\` に配置`);
    lines.push(`2. エージェントに指示：「SKILL.mdのデザインシステムに厳密に従ってUI実装して」`);
    lines.push(`3. 以下のトークン値・コンポーネント構造・視覚パラメータに基づいて自動生成`);
    lines.push(`4. **値を推測しないこと** — 全ての色・フォント・間隔は以下の定義値を使用`);
  } else {
    lines.push(`1. Place this file in \`.claude/skills/\` or \`.cursorrules\` or \`codex.md\``);
    lines.push(`2. Instruct the agent: "Strictly follow the Design System in SKILL.md for all UI implementation"`);
    lines.push(`3. The agent will use the token values, component structures, and visual parameters below`);
    lines.push(`4. **Do NOT guess values** — use the exact colors, fonts, spacing defined below`);
  }
  lines.push(``);

  // ─── SECTION 1: DESIGN TOKENS ───
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 1. Design Tokens`);
  lines.push(``);

  // Colors
  lines.push(`### 1.1 Colors`);
  lines.push(``);
  lines.push(`| Token | Hex | Usage |`);
  lines.push(`|-------|-----|-------|`);
  lines.push(`| \`primary\` | \`${colors.primary}\` | Main brand color, CTA buttons, active states |`);
  lines.push(`| \`secondary\` | \`${colors.secondary}\` | Secondary actions, accents |`);
  lines.push(`| \`accent\` | \`${colors.accent}\` | Highlights, decorative elements |`);
  lines.push(`| \`surface\` | \`${colors.surface}\` | Page background, card backgrounds |`);
  lines.push(`| \`text\` | \`${colors.text}\` | Primary text color |`);
  lines.push(`| \`border\` | \`${colors.border}\` | Borders, dividers |`);
  lines.push(`| \`success\` | \`${colors.success}\` | Success states, confirmations |`);
  lines.push(`| \`warning\` | \`${colors.warning}\` | Warning states, caution |`);
  lines.push(`| \`danger\` | \`${colors.danger}\` | Error states, destructive actions |`);
  lines.push(`| \`info\` | \`${colors.info}\` | Informational states |`);
  lines.push(``);

  // Full palette
  if (allColors && allColors.length > 0) {
    lines.push(`**Full Palette (by frequency):**`);
    lines.push(``);
    lines.push((allColors || []).map((hex, i) => {
      const pct = DS.colorRatios?.[i] ? Math.round(DS.colorRatios[i] * 100) + '%' : '';
      return `\`${hex}\`${pct ? ' (' + pct + ')' : ''}`;
    }).join(' · '));
    lines.push(``);
  }

  // Semantic tokens
  lines.push(`### 1.2 Semantic Tokens`);
  lines.push(``);
  lines.push(L === 'zh'
    ? `> 這些語意化 token 是從基礎色衍生的，用於特定 UI 場景。`
    : L === 'ja'
      ? `> 基本色から派生したセマンティックトークン。特定のUIシーンで使用。`
      : `> Derived from base colors for specific UI contexts. Use these instead of raw colors.`
  );
  lines.push(``);
  lines.push(`| Token | Value | When to use |`);
  lines.push(`|-------|-------|-------------|`);
  lines.push(`| \`bg.page\` | \`${semanticTokens['bg.page']}\` | Main page background |`);
  lines.push(`| \`bg.card\` | \`${semanticTokens['bg.card']}\` | Card, dialog backgrounds |`);
  lines.push(`| \`bg.elevated\` | \`${semanticTokens['bg.elevated']}\` | Elevated surfaces (dropdown, tooltip) |`);
  lines.push(`| \`bg.sunken\` | \`${semanticTokens['bg.sunken']}\` | Inset areas, code blocks |`);
  lines.push(`| \`bg.overlay\` | \`${semanticTokens['bg.overlay']}\` | Modal overlay backdrop |`);
  lines.push(`| \`text.primary\` | \`${semanticTokens['text.primary']}\` | Main body text |`);
  lines.push(`| \`text.secondary\` | \`${semanticTokens['text.secondary']}\` | Subtitles, helper text |`);
  lines.push(`| \`text.disabled\` | \`${semanticTokens['text.disabled']}\` | Disabled labels |`);
  lines.push(`| \`text.inverse\` | \`${semanticTokens['text.inverse']}\` | Text on dark/light inverse bg |`);
  lines.push(`| \`text.onAction\` | \`${semanticTokens['text.onAction']}\` | Text on primary-colored buttons |`);
  lines.push(`| \`border.default\` | \`${semanticTokens['border.default']}\` | Default border color |`);
  lines.push(`| \`border.strong\` | \`${semanticTokens['border.strong']}\` | Emphasized borders |`);
  lines.push(`| \`border.focus\` | \`${semanticTokens['border.focus']}\` | Focus ring color |`);
  lines.push(`| \`action.primary\` | \`${semanticTokens['action.primary']}\` | Primary button bg |`);
  lines.push(`| \`action.primaryHover\` | \`${semanticTokens['action.primaryHover']}\` | Primary button hover |`);
  lines.push(`| \`action.secondary\` | \`${semanticTokens['action.secondary']}\` | Secondary button bg |`);
  lines.push(`| \`action.disabled\` | \`${semanticTokens['action.disabled']}\` | Disabled button bg |`);
  lines.push(`| \`state.success\` | \`${semanticTokens['state.success']}\` | Success feedback |`);
  lines.push(`| \`state.warning\` | \`${semanticTokens['state.warning']}\` | Warning feedback |`);
  lines.push(`| \`state.danger\` | \`${semanticTokens['state.danger']}\` | Error feedback |`);
  lines.push(`| \`state.info\` | \`${semanticTokens['state.info']}\` | Info feedback |`);
  lines.push(``);

  // Typography
  lines.push(`### 1.3 Typography`);
  lines.push(``);
  lines.push(`| Font Role | Family | Google Fonts Import |`);
  lines.push(`|-----------|--------|---------------------|`);
  lines.push(`| Heading (Display, H1, H2) | \`${headingFont}\` | \`@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;500;600;700;800&display=swap')\` |`);
  lines.push(`| Body (Body, Small, Caption) | \`${bodyFont}\` | \`@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(bodyFont)}:wght@400;500;600;700&display=swap')\` |`);
  lines.push(``);
  lines.push(`**Type Scale:**`);
  lines.push(``);
  lines.push(`| Level | Size | Weight | Line Height | Font |`);
  lines.push(`|-------|------|--------|-------------|------|`);
  (typo || []).forEach(t => {
    const isHead = ['Display', 'H1', 'H2'].includes(t.name);
    lines.push(`| ${t.name} | ${t.size} | ${t.weight} | ${t.lh} | ${isHead ? headingFont : bodyFont} |`);
  });
  lines.push(``);

  // Spacing
  lines.push(`### 1.4 Spacing Scale`);
  lines.push(``);
  lines.push(`| Index | Value | Common Use |`);
  lines.push(`|-------|-------|-----------|`);
  const spacingLabels = ['Hairline gap', 'Icon gap', 'Form field gap', 'Section padding', 'Card padding', 'Group gap', 'Section gap', 'Page margin'];
  (spacing || []).forEach((v, i) => {
    lines.push(`| ${i} | \`${v}px\` | ${spacingLabels[i] || ''} |`);
  });
  lines.push(``);

  // Radius
  lines.push(`### 1.5 Border Radius`);
  lines.push(``);
  lines.push(`| Token | Value | Usage |`);
  lines.push(`|-------|-------|-------|`);
  lines.push(`| \`sm\` | \`${radius.sm}\` | Badges, small buttons, tags |`);
  lines.push(`| \`md\` | \`${radius.md}\` | Buttons, inputs, cards |`);
  lines.push(`| \`lg\` | \`${radius.lg}\` | Cards, dialogs, modals |`);
  lines.push(`| \`xl\` | \`${radius.xl}\` | Hero sections, large containers |`);
  lines.push(`| \`full\` | \`${radius.full}\` | Pill buttons, avatars, badges |`);
  lines.push(``);

  // Shadows
  lines.push(`### 1.6 Shadows`);
  lines.push(``);
  lines.push(`| Token | Value | Usage |`);
  lines.push(`|-------|-------|-------|`);
  lines.push(`| \`sm\` | \`${shadows.sm}\` | Cards, subtle elevation |`);
  lines.push(`| \`md\` | \`${shadows.md}\` | Dropdowns, popovers |`);
  lines.push(`| \`lg\` | \`${shadows.lg}\` | Modals, toasts, floating elements |`);
  lines.push(``);

  // ─── SECTION 2: FRAMEWORK-SPECIFIC CODE ───
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 2. Ready-to-Use Code`);
  lines.push(``);

  if (fw === 'cssvar' || fw === 'vanilla') {
    lines.push(`### CSS Custom Properties`);
    lines.push(``);
    lines.push('```css');
    lines.push(`:root {`);
    lines.push(`  /* Colors */`);
    lines.push(`  --color-primary: ${colors.primary};`);
    lines.push(`  --color-secondary: ${colors.secondary};`);
    lines.push(`  --color-accent: ${colors.accent};`);
    lines.push(`  --color-surface: ${colors.surface};`);
    lines.push(`  --color-text: ${colors.text};`);
    lines.push(`  --color-border: ${colors.border};`);
    lines.push(`  --color-success: ${colors.success};`);
    lines.push(`  --color-warning: ${colors.warning};`);
    lines.push(`  --color-danger: ${colors.danger};`);
    lines.push(`  --color-info: ${colors.info};`);
    lines.push(``);
    lines.push(`  /* Semantic */`);
    Object.entries(semanticTokens).forEach(([k, v]) => {
      lines.push(`  --${k.replace(/\./g, '-')}: ${v};`);
    });
    lines.push(``);
    lines.push(`  /* Typography */`);
    lines.push(`  --font-heading: '${headingFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;`);
    lines.push(`  --font-body: '${bodyFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;`);
    lines.push(``);
    lines.push(`  /* Spacing */`);
    (spacing || []).forEach((v, i) => {
      lines.push(`  --spacing-${i}: ${v}px;`);
    });
    lines.push(``);
    lines.push(`  /* Radius */`);
    lines.push(`  --radius-sm: ${radius.sm};`);
    lines.push(`  --radius-md: ${radius.md};`);
    lines.push(`  --radius-lg: ${radius.lg};`);
    lines.push(`  --radius-xl: ${radius.xl};`);
    lines.push(`  --radius-full: ${radius.full};`);
    lines.push(``);
    lines.push(`  /* Shadows */`);
    lines.push(`  --shadow-sm: ${shadows.sm};`);
    lines.push(`  --shadow-md: ${shadows.md};`);
    lines.push(`  --shadow-lg: ${shadows.lg};`);
    lines.push(`}`);
    lines.push('```');
    lines.push(``);
  }

  if (fw === 'tailwind') {
    lines.push(`### tailwind.config.js`);
    lines.push(``);
    lines.push('```js');
    lines.push(`/** @type {import('tailwindcss').Config} */`);
    lines.push(`export default {`);
    lines.push(`  theme: {`);
    lines.push(`    extend: {`);
    lines.push(`      colors: {`);
    lines.push(`        primary: '${colors.primary}',`);
    lines.push(`        secondary: '${colors.secondary}',`);
    lines.push(`        accent: '${colors.accent}',`);
    lines.push(`        surface: '${colors.surface}',`);
    lines.push(`        border: '${colors.border}',`);
    lines.push(`        success: '${colors.success}',`);
    lines.push(`        warning: '${colors.warning}',`);
    lines.push(`        danger: '${colors.danger}',`);
    lines.push(`        info: '${colors.info}',`);
    lines.push(`      },`);
    lines.push(`      textColor: {`);
    lines.push(`        DEFAULT: '${colors.text}',`);
    lines.push(`        secondary: '${semanticTokens['text.secondary']}',`);
    lines.push(`        disabled: '${semanticTokens['text.disabled']}',`);
    lines.push(`        inverse: '${semanticTokens['text.inverse']}',`);
    lines.push(`        onAction: '${semanticTokens['text.onAction']}',`);
    lines.push(`      },`);
    lines.push(`      backgroundColor: {`);
    lines.push(`        page: '${semanticTokens['bg.page']}',`);
    lines.push(`        card: '${semanticTokens['bg.card']}',`);
    lines.push(`        elevated: '${semanticTokens['bg.elevated']}',`);
    lines.push(`        sunken: '${semanticTokens['bg.sunken']}',`);
    lines.push(`        overlay: '${semanticTokens['bg.overlay']}',`);
    lines.push(`      },`);
    lines.push(`      fontFamily: {`);
    lines.push(`        heading: ['${headingFont}', 'sans-serif'],`);
    lines.push(`        body: ['${bodyFont}', 'sans-serif'],`);
    lines.push(`      },`);
    lines.push(`      borderRadius: {`);
    lines.push(`        sm: '${radius.sm}',`);
    lines.push(`        DEFAULT: '${radius.md}',`);
    lines.push(`        lg: '${radius.lg}',`);
    lines.push(`        xl: '${radius.xl}',`);
    lines.push(`      },`);
    lines.push(`      boxShadow: {`);
    lines.push(`        sm: '${shadows.sm}',`);
    lines.push(`        DEFAULT: '${shadows.md}',`);
    lines.push(`        lg: '${shadows.lg}',`);
    lines.push(`      },`);
    lines.push(`      spacing: {`);
    (spacing || []).forEach((v, i) => {
      lines.push(`        '${i}': '${v}px',`);
    });
    lines.push(`      },`);
    lines.push(`    },`);
    lines.push(`  },`);
    lines.push(`}`);
    lines.push('```');
    lines.push(``);
  }

  // All frameworks: also show CSS import for fonts
  lines.push(`### Font Import`);
  lines.push(``);
  lines.push('```html');
  const fontFamilies = [...new Set([headingFont, bodyFont])];
  const fontUrl = `https://fonts.googleapis.com/css2?${fontFamilies.map(f => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800`).join('&')}&display=swap`;
  lines.push(`<link rel="preconnect" href="https://fonts.googleapis.com">`);
  lines.push(`<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`);
  lines.push(`<link href="${fontUrl}" rel="stylesheet">`);
  lines.push('```');
  lines.push(``);

  // ─── SECTION 3: COMPONENTS ───
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 3. Component Specifications`);
  lines.push(``);
  lines.push(L === 'zh'
    ? `> 以下 25 個元件規範包含 HTML 結構、變體、狀態規則和 Tailwind/CSS class。AI agent 實作時應嚴格遵守 anatomy 和 class 定義。`
    : L === 'ja'
      ? `> 以下25のコンポーネント仕様にはHTML構造、バリアント、状態ルール、Tailwind/CSSクラスが含まれます。AI agentはanatomyとclass定義に厳密に従ってください。`
      : `> 25 component specs below include HTML structure, variants, state rules, and Tailwind/CSS classes. AI agents should strictly follow the anatomy and class definitions.`
  );
  lines.push(``);

  // Components section
  const groups = {};
  for (const a of annotations || []) {
    if (!groups[a.typeId]) groups[a.typeId] = [];
    groups[a.typeId].push(a);
  }

  const allIDs = Object.keys(COMP_META || {});
  for (const tid of allIDs) {
    const meta = COMP_META[tid];
    const isAnnotated = groups[tid]?.length > 0;

    lines.push(`### ${tid.charAt(0).toUpperCase() + tid.slice(1)}${isAnnotated ? ' ✦' : ''}`);
    lines.push(`${meta.description}`);
    lines.push(``);

    if (meta.anatomy) {
      lines.push(`**Anatomy:**`);
      meta.anatomy.forEach((part) => lines.push(`- \`${part}\``));
      lines.push(``);
    }

    // Base class
    if (meta.baseClass) {
      lines.push(`**Base class:** \`${meta.baseClass}\``);
      lines.push(``);
    }

    if (meta.variants && meta.variants.length > 0) {
      lines.push(`**Variants:** ${meta.variants.join(', ')}`);
      lines.push(``);
    }

    // Variant classes (the actual implementation!)
    if (meta.variantClasses && Object.keys(meta.variantClasses).length > 0) {
      lines.push(`**Variant Classes:**`);
      for (const [v, cls] of Object.entries(meta.variantClasses)) {
        if (cls) lines.push(`- \`${v}\`: \`${cls}\``);
      }
      lines.push(``);
    }

    // Sizes
    if (meta.sizes && meta.sizes.length > 0) {
      lines.push(`**Sizes:** ${meta.sizes.join(', ')}`);
      if (meta.sizeClasses && Object.keys(meta.sizeClasses).length > 0) {
        for (const [sz, cls] of Object.entries(meta.sizeClasses)) {
          lines.push(`- \`${sz}\`: \`${cls}\``);
        }
      }
      lines.push(``);
    }

    // State rules
    if (meta.stateRules && Object.keys(meta.stateRules).length > 0) {
      lines.push(`**State Rules:**`);
      for (const [st, rule] of Object.entries(meta.stateRules)) {
        lines.push(`- \`${st}\`: ${rule}`);
      }
      lines.push(``);
    }

    // Usage rules
    if (meta.usageRules && meta.usageRules.length > 0) {
      lines.push(`**Usage Rules:**`);
      meta.usageRules.forEach((r) => lines.push(`- ${r}`));
      lines.push(``);
    }

    // Annotated styles if present (AI-analyzed from the reference image)
    if (isAnnotated) {
      const items = groups[tid];
      lines.push(`**🔍 Annotated Styles from Reference Image (${items.length}):**`);
      lines.push(``);
      lines.push(L === 'zh'
        ? `> 以下樣式是從參考圖片中 AI 辨識出的實際視覺屬性。請優先使用這些值。`
        : L === 'ja'
          ? `> 以下のスタイルは参照画像からAIが認識した実際の視覚属性です。これらの値を優先使用してください。`
          : `> These styles were AI-analyzed from the actual reference image. Prefer these values over defaults.`
      );
      lines.push(``);
      items.forEach((a, i) => {
        const label = `Variant ${i + 1}` + (a.aiCSS?.variant ? ` — ${a.aiCSS.variant}` : '');
        lines.push(`**${label}:**`);
        if (a.aiCSS) {
          const slots = { ...a.aiCSS };
          delete slots.elementType;
          delete slots.innerElements;
          if (slots.css) {
            Object.assign(slots, slots.css);
            delete slots.css;
          }
          lines.push('```json', JSON.stringify(slots, null, 2), '```', '');
        } else if (a.visual) {
          lines.push(
            `- bg: \`${a.visual.bgColor}\`, fg: \`${a.visual.fgColor}\`, radius: ~${a.visual.estimatedRadius}px, size: ${a.visual.inferredSize}`,
            ''
          );
        }
      });
    }
    lines.push('');
  }

  // ─── SECTION 4: IMPLEMENTATION RULES ───
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 4. Implementation Rules`);
  lines.push(``);
  if (L === 'zh') {
    lines.push(`1. **顏色**：所有元件必須使用上方定義的色碼，不可使用預設色或自行猜測`);
    lines.push(`2. **字體**：標題元素使用 \`${headingFont}\`，內文使用 \`${bodyFont}\`。必須引入 Google Fonts`);
    lines.push(`3. **圓角**：根據元件大小選擇 sm/md/lg/xl/full，不要硬編碼像素值`);
    lines.push(`4. **間距**：使用 spacing scale 中的值，保持一致性`);
    lines.push(`5. **陰影**：僅使用 sm/md/lg 三級，不要自訂 box-shadow`);
    lines.push(`6. **暗色模式**：此系統為${isDark ? '暗色' : '亮色'}主題，背景使用 \`surface\`，文字使用 \`text\``);
    lines.push(`7. **狀態顏色**：success/warning/danger/info 用於 alert、badge、toast 等回饋元件`);
    lines.push(`8. **按鈕文字色**：主色按鈕上的文字使用 \`text.onAction\` = \`${semanticTokens['text.onAction']}\``);
    lines.push(`9. **Focus 狀態**：所有可互動元素需有 focus ring，使用 \`border.focus\` = \`${semanticTokens['border.focus']}\``);
    lines.push(`10. **禁用狀態**：使用 40% opacity + pointer-events: none`);
  } else if (L === 'ja') {
    lines.push(`1. **色**：全コンポーネントは上記定義の色コードを使用。デフォルト色や推測値を使わないこと`);
    lines.push(`2. **フォント**：見出しは \`${headingFont}\`、本文は \`${bodyFont}\`。Google Fontsのインポート必須`);
    lines.push(`3. **角丸**：コンポーネントサイズに応じてsm/md/lg/xl/fullを選択。ハードコードしないこと`);
    lines.push(`4. **間隔**：spacing scaleの値を使用し、一貫性を保つ`);
    lines.push(`5. **影**：sm/md/lgの3段階のみ使用。カスタムbox-shadow禁止`);
    lines.push(`6. **テーマ**：${isDark ? 'ダーク' : 'ライト'}テーマ。背景は \`surface\`、テキストは \`text\` を使用`);
    lines.push(`7. **状態色**：success/warning/danger/infoはalert、badge、toastなどのフィードバックコンポーネントに使用`);
    lines.push(`8. **ボタンテキスト色**：primaryボタン上のテキストは \`text.onAction\` = \`${semanticTokens['text.onAction']}\``);
    lines.push(`9. **Focus状態**：全インタラクティブ要素にfocus ringが必要。\`border.focus\` = \`${semanticTokens['border.focus']}\` を使用`);
    lines.push(`10. **無効状態**：opacity 40% + pointer-events: none`);
  } else {
    lines.push(`1. **Colors**: All components MUST use the color codes defined above. Never use default colors or guess values`);
    lines.push(`2. **Fonts**: Headings use \`${headingFont}\`, body text uses \`${bodyFont}\`. Import from Google Fonts is required`);
    lines.push(`3. **Border Radius**: Choose sm/md/lg/xl/full based on component size. Don't hardcode pixel values`);
    lines.push(`4. **Spacing**: Use values from the spacing scale above for consistency`);
    lines.push(`5. **Shadows**: Only use sm/md/lg levels. Don't create custom box-shadow values`);
    lines.push(`6. **Theme**: This is a ${isDark ? 'dark' : 'light'} theme. Use \`surface\` for backgrounds, \`text\` for text`);
    lines.push(`7. **State Colors**: success/warning/danger/info are for feedback components (alerts, badges, toasts)`);
    lines.push(`8. **Button Text**: Text on primary buttons uses \`text.onAction\` = \`${semanticTokens['text.onAction']}\``);
    lines.push(`9. **Focus State**: All interactive elements need a focus ring using \`border.focus\` = \`${semanticTokens['border.focus']}\``);
    lines.push(`10. **Disabled State**: Use 40% opacity + pointer-events: none`);
  }
  lines.push(``);

  lines.push(
    `---`,
    `*Generated by img2ui · v2.1 · ${new Date().toISOString().slice(0, 10)}*`
  );

  const md = lines.join('\n');
  dl(md, 'SKILL.md', 'text/markdown');
}

/**
 * Download UI Kit as HTML preview
 * @param {Object} DS - Design system object
 * @param {string} uiKitHtml - Rendered UI kit HTML
 * @returns {void}
 */
export function downloadHTML(DS, uiKitHtml) {
  if (!uiKitHtml) {
    alert('Generate UI Kit first');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>UI Kit Preview — img2ui</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; background: #f5f5f5; padding: 24px; }
  .kit-section { border-radius: 16px; padding: 24px; margin-bottom: 16px; }
  .kit-section-label { font-size: 10px; font-weight: 700; letter-spacing: .1em; margin-bottom: 16px; opacity: .4; }
  .ratio-bar { height: 28px; border-radius: 6px; display: flex; overflow: hidden; border: 1px solid rgba(0,0,0,.1); }
  .ratio-seg { display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; min-width: 20px; }
  input, select { font-family: inherit; }
</style>
</head>
<body>
<div style="max-width: 960px; margin: 0 auto;">
  <div style="text-align:center;margin-bottom:20px;">
    <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#999;margin-bottom:4px;">GENERATED BY img2ui</div>
    <h1 style="font-size:22px;font-weight:800;color:#222;">UI Kit Preview</h1>
  </div>
  ${uiKitHtml}
</div>
</body>
</html>`;

  dl(html, 'ui-kit-preview.html', 'text/html');
}
