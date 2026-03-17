export const SLOT_IDS = ['primary','secondary','accent','success','warning','danger','info','surface','text','border'];

export const SLOT_ICONS = {
  primary:'P',
  secondary:'S',
  accent:'Ac',
  success:'Ok',
  warning:'W',
  danger:'D',
  info:'i',
  surface:'Sf',
  text:'T',
  border:'Bd'
};

export const STEP_COUNT = 6;

// Internal step IDs: 1=Upload, 2=AI, 3=Color, 5=Annotate, 6=Processing, 7=Kit
// Step 4 (Tokens) removed — wizard shows 6 steps
export const STEP_MAP = [1,2,3,5,6,7]; // wizard index → internal step ID

export const DAILY_LIMIT = 5;

// Provider list with labels
export const PROVIDERS = {
  auto: { label:'Auto (cheapest)', icon:'⚡' },
  'claude-haiku': { label:'Claude Haiku', icon:'🟣' },
  'claude-sonnet': { label:'Claude Sonnet', icon:'🟣' },
  'gpt4o-mini': { label:'GPT-4o Mini', icon:'🟢' },
  'gpt4o': { label:'GPT-4o', icon:'🟢' },
  'gpt-4.1': { label:'GPT-4.1', icon:'🟢' },
  'o4-mini': { label:'o4-mini (Reasoning)', icon:'🟢' },
  'gpt5-mini': { label:'GPT-5 Mini', icon:'🟢' },
  'gpt5': { label:'GPT-5.4', icon:'🟢' },
  'gemini-flash': { label:'Gemini Flash', icon:'🔵' }
};

// CSS Framework list
export const CSS_FRAMEWORKS = {
  tailwind: { label:'Tailwind' },
  vanilla: { label:'Vanilla' },
  cssvar: { label:'CSS Vars' }
};

// Variation axis definitions — hints AI on primary vs. secondary differentiation
export const VARIATION_AXIS = {
  // Forms — state-heavy
  button:    { axis:'variant', weight:0.8, fallback:'state',   hint:'Buttons most often differ by visual style (filled, outline, ghost, soft). If colors differ but shape is same, likely semantic variants (primary, danger, success).' },
  input:     { axis:'state',   weight:0.9, fallback:'variant', hint:'Input fields most often show states (default, focus, error, disabled, filled). Look for border color changes, label position, helper text.' },
  select:    { axis:'state',   weight:0.8, fallback:'variant', hint:'Selects show states (closed, open, selected, error). If dropdown is visible, that is the "open" state.' },
  checkbox:  { axis:'state',   weight:0.95,fallback:null,      hint:'Checkboxes are almost always states: unchecked, checked, indeterminate, disabled.' },
  toggle:    { axis:'state',   weight:0.95,fallback:null,      hint:'Toggles are binary states: on/off, sometimes with disabled.' },
  search:    { axis:'state',   weight:0.7, fallback:'variant', hint:'Search bars show states (empty, focused, with-query, loading). Different shapes suggest variants.' },

  // Feedback — semantic-heavy
  alert:     { axis:'semantic',weight:0.9, fallback:'variant', hint:'Alerts are nearly always semantic variants: success, warning, danger, info. Color is the key differentiator.' },
  toast:     { axis:'semantic',weight:0.85,fallback:'variant', hint:'Toasts follow alert semantics: success, error, warning, info.' },
  badge:     { axis:'semantic',weight:0.8, fallback:'variant', hint:'Badges often differ by semantic meaning (status colors) or size. Small visual differences suggest size variants.' },
  tooltip:   { axis:'variant', weight:0.6, fallback:null,      hint:'Tooltips differ by placement (top, bottom, left, right) or style (dark, light).' },
  modal:     { axis:'variant', weight:0.7, fallback:null,      hint:'Modals differ by size (sm, md, lg) or purpose (confirm, form, alert). Compare overall dimensions.' },

  // Navigation — variant-heavy
  navbar:    { axis:'variant', weight:0.7, fallback:'state',   hint:'Navbars differ by style (solid, transparent, blur). Scrolled state may look different.' },
  tabs:      { axis:'variant', weight:0.6, fallback:'state',   hint:'Tabs vary by style (underline, filled, pill) or show active vs inactive states.' },
  breadcrumb:{ axis:'variant', weight:0.7, fallback:null,      hint:'Breadcrumbs differ by separator style (slash, chevron, arrow).' },
  pagination:{ axis:'variant', weight:0.6, fallback:'state',   hint:'Pagination shows active vs inactive states, or different visual styles.' },
  stepper:   { axis:'state',   weight:0.7, fallback:'variant', hint:'Steppers show progress states: completed, active, upcoming.' },
  sidebar:   { axis:'state',   weight:0.6, fallback:'variant', hint:'Sidebars show expanded/collapsed states, or style variants (icon-only, compact).' },

  // Content — layout-heavy
  card:      { axis:'variant', weight:0.6, fallback:'layout',  hint:'Cards differ by layout (image-top, horizontal, text-only) or elevation. Very different layouts may be independent designs.' },
  hero:      { axis:'layout',  weight:0.7, fallback:'variant', hint:'Hero sections differ by layout (centered, left-aligned, split-image). Treat as layout variants.' },
  section:   { axis:'variant', weight:0.5, fallback:'layout',  hint:'Sections are generic. Very different content suggests independent designs rather than variants.' },
  list:      { axis:'variant', weight:0.5, fallback:null,      hint:'Lists vary by density and decoration. Very different structures may be independent designs.' },
  table:     { axis:'variant', weight:0.5, fallback:null,      hint:'Tables vary by density (compact, comfortable) and decoration (striped, bordered).' },
  media:     { axis:'variant', weight:0.5, fallback:null,      hint:'Media components vary by aspect ratio and overlay style.' },
  text:      { axis:'variant', weight:0.4, fallback:null,      hint:'Text blocks are usually independent unless clearly showing light/dark variants.' },
  footer:    { axis:'variant', weight:0.5, fallback:null,      hint:'Footers differ by layout (simple, multi-column, centered).' },
  avatar:    { axis:'variant', weight:0.6, fallback:null,      hint:'Avatars differ by shape (circle, square), size, or content type (image, initials, icon).' },
};
