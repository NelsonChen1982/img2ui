/**
 * UI Kit Renderer
 * Generates the full HTML preview of all 25 design system components.
 * Ported from legacy index.html's R{} renderers + buildUIKit().
 */

import { isLight, ha, darken, lighten, safeTextColor, readableOnLight } from './colorUtils.js';
import { COMP_SKELETON } from '../data/compSkeleton.js';

const ALL_COMP_IDS = [
  'navbar','hero','section','sidebar','footer','tabs','breadcrumb','pagination',
  'stepper','card','list','table','media','text','button','input','checkbox',
  'select','search','toggle','alert','toast','modal','tooltip','badge','avatar'
];

/* ── card wrapper ── */
function cr(DS, label, content) {
  const cardBg = DS.isDark
    ? lighten(DS.colors.text, 18)
    : 'rgba(255,255,255,.92)';
  const cardBorder = DS.isDark
    ? ha(DS.colors.surface, 0.08)
    : ha(DS.colors.text, 0.08);
  return `<div class="kit-section" style="background:${cardBg};border:1px solid ${cardBorder};box-shadow:${DS.shadows.sm};border-radius:14px;padding:18px 20px;margin-bottom:14px;overflow-x:auto;-webkit-overflow-scrolling:touch;">
    <div class="kit-section-label" style="color:${DS.colors.primary};font-size:10px;font-weight:700;letter-spacing:.08em;margin-bottom:14px;">${label.toUpperCase()}</div><div style="min-width:0;">${content}</div></div>`;
}

/* ── 25 default renderers ── */
function getRenderers(DS) {
  const { colors } = DS;
  const p = colors.primary;
  const s = colors.secondary;
  const pt = safeTextColor(p, isLight(p) ? colors.text : '#ffffff');

  return {
    navbar: () => {
      return cr(DS, 'Navbar / Header', `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="background:${p};border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">
          <div style="font-weight:800;color:${pt};font-size:15px;">Brand</div>
          <div style="display:flex;gap:16px;">${['Home','Product','Pricing','About'].map((l,i)=>`<span style="color:${i===0?pt:ha(pt,.55)};font-size:13px;font-weight:${i===0?600:400};">${l}</span>`).join('')}</div>
          <div style="display:flex;gap:6px;">
            <div style="padding:5px 12px;border-radius:6px;border:1px solid ${ha(pt,.3)};color:${pt};font-size:12px;">Login</div>
            <div style="padding:5px 12px;border-radius:6px;background:${pt};color:${p};font-size:12px;font-weight:700;">Sign up</div>
          </div>
        </div>
        <div style="background:${DS.isDark?ha(colors.surface,.08):'white'};border:1px solid ${colors.border};border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">
          <div style="font-weight:700;font-size:15px;color:${p};">Brand</div>
          <div style="display:flex;gap:16px;">${['Home','Product','Pricing'].map((l,i)=>`<span style="font-size:13px;font-weight:${i===0?600:400};color:${i===0?p:(DS.isDark?'#888':'#666')};">${l}</span>`).join('')}</div>
          <div style="padding:5px 12px;border-radius:6px;background:${p};color:${pt};font-size:12px;font-weight:600;">CTA</div>
        </div>
      </div>`);
    },

    hero: () => {
      return cr(DS, 'Hero / Banner', `
      <div style="background:linear-gradient(135deg,${p},${darken(p,40)});border-radius:12px;padding:32px 24px;margin-bottom:10px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:.08em;color:${ha(pt,.45)};margin-bottom:10px;">HERO BANNER</div>
        <div style="font-size:28px;font-weight:800;color:${pt};line-height:1.2;margin-bottom:8px;">Your headline<br>goes here</div>
        <div style="font-size:14px;color:${ha(pt,.6)};margin-bottom:18px;max-width:380px;">Supporting description text with visual language from your design.</div>
        <div style="display:flex;gap:8px;">
          <div style="padding:8px 18px;border-radius:8px;background:${pt};color:${p};font-size:13px;font-weight:700;">Get started →</div>
          <div style="padding:8px 18px;border-radius:8px;background:${ha(pt,.15)};color:${pt};font-size:13px;border:1px solid ${ha(pt,.25)};">Learn more</div>
        </div>
      </div>
      <div style="background:${s};border-radius:12px;padding:24px;display:flex;align-items:center;gap:20px;">
        <div style="flex:1;"><div style="font-size:18px;font-weight:700;color:${safeTextColor(s, isLight(s)?colors.text:'#ffffff')};margin-bottom:4px;">Secondary CTA</div>
          <div style="font-size:13px;color:${ha(safeTextColor(s, isLight(s)?colors.text:'#ffffff'),.6)};">Alternative banner style with secondary color</div></div>
        <div style="padding:8px 18px;border-radius:8px;background:${safeTextColor(s, isLight(s)?colors.text:'#ffffff')};color:${s};font-size:13px;font-weight:700;">Action</div>
      </div>`);
    },

    section: () => cr(DS, 'Section / Container', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div style="border:1px dashed ${colors.border};border-radius:10px;padding:24px;text-align:center;">
          <div style="font-size:11px;color:${ha(p,.6)};font-weight:600;">FULL WIDTH</div></div>
        <div style="border:1px solid ${colors.border};border-radius:10px;padding:24px;text-align:center;background:${ha(p,.04)};">
          <div style="font-size:11px;color:${p};font-weight:600;">TINTED</div></div>
      </div>`),

    sidebar: () => {
      const bg = DS.isDark ? darken(colors.text, 10) : lighten(colors.surface, 5);
      return cr(DS, 'Sidebar', `<div style="background:${bg};border-radius:10px;padding:14px;width:200px;">
        <div style="font-size:10px;font-weight:700;color:#aaa;letter-spacing:.06em;margin-bottom:10px;">MENU</div>
        ${['Dashboard','Analytics','Users','Settings','Help'].map((l,i)=>`<div style="padding:7px 10px;border-radius:6px;font-size:13px;font-weight:${i===0?600:400};color:${i===0?p:(DS.isDark?'#999':'#666')};background:${i===0?ha(p,.12):'transparent'};margin-bottom:2px;display:flex;align-items:center;gap:8px;">
          ${l}</div>`).join('')}
        <div style="border-top:1px solid ${colors.border};margin-top:8px;padding-top:8px;">
          <div style="padding:7px 10px;font-size:12px;color:#aaa;">Logout</div>
        </div>
      </div>`);
    },

    footer: () => cr(DS, 'Footer', `
      <div style="border-top:1px solid ${colors.border};padding-top:16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
          <div><div style="font-weight:700;font-size:14px;margin-bottom:4px;">Brand</div><div style="font-size:12px;color:${DS.isDark?'#666':'#999'};">Your tagline here</div></div>
          <div style="display:flex;gap:24px;">
            ${['Product','Company','Legal'].map(cat=>`<div><div style="font-size:11px;font-weight:700;color:#aaa;margin-bottom:6px;">${cat}</div>${['Link 1','Link 2'].map(l=>`<div style="font-size:12px;color:${DS.isDark?'#777':'#888'};margin-bottom:3px;">${l}</div>`).join('')}</div>`).join('')}
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:${DS.isDark?'#555':'#bbb'};border-top:1px solid ${colors.border};padding-top:10px;">
          <span>&copy; 2026 YourBrand</span><div style="display:flex;gap:14px;">${['Privacy','Terms','Contact'].map(l=>`<span>${l}</span>`).join('')}</div>
        </div>
      </div>`),

    tabs: () => cr(DS, 'Tabs', `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div><div style="font-size:9px;font-weight:700;color:#aaa;margin-bottom:6px;">UNDERLINE</div>
          <div style="display:flex;gap:0;border-bottom:2px solid ${colors.border};">${['Active','Tab 2','Tab 3'].map((l,i)=>`<div style="padding:8px 16px;font-size:13px;font-weight:${i===0?600:400};color:${i===0?p:(DS.isDark?'#666':'#999')};border-bottom:2px solid ${i===0?p:'transparent'};margin-bottom:-2px;">${l}</div>`).join('')}</div></div>
        <div><div style="font-size:9px;font-weight:700;color:#aaa;margin-bottom:6px;">PILL</div>
          <div style="display:flex;gap:4px;">${['Active','Tab 2','Tab 3'].map((l,i)=>`<div style="padding:6px 14px;border-radius:999px;font-size:12px;font-weight:${i===0?600:400};background:${i===0?p:'transparent'};color:${i===0?pt:(DS.isDark?'#666':'#999')};border:${i===0?'none':'1px solid '+colors.border};">${l}</div>`).join('')}</div></div>
      </div>`),

    breadcrumb: () => cr(DS, 'Breadcrumb', `
      <div style="display:flex;align-items:center;gap:6px;font-size:13px;">
        ${['Home','Products','Category','Current'].map((l,i,a)=>`${i>0?`<span style="color:${DS.isDark?'#555':'#ccc'};">/</span>`:''}<span style="color:${i===a.length-1?(DS.isDark?'#eee':'#222'):(DS.isDark?'#666':'#999')};font-weight:${i===a.length-1?600:400};">${l}</span>`).join('')}
      </div>`),

    pagination: () => cr(DS, 'Pagination', `
      <div style="display:flex;gap:4px;align-items:center;">
        ${['‹',1,2,3,'…',10,'›'].map(n=>`<div style="padding:5px 10px;border-radius:6px;font-size:12px;font-weight:${n===1?700:400};background:${n===1?p:'transparent'};color:${n===1?pt:(DS.isDark?'#888':'#666')};border:${n===1?'none':'1px solid '+colors.border};">${n}</div>`).join('')}
      </div>`),

    stepper: () => {
      const steps = ['Upload','Process','Review','Done'];
      return cr(DS, 'Stepper', `
      <div style="display:flex;align-items:center;gap:0;">
        ${steps.map((l,i)=>`<div style="display:flex;align-items:center;gap:6px;">
          <div style="width:22px;height:22px;border-radius:50%;background:${i<=1?p:colors.border};color:${i<=1?pt:(DS.isDark?'#666':'#999')};font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;">${i<1?'&#10003;':i+1}</div>
          <span style="font-size:12px;font-weight:${i===1?600:400};color:${i===1?(DS.isDark?'#eee':'#333'):(DS.isDark?'#666':'#999')};">${l}</span>
          ${i<3?`<div style="width:28px;height:1px;background:${i<1?p:colors.border};margin:0 6px;"></div>`:''}
        </div>`).join('')}
      </div>`);
    },

    card: () => {
      const st = safeTextColor(s, isLight(s) ? colors.text : '#ffffff');
      // Brand card: gradient from p→s, pick safe text against the darker of the two
      const brandBg = isLight(p) && isLight(s) ? '#111111' : '#ffffff';
      return cr(DS, 'Card', `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        <div style="border:1px solid ${colors.border};border-top:3px solid ${p};border-radius:12px;padding:16px;">
          <div style="font-size:10px;font-weight:700;color:${p};margin-bottom:8px;">ACCENT</div>
          <div style="font-size:15px;font-weight:700;margin-bottom:4px;">Card Title</div>
          <div style="font-size:12px;color:${DS.isDark?'#888':'#999'};line-height:1.5;margin-bottom:12px;">Description text here.</div>
          <div style="padding:5px 12px;border-radius:6px;background:${ha(p,.1)};color:${p};font-size:11px;font-weight:600;display:inline-block;">Action</div>
        </div>
        <div style="border-radius:12px;padding:16px;box-shadow:${DS.shadows.lg};background:${DS.isDark?ha(colors.surface,.08):'white'};">
          <div style="font-size:10px;font-weight:700;color:${s};margin-bottom:8px;">ELEVATED</div>
          <div style="font-size:15px;font-weight:700;margin-bottom:4px;">Card Title</div>
          <div style="font-size:12px;color:${DS.isDark?'#888':'#999'};line-height:1.5;margin-bottom:12px;">Description text here.</div>
          <div style="display:flex;gap:6px;">
            <div style="padding:5px 12px;border-radius:6px;background:${s};color:${st};font-size:11px;font-weight:600;">Primary</div>
            <div style="padding:5px 12px;border-radius:6px;border:1px solid ${colors.border};font-size:11px;">Cancel</div>
          </div>
        </div>
        <div style="background:linear-gradient(135deg,${p},${s});border-radius:12px;padding:16px;">
          <div style="font-size:10px;font-weight:700;color:${ha(brandBg,.5)};margin-bottom:8px;">BRAND</div>
          <div style="font-size:15px;font-weight:700;color:${brandBg};margin-bottom:4px;">Card Title</div>
          <div style="font-size:12px;color:${ha(brandBg,.65)};line-height:1.5;">Description text here.</div>
        </div>
      </div>`);
    },

    list: () => {
      const items = ['Primary item with description','Secondary item label','Third item with action'];
      const allC = DS.allColors || [p, s, colors.accent];
      return cr(DS, 'List', `
      <div style="display:flex;flex-direction:column;gap:0;">
        ${items.map((l,i)=>`<div style="padding:10px 12px;border-bottom:1px solid ${colors.border};display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;border-radius:8px;background:${ha(allC[i%allC.length],.15)};display:flex;align-items:center;justify-content:center;font-size:14px;color:${DS.isDark?allC[i%allC.length]:readableOnLight(allC[i%allC.length])};flex-shrink:0;">*</div>
            <div><div style="font-size:13px;font-weight:500;">${l}</div><div style="font-size:11px;color:${DS.isDark?'#666':'#aaa'};">Subtitle text</div></div></div>
          <span style="font-size:11px;color:${DS.isDark?'#555':'#bbb'};">&rarr;</span></div>`).join('')}
      </div>`);
    },

    table: () => {
      const allC = DS.allColors || [p, s, colors.accent];
      return cr(DS, 'Table', `
      <div style="border-radius:10px;overflow:hidden;border:1px solid ${colors.border};">
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr 80px;background:${ha(p,.08)};padding:8px 12px;font-size:11px;font-weight:700;color:${DS.isDark?p:readableOnLight(p)};">
          <span>Name</span><span>Status</span><span>Value</span><span></span></div>
        ${[['Alpha','Active','$120'],['Beta','Pending','$80'],['Gamma','Done','$200']].map((r,i)=>{const c=allC[i%allC.length];const rc=DS.isDark?c:readableOnLight(c);return `<div style="display:grid;grid-template-columns:2fr 1fr 1fr 80px;padding:8px 12px;border-top:1px solid ${colors.border};font-size:12px;align-items:center;">
          <span style="font-weight:500;">${r[0]}</span>
          <span><span style="padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;background:${ha(c,.12)};color:${rc};">${r[1]}</span></span>
          <span>${r[2]}</span>
          <span style="font-size:11px;color:${DS.isDark?p:readableOnLight(p)};font-weight:500;cursor:pointer;">Edit</span></div>`;}).join('')}
      </div>`);
    },

    media: () => cr(DS, 'Media / Image', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div><div style="height:120px;border-radius:10px;background:${ha(p,.1)};display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:6px;color:${ha(DS.isDark?'#fff':'#333',.15)};">&#9635;</div>
          <div style="font-size:12px;font-weight:500;">Image with caption</div>
          <div style="font-size:11px;color:${DS.isDark?'#888':'#999'};">Supporting text</div></div>
        <div><div style="height:120px;border-radius:10px;background:linear-gradient(135deg,${ha(s,.15)},${ha(colors.accent,.15)});display:flex;align-items:center;justify-content:center;font-size:32px;color:${ha(DS.isDark?'#fff':'#333',.2)};">&#9654;</div>
          <div style="font-size:12px;font-weight:500;margin-top:6px;">Video placeholder</div></div>
      </div>`),

    text: () => cr(DS, 'Typography / Text', `
      <div style="max-width:320px;">
        <div style="font-size:18px;font-weight:700;margin-bottom:8px;">Rich Text Heading</div>
        <div style="font-size:14px;color:${DS.isDark?'#aaa':'#555'};line-height:1.6;margin-bottom:8px;">Body text with <strong>bold emphasis</strong> and <em>italic styling</em>. The quick brown fox jumps over the lazy dog.</div>
        <div style="font-size:14px;color:${DS.isDark?'#aaa':'#555'};line-height:1.6;">Links styled as <span style="color:${p};text-decoration:underline;">clickable text</span> within paragraphs.</div>
      </div>`),

    button: () => {
      const st = safeTextColor(s, isLight(s) ? colors.text : '#ffffff');
      const a = colors.accent;
      const at = safeTextColor(a, isLight(a) ? colors.text : '#ffffff');
      return cr(DS, 'Button', `
      <div style="font-size:11px;font-weight:600;color:#aaa;margin-bottom:10px;">VARIANTS</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px;">
        <div style="padding:8px 18px;border-radius:8px;font-weight:600;font-size:13px;background:${p};color:${pt};box-shadow:0 4px 12px ${ha(p,.3)};">Primary</div>
        <div style="padding:8px 18px;border-radius:8px;font-weight:600;font-size:13px;background:${s};color:${st};">Secondary</div>
        <div style="padding:7px 18px;border-radius:8px;font-weight:600;font-size:13px;background:transparent;color:${p};border:1.5px solid ${p};">Outline</div>
        <div style="padding:8px 18px;border-radius:8px;font-weight:600;font-size:13px;background:${ha(p,.1)};color:${p};">Soft</div>
        <div style="padding:8px 12px;font-weight:600;font-size:13px;color:${p};text-decoration:underline;">Ghost</div>
        <div style="padding:8px 18px;border-radius:8px;font-weight:600;font-size:13px;background:${a};color:${at};">Accent</div>
        <div style="padding:8px 18px;border-radius:8px;font-weight:600;font-size:13px;background:${colors.border};color:${DS.isDark?'#555':'#aaa'};">Disabled</div>
      </div>
      <div style="font-size:11px;font-weight:600;color:#aaa;margin-bottom:10px;">SIZES</div>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;">
        <div style="padding:3px 10px;border-radius:5px;font-size:11px;font-weight:600;background:${p};color:${pt};">XS</div>
        <div style="padding:5px 14px;border-radius:6px;font-size:12px;font-weight:600;background:${p};color:${pt};">SM</div>
        <div style="padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600;background:${p};color:${pt};">MD</div>
        <div style="padding:10px 22px;border-radius:10px;font-size:14px;font-weight:600;background:${p};color:${pt};">LG</div>
        <div style="padding:12px 28px;border-radius:12px;font-size:16px;font-weight:600;background:${p};color:${pt};">XL</div>
      </div>
      <div style="font-size:11px;font-weight:600;color:#aaa;margin-bottom:10px;">ICON BUTTONS</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <div style="width:36px;height:36px;border-radius:8px;background:${p};color:${pt};display:flex;align-items:center;justify-content:center;font-size:16px;">+</div>
        <div style="width:36px;height:36px;border-radius:50%;background:${ha(p,.1)};color:${p};display:flex;align-items:center;justify-content:center;font-size:16px;">x</div>
        <div style="width:36px;height:36px;border-radius:8px;border:1.5px solid ${colors.border};color:${DS.isDark?'#888':'#666'};display:flex;align-items:center;justify-content:center;font-size:14px;">...</div>
      </div>`);
    },

    input: () => {
      const d = DS.allColors?.[3] || darken(p, 40);
      const inputBg = DS.isDark ? 'rgba(255,255,255,.04)' : 'white';
      return cr(DS, 'Input', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
        <div><div style="font-size:12px;font-weight:600;margin-bottom:5px;">Default</div>
          <div style="padding:8px 12px;border-radius:8px;border:1.5px solid ${colors.border};font-size:13px;background:${inputBg};color:${DS.isDark?'#666':'#aaa'};">Enter text...</div></div>
        <div><div style="font-size:12px;font-weight:600;margin-bottom:5px;">Focus</div>
          <div style="padding:8px 12px;border-radius:8px;border:1.5px solid ${p};box-shadow:0 0 0 3px ${ha(p,.15)};font-size:13px;background:${inputBg};">Focused</div></div>
        <div><div style="font-size:12px;font-weight:600;margin-bottom:5px;">Error</div>
          <div style="padding:8px 12px;border-radius:8px;border:1.5px solid ${d};box-shadow:0 0 0 3px ${ha(d,.12)};font-size:13px;background:${inputBg};color:${d};">Invalid</div>
          <div style="font-size:11px;color:${d};margin-top:3px;">Validation message</div></div>
        <div><div style="font-size:12px;font-weight:600;margin-bottom:5px;">Disabled</div>
          <div style="padding:8px 12px;border-radius:8px;border:1.5px solid ${colors.border};font-size:13px;background:${DS.isDark?'rgba(255,255,255,.02)':'#f5f5f5'};color:#aaa;">Disabled</div></div>
      </div>
      <div style="font-size:11px;font-weight:600;color:#aaa;margin-bottom:8px;">WITH LABEL & HELPER</div>
      <div style="max-width:280px;">
        <label style="font-size:12px;font-weight:600;margin-bottom:4px;display:block;">Email <span style="color:${d};">*</span></label>
        <div style="padding:8px 12px;border-radius:8px;border:1.5px solid ${colors.border};font-size:13px;background:${inputBg};color:${DS.isDark?'#666':'#aaa'};">name@example.com</div>
        <div style="font-size:11px;color:${DS.isDark?'#666':'#aaa'};margin-top:3px;">We'll never share your email.</div>
      </div>`);
    },

    checkbox: () => {
      const sz = 18;
      return cr(DS, 'Checkbox', `
      <div style="display:flex;gap:16px;align-items:center;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:${sz}px;height:${sz}px;border-radius:4px;background:${p};display:flex;align-items:center;justify-content:center;">
            <svg width="10" height="8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" stroke-width="1.8" stroke-linecap="round"/></svg></div>
          <span style="font-size:13px;">Checked</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:${sz}px;height:${sz}px;border-radius:4px;border:2px solid ${colors.border};"></div>
          <span style="font-size:13px;">Unchecked</span>
        </div>
      </div>`);
    },

    select: () => {
      return cr(DS, 'Select / Dropdown', `
      <div style="width:220px;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;height:38px;border-radius:8px;border:1.5px solid ${colors.border};background:${DS.isDark?'rgba(255,255,255,.04)':'white'};font-size:13px;">
          <span>Selected item</span><span style="color:#999;font-size:10px;">▾</span></div>
        <div style="margin-top:4px;background:${DS.isDark?'#1a1a1a':'white'};border-radius:8px;box-shadow:${DS.shadows.lg};overflow:hidden;border:1px solid ${colors.border};">
          <div style="height:36px;padding:0 12px;display:flex;align-items:center;font-size:13px;border-bottom:none;">Item 1</div>
          <div style="height:36px;padding:0 12px;display:flex;align-items:center;justify-content:space-between;font-size:13px;background:${DS.isDark?'rgba(255,255,255,.05)':'#f5f5f5'};font-weight:500;">Item 2 <span style="color:${p};">✓</span></div>
          <div style="height:36px;padding:0 12px;display:flex;align-items:center;font-size:13px;">Item 3</div>
        </div>
      </div>`);
    },

    search: () => cr(DS, 'Search', `
      <div style="max-width:300px;position:relative;">
        <div style="padding:8px 12px 8px 34px;border-radius:8px;border:1.5px solid ${colors.border};font-size:13px;background:${DS.isDark?'rgba(255,255,255,.04)':'white'};color:${DS.isDark?'#666':'#aaa'};">Search…</div>
        <div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#aaa;font-size:13px;">⌕</div>
      </div>`),

    toggle: () => cr(DS, 'Toggle / Switch', `
      <div style="display:flex;gap:16px;align-items:center;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:40px;height:22px;border-radius:11px;background:${p};position:relative;">
            <div style="width:18px;height:18px;border-radius:50%;background:white;position:absolute;right:2px;top:2px;box-shadow:0 1px 3px rgba(0,0,0,.2);"></div></div>
          <span style="font-size:12px;">On</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:40px;height:22px;border-radius:11px;background:${colors.border};position:relative;">
            <div style="width:18px;height:18px;border-radius:50%;background:white;position:absolute;left:2px;top:2px;box-shadow:0 1px 3px rgba(0,0,0,.2);"></div></div>
          <span style="font-size:12px;color:#999;">Off</span>
        </div>
      </div>`),

    alert: () => {
      const types = [
        { t:'info', c:colors.info||p, icon:'i' },
        { t:'success', c:colors.success, icon:'✓' },
        { t:'warning', c:colors.warning, icon:'!' },
        { t:'danger', c:colors.danger, icon:'✕' },
      ];
      return cr(DS, 'Alert', `
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${types.map(({t,c,icon})=>{const rc=DS.isDark?c:readableOnLight(c);return `<div style="padding:10px 14px;border-radius:8px;background:${ha(c,.08)};border-left:3px solid ${c};font-size:13px;display:flex;align-items:center;gap:10px;">
          <div style="width:22px;height:22px;border-radius:50%;background:${ha(c,.15)};display:flex;align-items:center;justify-content:center;font-size:11px;color:${rc};font-weight:700;flex-shrink:0;">${icon}</div>
          <div><strong style="color:${rc};">${t}:</strong> <span style="color:${DS.isDark?'#ccc':'#555'};">Alert message content here.</span></div></div>`;}).join('')}
      </div>`);
    },

    toast: () => {
      const bg = DS.isDark ? colors.surface : colors.text;
      const fg = DS.isDark ? colors.text : colors.surface;
      return cr(DS, 'Toast / Snackbar', `
      <div style="display:inline-flex;align-items:center;gap:10px;padding:10px 16px;border-radius:10px;background:${bg};box-shadow:${DS.shadows.lg};">
        <div style="width:8px;height:8px;border-radius:50%;background:${p};flex-shrink:0;"></div>
        <span style="font-size:13px;color:${fg};">Operation completed.</span>
        <span style="font-size:12px;font-weight:600;color:${p};cursor:pointer;">Undo</span>
      </div>`);
    },

    modal: () => {
      const bg = DS.isDark ? '#1a1a1a' : 'white';
      return cr(DS, 'Modal / Dialog', `
      <div style="max-width:360px;background:${bg};border-radius:14px;padding:24px;box-shadow:${DS.shadows.lg};border:1px solid ${colors.border};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-size:16px;font-weight:700;">Dialog Title</div>
          <div style="width:24px;height:24px;border-radius:6px;background:${DS.isDark?'#333':'#f0f0f0'};display:flex;align-items:center;justify-content:center;font-size:12px;color:#999;">✕</div></div>
        <div style="font-size:13px;color:${DS.isDark?'#888':'#666'};margin-bottom:20px;line-height:1.5;">Are you sure? This action cannot be undone.</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <div style="padding:7px 16px;border-radius:8px;border:1px solid ${colors.border};font-size:12px;color:${DS.isDark?'#888':'#666'};">Cancel</div>
          <div style="padding:7px 16px;border-radius:8px;background:${p};color:${pt};font-size:12px;font-weight:600;">Confirm</div></div></div>`);
    },

    tooltip: () => {
      const bg = DS.isDark ? colors.surface : colors.text;
      const fg = DS.isDark ? colors.text : colors.surface;
      return cr(DS, 'Tooltip', `
      <div style="position:relative;display:inline-block;">
        <div style="background:${bg};color:${fg};border-radius:6px;padding:8px 14px;font-size:12px;box-shadow:${DS.shadows.sm};line-height:1.4;">
          Tooltip message here.</div>
        <div style="position:absolute;top:100%;left:16px;border-top:5px solid ${bg};border-left:5px solid transparent;border-right:5px solid transparent;"></div>
      </div>`);
    },

    badge: () => {
      return cr(DS, 'Badge / Tag', `
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
        <span style="padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;background:${p};color:${pt};">Filled</span>
        <span style="padding:3px 10px;border-radius:999px;font-size:11px;font-weight:500;background:${ha(p,.12)};color:${DS.isDark?p:readableOnLight(p)};">Soft</span>
        <span style="padding:3px 10px;border-radius:999px;font-size:11px;font-weight:500;border:1.5px solid ${p};color:${DS.isDark?p:readableOnLight(p)};background:transparent;">Outline</span>
        <span style="padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;background:${colors.success};color:${safeTextColor(colors.success, '#ffffff')};">Success</span>
        <span style="padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;background:${colors.danger};color:${safeTextColor(colors.danger, '#ffffff')};">Error</span>
      </div>`);
    },

    avatar: () => {
      return cr(DS, 'Avatar', `
      <div style="display:flex;gap:12px;align-items:center;">
        <div style="position:relative;display:inline-block;">
          <div style="width:40px;height:40px;border-radius:50%;background:${ha(p,.15)};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:${p};">AB</div>
          <div style="position:absolute;bottom:0;right:0;width:11px;height:11px;border-radius:50%;background:#4ade80;border:2px solid white;"></div></div>
        <div style="width:40px;height:40px;border-radius:8px;background:${ha(s,.15)};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:${s};">CD</div>
        <div style="width:32px;height:32px;border-radius:50%;background:${ha(p,.15)};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:${p};">SM</div>
      </div>`);
    },
  };
}

/* ── render annotation-derived variants ── */
function renderAnnotatedSection(DS, annotations, typeId) {
  const annos = annotations.filter(a => a.typeId === typeId && a.visual);
  if (!annos.length) return '';
  const { colors } = DS;
  const cfg = COMP_SKELETON[typeId];

  const slots = annos.map(a => a.aiCSS || {});
  const hasAI = slots.some(s => s && Object.keys(s).length > 0);

  const normalizedSlots = slots.map(s => {
    if (s.css) return { ...s, ...s.css };
    return s;
  });

  let html = '';

  if (cfg && hasAI) {
    const isStateMode = cfg.multiMode === 'state';
    const hasMultipleStates = isStateMode && normalizedSlots.filter(s => s.state).length > 1;

    if (hasMultipleStates || (!isStateMode && normalizedSlots.length > 1)) {
      const label = isStateMode ? 'STATES' : 'VARIANTS';
      html += `<div style="font-size:10px;font-weight:700;color:${colors.primary};letter-spacing:.06em;margin-bottom:10px;">${label} (${normalizedSlots.length})</div>`;
      html += `<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;">`;
      normalizedSlots.forEach((s, i) => {
        const stateLabel = s.state || s.variant || `#${i+1}`;
        html += `<div style="text-align:center;">
          <div style="font-size:9px;font-weight:700;color:#aaa;letter-spacing:.06em;margin-bottom:6px;">${stateLabel.toUpperCase()}</div>
          ${cfg.render(s, DS)}
        </div>`;
      });
      html += '</div>';
    } else {
      const s = normalizedSlots[0] || {};
      html += `<div style="font-size:10px;font-weight:700;color:${colors.primary};letter-spacing:.06em;margin-bottom:10px;">ANNOTATED STYLE</div>`;
      html += cfg.render(s, DS);
    }

    if (cfg.renderVariants && normalizedSlots.length > 0) {
      html += cfg.renderVariants(normalizedSlots, DS);
    }
  } else if (hasAI) {
    html += `<div style="font-size:10px;font-weight:700;color:${colors.primary};letter-spacing:.06em;margin-bottom:10px;">ANNOTATED STYLE</div>`;
    html += `<div style="display:flex;gap:10px;flex-wrap:wrap;">`;
    normalizedSlots.forEach((s, i) => {
      const bg = s.backgroundColor || s.bgColor || '#f5f5f5';
      const rawFg = s.color || s.textColor || '#333';
      const fg = (bg.startsWith('#') && bg.length >= 7) ? safeTextColor(bg, rawFg) : rawFg;
      const r = s.borderRadius || '8px';
      html += `<div style="padding:${s.padding||'12px'};border-radius:${r};background:${bg};color:${fg};border:${s.border||'1px solid rgba(0,0,0,.08)'};min-width:100px;text-align:center;">
        <div style="font-size:11px;font-weight:700;margin-bottom:4px;">${s.variant||`#${i+1}`}</div>
        <div style="font-size:10px;opacity:.6;">${s.description||''}</div></div>`;
    });
    html += '</div>';
  } else {
    html += `<div style="font-size:10px;font-weight:700;color:${colors.primary};letter-spacing:.06em;margin-bottom:10px;">EXTRACTED (${annos.length})</div>`;
    html += `<div style="display:flex;gap:10px;flex-wrap:wrap;">`;
    annos.forEach((a, i) => {
      const v = a.visual;
      const bg = v.bgColor;
      const fg = isLight(bg) ? '#333' : '#fff';
      html += `<div style="padding:12px;border-radius:${v.estimatedRadius}px;background:${bg};color:${fg};min-width:80px;text-align:center;border:1px solid ${ha(v.fgColor,.15)};">
        <div style="font-size:11px;font-weight:700;">${v.inferredVariant||`#${i+1}`}</div>
        <div style="font-size:9px;opacity:.5;">${v.width}×${v.height}</div></div>`;
    });
    html += '</div>';
  }

  return `<div style="margin-top:16px;padding-top:14px;border-top:1px dashed ${colors.border};">
    ${html}
  </div>`;
}

/* ═══════════════════════════════════════════════
 * MAIN: buildUIKitHTML
 * Returns the full HTML string for the UI Kit preview
 * ═══════════════════════════════════════════════ */
export function buildUIKitHTML(DS, annotations = [], analysisLog = []) {
  if (!DS || !DS.colors) return '<div style="padding:20px;color:#999;">No design system data.</div>';

  const { isDark, colors, allColors } = DS;
  const kitBg = isDark ? colors.text : colors.surface;
  const kitFg = isDark ? colors.surface : colors.text;

  // Order: annotated first, then the rest
  let ordered;
  if (annotations.length > 0) {
    const annotated = new Set(annotations.map(a => a.typeId));
    const first = ALL_COMP_IDS.filter(id => annotated.has(id));
    const rest = ALL_COMP_IDS.filter(id => !annotated.has(id));
    ordered = [...first, ...rest];
  } else {
    ordered = ALL_COMP_IDS;
  }

  // ── Color Palette section ──
  const paletteSection = `<div class="kit-section" style="background:${ha(colors.primary,.05)};border:1px solid ${colors.border};border-radius:14px;padding:18px 20px;margin-bottom:14px;">
    <div class="kit-section-label" style="color:${colors.primary};font-size:10px;font-weight:700;letter-spacing:.08em;margin-bottom:14px;">COLOR PALETTE</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
      ${(allColors||[]).slice(0,7).map((hex,i)=>{
        const tc = isLight(hex) ? colors.text : 'white';
        const labels = ['Primary','Secondary','Accent','Surface','Text','Border','Extra'];
        const pct = DS.colorRatios?.[i] ? Math.round(DS.colorRatios[i]*100)+'%' : '';
        return `<div style="flex:1;min-width:70px;"><div style="height:56px;border-radius:10px;background:${hex};border:1px solid ${ha(kitFg,.06)};display:flex;align-items:flex-end;padding:8px;margin-bottom:6px;">
            <span style="font-size:10px;font-weight:700;color:${tc};opacity:.75;">${pct}</span></div>
          <div style="font-size:10px;font-weight:600;">${labels[i]||''}</div>
          <div style="font-size:10px;font-family:monospace;opacity:.5;">${hex}</div></div>`;
      }).join('')}
    </div>
  </div>`;

  // ── Typography section ──
  const headingFont = DS.fonts?.heading || 'Inter';
  const bodyFont = DS.fonts?.body || 'Inter';
  const headingFF = `'${headingFont}',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif`;
  const bodyFF = `'${bodyFont}',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif`;
  const isHeading = (name) => ['Display','H1','H2'].includes(name);

  const typoSection = `<div class="kit-section" style="background:${ha(colors.primary,.03)};border:1px solid ${colors.border};border-radius:14px;padding:18px 20px;margin-bottom:14px;">
    <div class="kit-section-label" style="color:${colors.primary};font-size:10px;font-weight:700;letter-spacing:.08em;margin-bottom:14px;">TYPOGRAPHY</div>
    <div style="display:flex;gap:16px;margin-bottom:14px;">
      <div style="padding:8px 14px;border-radius:8px;background:${ha(colors.primary,.06)};font-size:11px;">
        <span style="font-weight:700;color:${colors.primary};">Heading:</span> <span style="font-family:${headingFF};font-weight:600;">${headingFont}</span></div>
      <div style="padding:8px 14px;border-radius:8px;background:${ha(colors.secondary,.06)};font-size:11px;">
        <span style="font-weight:700;color:${colors.secondary};">Body:</span> <span style="font-family:${bodyFF};">${bodyFont}</span></div>
    </div>
    ${(DS.typo||[]).map(t=>{
      const ff = isHeading(t.name) ? headingFF : bodyFF;
      return `<div style="display:flex;align-items:baseline;gap:12px;padding:8px 0;border-bottom:1px solid ${colors.border};">
      <div style="width:60px;font-size:10px;color:${ha(kitFg,.4)};font-family:monospace;flex-shrink:0;">${t.name}</div>
      <div style="font-size:${t.size};font-weight:${t.weight};line-height:${t.lh};font-family:${ff};">Sample Text</div>
      <div style="margin-left:auto;font-size:10px;font-family:monospace;opacity:.3;">${t.size}</div></div>`;
    }).join('')}
  </div>`;

  // ── Component sections ──
  const R = getRenderers(DS);
  const annotatedSet = new Set(annotations.map(a => a.typeId));
  const annoCountMap = {};
  annotations.forEach(a => { annoCountMap[a.typeId] = (annoCountMap[a.typeId]||0) + 1; });

  const compSections = ordered.map(id => {
    if (!R[id]) return '';
    const isAnnotated = annotatedSet.has(id);
    const count = annoCountMap[id] || 0;
    const badge = isAnnotated
      ? `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;background:${ha(colors.primary,.1)};color:${colors.primary};margin-left:8px;">⊕ ${count} Annotated</span>`
      : '';

    let html = R[id]();
    if (badge) html = html.replace('</div>', `${badge}</div>`);
    if (isAnnotated) {
      const annoSection = renderAnnotatedSection(DS, annotations, id);
      html = html.replace(/<\/div>\s*$/, `${annoSection}</div>`);
    }
    return html;
  }).join('');

  // ── Analysis badge ──
  const aiCount = analysisLog.filter(l => l.method === 'ai').length;
  const localCount = analysisLog.filter(l => l.method === 'local').length;
  const providers = [...new Set(analysisLog.filter(l => l.method === 'ai').map(l => l.provider))];
  let analysisBadge = '';
  if (aiCount > 0) {
    analysisBadge = `<div style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;background:${ha(colors.primary,.08)};font-size:10px;font-weight:600;margin-top:4px;">
      <span style="color:${colors.primary};">AI: ${aiCount}</span>${localCount>0?`<span style="opacity:.4;">·</span><span style="opacity:.5;">Local: ${localCount}</span>`:''}
      <span style="opacity:.3;">via ${providers.join(', ')}</span></div>`;
  } else if (localCount > 0) {
    analysisBadge = `<div style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;background:${ha('#f59e0b',.1)};font-size:10px;font-weight:600;color:#b45309;margin-top:4px;">Local pixel analysis only (no AI)</div>`;
  }

  // ── Final assembly ──
  return `<div style="background:${kitBg};color:${kitFg};border-radius:20px;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div><div style="font-size:10px;font-weight:700;letter-spacing:.1em;opacity:.3;margin-bottom:4px;">GENERATED DESIGN SYSTEM</div>
        <div style="font-size:22px;font-weight:800;">UI Kit</div>${analysisBadge}</div>
      <div style="display:flex;align-items:center;gap:6px;">
        <div style="width:10px;height:10px;border-radius:50%;background:${colors.primary};"></div>
        <span style="font-size:11px;font-family:monospace;opacity:.4;">${isDark?'Dark':'Light'} · ${(allColors||[]).length} colors · 26 components</span></div>
    </div>
    ${paletteSection}${typoSection}${compSections}
  </div>`;
}
