/**
 * Figma Plugin JSON Builder
 * Generates a structured JSON that a Figma plugin can consume
 * to create editable Figma nodes from design tokens.
 *
 * Output follows the spec in PROMPT-FOR-IMG2UI.md:
 *   { source, version, nodes: [root FRAME with auto-layout children] }
 */

import { isLight, ha, darken, safeTextColor, readableOnLight } from './colorUtils.js'

// ─── Color helper: always output hex ───

function toHexColor(c) {
  if (!c) return '#000000'
  if (c.startsWith('#')) return c
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return c
  const [, r, g, b] = m
  return '#' + [r, g, b].map(v => parseInt(v).toString(16).padStart(2, '0')).join('')
}

function toOpacity(c) {
  if (!c) return 1
  const m = c.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/)
  return m ? parseFloat(m[1]) : 1
}

function hexFill(c) {
  return { hex: toHexColor(c) }
}

// ─── Helpers ───

function text(content, opts = {}) {
  const node = {
    type: 'TEXT',
    content,
    font: { family: opts.family || 'Inter', weight: opts.weight || 400, size: opts.size || 11 },
    color: opts.color || '#1a1a1a',
  }
  if (opts.letterSpacing) node.letterSpacing = opts.letterSpacing
  if (opts.lineHeight) node.lineHeight = opts.lineHeight
  if (opts.fill) node.layoutChild = { hug: 'fill' }
  if (opts.opacity != null) node.opacity = opts.opacity
  if (opts.textAlign) node.textAlign = opts.textAlign
  return node
}

function rect(name, w, h, fills, opts = {}) {
  const node = { type: 'RECT', name, size: { w, h }, fills }
  if (opts.cornerRadius != null) node.cornerRadius = opts.cornerRadius
  if (opts.layoutChild) node.layoutChild = opts.layoutChild
  if (opts.strokes) node.strokes = opts.strokes
  return node
}

function frame(name, layout, children, opts = {}) {
  const node = { type: 'FRAME', name, layout, children }
  if (opts.fills) node.fills = opts.fills
  if (opts.cornerRadius != null) node.cornerRadius = opts.cornerRadius
  if (opts.strokes) node.strokes = opts.strokes
  if (opts.effects) node.effects = opts.effects
  if (opts.size) node.size = opts.size
  if (opts.layoutChild) node.layoutChild = opts.layoutChild
  if (opts.clip != null) node.clip = opts.clip
  if (opts.opacity != null) node.opacity = opts.opacity
  return node
}

function sectionLabel(label, color) {
  return text(label.toUpperCase(), { weight: 700, size: 10, color, letterSpacing: 0.08 })
}

function subLabel(label, color) {
  return text(label, { weight: 600, size: 9, color: color || '#aaaaaa', letterSpacing: 0.06 })
}

function sectionCard(name, primaryColor, children, opts = {}) {
  const bg = opts.dark
    ? [{ hex: '#0F0F0F' }]
    : [{ hex: '#EBEBEB' }]
  return frame(name, { mode: 'VERTICAL', gap: 12, padding: [16, 18, 16, 18] }, [
    sectionLabel(name, primaryColor),
    ...children,
  ], {
    fills: bg,
    cornerRadius: 14,
    strokes: [{ width: 1, color: '#E0E0E0' }],
    layoutChild: { hug: 'fill' },
    ...opts,
  })
}

function btnNode(label, bg, fg, opts = {}) {
  const pad = opts.small ? [4, 10, 4, 10] : [6, 14, 6, 14]
  const sz = opts.small ? 10 : 11
  const r = opts.small ? 6 : 8
  const n = frame(`Button/${label}`, { mode: 'HORIZONTAL', padding: pad, align: 'center', justify: 'center' }, [
    text(label, { weight: 600, size: sz, color: fg }),
  ], { cornerRadius: opts.cornerRadius || r })
  if (bg) n.fills = [{ hex: toHexColor(bg) }]
  if (opts.strokes) n.strokes = opts.strokes
  return n
}

// ─── Section builders ───

function buildColorPalette(DS) {
  const { colors } = DS
  const slots = ['primary', 'secondary', 'accent', 'success', 'warning', 'danger', 'info', 'surface', 'text', 'border']
  const swatches = slots.filter(s => colors[s]).map(slot => {
    const hex = colors[slot]
    return frame(`Swatch/${slot}`, { mode: 'VERTICAL', gap: 4 }, [
      rect('Color', 78, 48, [{ hex }], { cornerRadius: 8 }),
      text(slot.charAt(0).toUpperCase() + slot.slice(1), { weight: 600, size: 10, color: DS.isDark ? '#cccccc' : '#1a1a1a' }),
      text(hex, { weight: 400, size: 9, color: '#999999' }),
    ], { size: { w: 78 } })
  })

  return sectionCard('Color Palette', colors.primary, [
    frame('Swatches', { mode: 'HORIZONTAL', gap: 10, wrap: true }, swatches, { layoutChild: { hug: 'fill' } }),
  ], { dark: DS.isDark })
}

function buildTypography(DS) {
  const { colors, typography } = DS
  const hf = typography?.headingFont || 'Inter'
  const bf = typography?.bodyFont || 'Inter'
  const scale = typography?.scale || [32, 24, 20, 16, 14, 12]
  const levels = ['H1', 'H2', 'H3', 'Body', 'Small', 'Caption']
  const tc = DS.isDark ? '#eeeeee' : '#1a1a1a'

  const items = levels.map((level, i) => {
    const sz = scale[i] || 14
    const isHeading = i < 3
    return frame(`Type/${level}`, { mode: 'HORIZONTAL', gap: 12, align: 'center' }, [
      text(`${sz}px`, { weight: 400, size: 10, color: '#aaaaaa' }),
      text(`${level} — ${isHeading ? hf : bf}`, { weight: isHeading ? 700 : 400, size: sz, color: tc, family: isHeading ? hf : bf, fill: true }),
    ], { layoutChild: { hug: 'fill' } })
  })

  return sectionCard('Typography', colors.primary, items, { dark: DS.isDark })
}

function buildButtons(DS) {
  const { colors } = DS
  const p = colors.primary
  const pt = safeTextColor(p, isLight(p) ? colors.text : '#ffffff')
  const s = colors.secondary
  const st = safeTextColor(s, isLight(s) ? colors.text : '#ffffff')
  const a = colors.accent
  const at = safeTextColor(a, isLight(a) ? colors.text : '#ffffff')

  return sectionCard('Button', colors.primary, [
    subLabel('VARIANTS'),
    frame('Btn/Variants', { mode: 'HORIZONTAL', gap: 8, wrap: true, align: 'center' }, [
      btnNode('Primary', p, pt),
      btnNode('Secondary', s, st),
      btnNode('Outline', null, p, { strokes: [{ width: 1.5, color: p }] }),
      btnNode('Soft', ha(p, 0.1), DS.isDark ? p : readableOnLight(p)),
      btnNode('Accent', a, at),
    ], { layoutChild: { hug: 'fill' } }),
    subLabel('SIZES'),
    frame('Btn/Sizes', { mode: 'HORIZONTAL', gap: 8, align: 'center' }, [
      btnNode('XS', p, pt, { small: true, cornerRadius: 5 }),
      btnNode('SM', p, pt, { small: true }),
      btnNode('MD', p, pt),
      btnNode('LG', p, pt, { small: false }),
    ], { layoutChild: { hug: 'fill' } }),
  ], { dark: DS.isDark })
}

function buildNavbar(DS) {
  const { colors } = DS
  const p = colors.primary
  const pt = safeTextColor(p, isLight(p) ? colors.text : '#ffffff')

  const darkNav = frame('Navbar/Dark', { mode: 'HORIZONTAL', padding: [12, 16, 12, 16], align: 'center', justify: 'between' }, [
    text('Brand', { weight: 800, size: 15, color: pt, family: DS.typography?.headingFont || 'Inter' }),
    frame('Links', { mode: 'HORIZONTAL', gap: 16, align: 'center' }, [
      text('Home', { weight: 600, size: 11, color: pt }),
      text('Product', { weight: 400, size: 11, color: ha(pt, 0.55) }),
      text('Pricing', { weight: 400, size: 11, color: ha(pt, 0.55) }),
    ]),
    frame('Actions', { mode: 'HORIZONTAL', gap: 6, align: 'center' }, [
      btnNode('Login', null, pt, { small: true, strokes: [{ width: 1, color: ha(pt, 0.3) }] }),
      btnNode('Sign up', pt, p, { small: true }),
    ]),
  ], { fills: [{ hex: p }], cornerRadius: 10, layoutChild: { hug: 'fill' } })

  const lightNav = frame('Navbar/Light', { mode: 'HORIZONTAL', padding: [12, 16, 12, 16], align: 'center', justify: 'between' }, [
    text('Brand', { weight: 700, size: 15, color: p, family: DS.typography?.headingFont || 'Inter' }),
    frame('Links', { mode: 'HORIZONTAL', gap: 16, align: 'center' }, [
      text('Home', { weight: 600, size: 11, color: p }),
      text('Product', { weight: 400, size: 11, color: DS.isDark ? '#888888' : '#666666' }),
      text('Pricing', { weight: 400, size: 11, color: DS.isDark ? '#888888' : '#666666' }),
    ]),
    btnNode('CTA', p, pt, { small: true }),
  ], {
    fills: [{ hex: DS.isDark ? '#1A1A1A' : '#ffffff' }],
    cornerRadius: 10,
    strokes: [{ width: 1, color: colors.border }],
    layoutChild: { hug: 'fill' },
  })

  return sectionCard('Navbar / Header', colors.primary, [darkNav, lightNav], { dark: DS.isDark })
}

function buildCards(DS) {
  const { colors } = DS
  const p = colors.primary
  const s = colors.secondary
  const st = safeTextColor(s, isLight(s) ? colors.text : '#ffffff')
  const hf = DS.typography?.headingFont || 'Inter'
  const tc = DS.isDark ? '#eeeeee' : '#1a1a1a'
  const sub = DS.isDark ? '#888888' : '#999999'

  const accentCard = frame('Card/Accent', { mode: 'VERTICAL', gap: 8, padding: [16, 16, 16, 16] }, [
    text('ACCENT', { weight: 700, size: 10, color: p }),
    text('Card Title', { weight: 700, size: 15, color: tc, family: hf }),
    text('Description text for this card element.', { weight: 400, size: 12, color: sub, lineHeight: 1.5, fill: true }),
    btnNode('Action', ha(p, 0.1), DS.isDark ? p : readableOnLight(p), { small: true }),
  ], {
    size: { w: 260 },
    cornerRadius: 12,
    strokes: [{ width: 1, color: colors.border }],
  })

  const elevatedCard = frame('Card/Elevated', { mode: 'VERTICAL', gap: 8, padding: [16, 16, 16, 16] }, [
    text('ELEVATED', { weight: 700, size: 10, color: s }),
    text('Card Title', { weight: 700, size: 15, color: tc, family: hf }),
    text('Description text for this card element.', { weight: 400, size: 12, color: sub, lineHeight: 1.5, fill: true }),
    frame('Card/Actions', { mode: 'HORIZONTAL', gap: 6 }, [
      btnNode('Primary', s, st, { small: true }),
      btnNode('Cancel', null, DS.isDark ? '#888888' : '#666666', { small: true, strokes: [{ width: 1, color: colors.border }] }),
    ]),
  ], {
    size: { w: 260 },
    cornerRadius: 12,
    fills: [{ hex: DS.isDark ? '#1A1A1A' : '#ffffff' }],
    effects: [{ type: 'shadow', x: 0, y: 4, blur: 12, color: '#00000014' }],
  })

  const brandCard = frame('Card/Brand', { mode: 'VERTICAL', gap: 8, padding: [16, 16, 16, 16] }, [
    text('BRAND', { weight: 700, size: 10, color: '#ffffff80' }),
    text('Card Title', { weight: 700, size: 15, color: '#ffffff', family: hf }),
    text('Description text for this card element.', { weight: 400, size: 12, color: '#ffffffa6', lineHeight: 1.5, fill: true }),
  ], { size: { w: 260 }, cornerRadius: 12, fills: [{ hex: p }] })

  return sectionCard('Card', colors.primary, [
    frame('Cards', { mode: 'HORIZONTAL', gap: 12, wrap: true }, [accentCard, elevatedCard, brandCard], { layoutChild: { hug: 'fill' } }),
  ], { dark: DS.isDark })
}

function buildInputs(DS) {
  const { colors } = DS
  const p = colors.primary
  const d = colors.danger || darken(p, 40)
  const inputBg = DS.isDark ? '#1A1A1A' : '#ffffff'
  const tc = DS.isDark ? '#eeeeee' : '#1a1a1a'
  const placeholder = DS.isDark ? '#666666' : '#aaaaaa'

  function inputField(label, opts = {}) {
    const border = opts.borderColor || colors.border
    const children = [
      text(label, { weight: 600, size: 12, color: tc }),
      frame(`Input/${label}`, { mode: 'HORIZONTAL', padding: [8, 12, 8, 12], align: 'center' }, [
        text(opts.value || 'Enter text...', { size: 11, color: opts.valueColor || placeholder }),
      ], {
        cornerRadius: 8,
        fills: [{ hex: inputBg }],
        strokes: [{ width: 1.5, color: border }],
        layoutChild: { hug: 'fill' },
        ...(opts.shadow ? { effects: [{ type: 'shadow', x: 0, y: 0, blur: 0, color: ha(border, 0.15) }] } : {}),
      }),
    ]
    if (opts.helper) children.push(text(opts.helper, { size: 11, color: opts.helperColor || placeholder }))
    return frame(`InputGroup/${label}`, { mode: 'VERTICAL', gap: 4 }, children, { size: { w: 200 } })
  }

  return sectionCard('Input', colors.primary, [
    frame('Inputs', { mode: 'HORIZONTAL', gap: 14, wrap: true }, [
      inputField('Default'),
      inputField('Focus', { borderColor: p, value: 'Focused', valueColor: tc, shadow: true }),
      inputField('Error', { borderColor: d, value: 'Invalid', valueColor: d, helper: 'Validation message', helperColor: d }),
      inputField('Disabled', { value: 'Disabled', valueColor: '#aaaaaa' }),
    ], { layoutChild: { hug: 'fill' } }),
  ], { dark: DS.isDark })
}

function buildAlerts(DS) {
  const { colors } = DS
  const types = [
    { name: 'Info', c: colors.info || colors.primary, icon: 'i' },
    { name: 'Success', c: colors.success, icon: '✓' },
    { name: 'Warning', c: colors.warning, icon: '!' },
    { name: 'Danger', c: colors.danger, icon: '✕' },
  ]

  const alerts = types.filter(t => t.c).map(({ name, c, icon }) => {
    const rc = DS.isDark ? c : readableOnLight(c)
    return frame(`Alert/${name}`, { mode: 'HORIZONTAL', gap: 10, padding: [10, 14, 10, 14], align: 'center' }, [
      frame('Icon', { mode: 'HORIZONTAL', padding: [0, 0, 0, 0], align: 'center', justify: 'center' }, [
        text(icon, { weight: 700, size: 11, color: rc }),
      ], { size: { w: 22, h: 22 }, cornerRadius: 11, fills: [{ color: ha(c, 0.15) }] }),
      text(`${name}: Alert message content here.`, { size: 11, color: DS.isDark ? '#cccccc' : '#555555', fill: true }),
    ], {
      cornerRadius: 8,
      fills: [{ color: ha(c, 0.08) }],
      layoutChild: { hug: 'fill' },
    })
  })

  return sectionCard('Alert', colors.primary, alerts, { dark: DS.isDark })
}

function buildBadges(DS) {
  const { colors } = DS
  const p = colors.primary
  const pt = safeTextColor(p, isLight(p) ? colors.text : '#ffffff')

  const badges = [
    btnNode('Filled', p, pt, { small: true, cornerRadius: 999 }),
    btnNode('Soft', ha(p, 0.12), DS.isDark ? p : readableOnLight(p), { small: true, cornerRadius: 999 }),
    btnNode('Outline', null, DS.isDark ? p : readableOnLight(p), { small: true, cornerRadius: 999, strokes: [{ width: 1.5, color: p }] }),
    btnNode('Success', colors.success, safeTextColor(colors.success, '#ffffff'), { small: true, cornerRadius: 999 }),
    btnNode('Error', colors.danger, safeTextColor(colors.danger, '#ffffff'), { small: true, cornerRadius: 999 }),
  ]

  return sectionCard('Badge / Tag', colors.primary, [
    frame('Badges', { mode: 'HORIZONTAL', gap: 6, wrap: true, align: 'center' }, badges, { layoutChild: { hug: 'fill' } }),
  ], { dark: DS.isDark })
}

function buildToggles(DS) {
  const { colors } = DS
  const p = colors.primary

  const onTrack = frame('Toggle/On/Track', { mode: 'HORIZONTAL', padding: [2, 2, 2, 2], justify: 'end', align: 'center' }, [
    { type: 'ELLIPSE', name: 'Thumb', size: { w: 18, h: 18 }, fills: [{ hex: '#ffffff' }] },
  ], { size: { w: 40, h: 22 }, cornerRadius: 11, fills: [{ hex: p }] })

  const offTrack = frame('Toggle/Off/Track', { mode: 'HORIZONTAL', padding: [2, 2, 2, 2], justify: 'start', align: 'center' }, [
    { type: 'ELLIPSE', name: 'Thumb', size: { w: 18, h: 18 }, fills: [{ hex: '#ffffff' }] },
  ], { size: { w: 40, h: 22 }, cornerRadius: 11, fills: [{ hex: colors.border }] })

  return sectionCard('Toggle / Switch', colors.primary, [
    frame('Toggles', { mode: 'HORIZONTAL', gap: 16, align: 'center' }, [
      frame('On', { mode: 'HORIZONTAL', gap: 8, align: 'center' }, [onTrack, text('On', { size: 12, color: DS.isDark ? '#eeeeee' : '#1a1a1a' })]),
      frame('Off', { mode: 'HORIZONTAL', gap: 8, align: 'center' }, [offTrack, text('Off', { size: 12, color: '#999999' })]),
    ], { layoutChild: { hug: 'fill' } }),
  ], { dark: DS.isDark })
}

function buildTabs(DS) {
  const { colors } = DS
  const p = colors.primary
  const tc = DS.isDark ? '#666666' : '#999999'

  const underline = frame('Tabs/Underline', { mode: 'HORIZONTAL', gap: 0 }, [
    frame('Tab/Active', { mode: 'HORIZONTAL', padding: [8, 16, 8, 16] }, [
      text('Active', { weight: 600, size: 11, color: p }),
    ]),
    frame('Tab/2', { mode: 'HORIZONTAL', padding: [8, 16, 8, 16] }, [
      text('Tab 2', { weight: 400, size: 11, color: tc }),
    ]),
    frame('Tab/3', { mode: 'HORIZONTAL', padding: [8, 16, 8, 16] }, [
      text('Tab 3', { weight: 400, size: 11, color: tc }),
    ]),
  ], { layoutChild: { hug: 'fill' } })

  const pt = safeTextColor(p, isLight(p) ? colors.text : '#ffffff')
  const pill = frame('Tabs/Pill', { mode: 'HORIZONTAL', gap: 4 }, [
    btnNode('Active', p, pt, { small: true, cornerRadius: 999 }),
    btnNode('Tab 2', null, tc, { small: true, cornerRadius: 999, strokes: [{ width: 1, color: colors.border }] }),
    btnNode('Tab 3', null, tc, { small: true, cornerRadius: 999, strokes: [{ width: 1, color: colors.border }] }),
  ], { layoutChild: { hug: 'fill' } })

  return sectionCard('Tabs', colors.primary, [
    subLabel('UNDERLINE'), underline,
    subLabel('PILL'), pill,
  ], { dark: DS.isDark })
}

function buildModal(DS) {
  const { colors } = DS
  const p = colors.primary
  const pt = safeTextColor(p, isLight(p) ? colors.text : '#ffffff')
  const hf = DS.typography?.headingFont || 'Inter'
  const bg = DS.isDark ? '#1a1a1a' : '#ffffff'
  const tc = DS.isDark ? '#eeeeee' : '#1a1a1a'
  const sub = DS.isDark ? '#888888' : '#666666'

  const dialog = frame('Modal/Dialog', { mode: 'VERTICAL', gap: 8, padding: [24, 24, 24, 24] }, [
    frame('Header', { mode: 'HORIZONTAL', align: 'center', justify: 'between' }, [
      text('Dialog Title', { weight: 700, size: 16, color: tc, family: hf }),
      frame('Close', { mode: 'HORIZONTAL', padding: [4, 4, 4, 4], align: 'center', justify: 'center' }, [
        text('✕', { size: 12, color: '#999999' }),
      ], { size: { w: 24, h: 24 }, cornerRadius: 6, fills: [{ hex: DS.isDark ? '#333333' : '#f0f0f0' }] }),
    ], { layoutChild: { hug: 'fill' } }),
    text('Are you sure? This action cannot be undone.', { size: 11, color: sub, lineHeight: 1.5, fill: true }),
    frame('Footer', { mode: 'HORIZONTAL', gap: 8, justify: 'end' }, [
      btnNode('Cancel', null, sub, { small: true, strokes: [{ width: 1, color: colors.border }] }),
      btnNode('Confirm', p, pt, { small: true }),
    ], { layoutChild: { hug: 'fill' } }),
  ], {
    size: { w: 360 },
    cornerRadius: 14,
    fills: [{ hex: bg }],
    effects: [{ type: 'shadow', x: 0, y: 8, blur: 24, color: '#0000001f' }],
    strokes: [{ width: 1, color: colors.border }],
  })

  return sectionCard('Modal / Dialog', colors.primary, [dialog], { dark: DS.isDark })
}

function buildPagination(DS) {
  const { colors } = DS
  const p = colors.primary
  const pt = safeTextColor(p, isLight(p) ? colors.text : '#ffffff')
  const tc = DS.isDark ? '#888888' : '#666666'

  const pages = ['‹', '1', '2', '3', '…', '10', '›']
  const items = pages.map(n => {
    const isActive = n === '1'
    return frame(`Page/${n}`, { mode: 'HORIZONTAL', padding: [5, 10, 5, 10], align: 'center', justify: 'center' }, [
      text(n, { weight: isActive ? 700 : 400, size: 12, color: isActive ? pt : tc }),
    ], {
      cornerRadius: 6,
      ...(isActive ? { fills: [{ hex: p }] } : { strokes: [{ width: 1, color: colors.border }] }),
    })
  })

  return sectionCard('Pagination', colors.primary, [
    frame('Pages', { mode: 'HORIZONTAL', gap: 4, align: 'center' }, items, { layoutChild: { hug: 'fill' } }),
  ], { dark: DS.isDark })
}

function buildAvatar(DS) {
  const { colors } = DS
  const p = colors.primary
  const s = colors.secondary

  return sectionCard('Avatar', colors.primary, [
    frame('Avatars', { mode: 'HORIZONTAL', gap: 12, align: 'center' }, [
      frame('Avatar/LG', { mode: 'HORIZONTAL', align: 'center', justify: 'center' }, [
        text('AB', { weight: 700, size: 15, color: p }),
      ], { size: { w: 40, h: 40 }, cornerRadius: 20, fills: [{ color: ha(p, 0.15) }] }),
      frame('Avatar/Square', { mode: 'HORIZONTAL', align: 'center', justify: 'center' }, [
        text('CD', { weight: 700, size: 15, color: s }),
      ], { size: { w: 40, h: 40 }, cornerRadius: 8, fills: [{ color: ha(s, 0.15) }] }),
      frame('Avatar/SM', { mode: 'HORIZONTAL', align: 'center', justify: 'center' }, [
        text('SM', { weight: 700, size: 12, color: p }),
      ], { size: { w: 32, h: 32 }, cornerRadius: 16, fills: [{ color: ha(p, 0.15) }] }),
    ], { layoutChild: { hug: 'fill' } }),
  ], { dark: DS.isDark })
}

function buildToast(DS) {
  const { colors } = DS
  const p = colors.primary
  const bg = colors.text
  const fg = colors.surface

  return sectionCard('Toast / Snackbar', colors.primary, [
    frame('Toast', { mode: 'HORIZONTAL', gap: 10, padding: [10, 16, 10, 16], align: 'center' }, [
      { type: 'ELLIPSE', name: 'Dot', size: { w: 8, h: 8 }, fills: [{ hex: p }] },
      text('Operation completed.', { size: 11, color: fg }),
      text('Undo', { weight: 600, size: 12, color: p }),
    ], {
      cornerRadius: 10,
      fills: [{ hex: bg }],
      effects: [{ type: 'shadow', x: 0, y: 4, blur: 12, color: '#00000026' }],
    }),
  ], { dark: DS.isDark })
}

function buildCheckbox(DS) {
  const { colors } = DS
  const p = colors.primary
  const pt = safeTextColor(p, isLight(p) ? colors.text : '#ffffff')
  const tc = DS.isDark ? '#eeeeee' : '#1a1a1a'

  return sectionCard('Checkbox', colors.primary, [
    frame('Checkboxes', { mode: 'HORIZONTAL', gap: 16, align: 'center' }, [
      frame('Checked', { mode: 'HORIZONTAL', gap: 8, align: 'center' }, [
        frame('Box', { mode: 'HORIZONTAL', align: 'center', justify: 'center' }, [
          text('✓', { weight: 700, size: 11, color: pt }),
        ], { size: { w: 18, h: 18 }, cornerRadius: 4, fills: [{ hex: p }] }),
        text('Checked', { size: 11, color: tc }),
      ]),
      frame('Unchecked', { mode: 'HORIZONTAL', gap: 8, align: 'center' }, [
        rect('Box', 18, 18, [], { cornerRadius: 4, strokes: [{ width: 2, color: colors.border }] }),
        text('Unchecked', { size: 11, color: tc }),
      ]),
    ], { layoutChild: { hug: 'fill' } }),
  ], { dark: DS.isDark })
}

// ─── Main export ───

export function buildFigmaJSON(DS) {
  if (!DS || !DS.colors) return null

  const sections = [
    buildColorPalette(DS),
    buildTypography(DS),
    buildNavbar(DS),
    buildButtons(DS),
    buildCards(DS),
    buildInputs(DS),
    buildAlerts(DS),
    buildBadges(DS),
    buildTabs(DS),
    buildToggles(DS),
    buildCheckbox(DS),
    buildPagination(DS),
    buildModal(DS),
    buildAvatar(DS),
    buildToast(DS),
  ]

  // Grid layout: 3 columns, each section fills a cell
  // Color Palette + Typography span full width (row 1-2)
  // Remaining sections in 2-col or 3-col grid
  const fullWidthSections = sections.slice(0, 3) // palette, typography, navbar
  const gridSections = sections.slice(3)

  // Pair grid sections into rows of 2
  const rows = []
  for (let i = 0; i < gridSections.length; i += 2) {
    const rowChildren = [gridSections[i]]
    if (gridSections[i + 1]) rowChildren.push(gridSections[i + 1])
    rows.push(frame(`Row ${Math.floor(i / 2) + 1}`, { mode: 'HORIZONTAL', gap: 16, wrap: false }, rowChildren, { layoutChild: { hug: 'fill' } }))
  }

  const rootBg = DS.isDark ? '#111111' : '#F5F5F5'

  return {
    source: 'img2ui',
    version: '1.0',
    nodes: [
      frame('img2ui UI Kit', { mode: 'VERTICAL', gap: 16, padding: [32, 32, 32, 32] }, [
        text('img2ui — UI Kit', { weight: 800, size: 22, color: DS.isDark ? '#eeeeee' : '#222222', family: DS.typography?.headingFont || 'Inter' }),
        text(`${DS.typography?.headingFont || 'Inter'} / ${DS.typography?.bodyFont || 'Inter'} • ${DS.isDark ? 'Dark' : 'Light'} Theme`, {
          size: 12, color: DS.isDark ? '#666666' : '#999999',
        }),
        ...fullWidthSections,
        ...rows,
      ], {
        size: { w: 960 },
        fills: [{ hex: rootBg }],
        cornerRadius: 20,
      }),
    ],
  }
}
