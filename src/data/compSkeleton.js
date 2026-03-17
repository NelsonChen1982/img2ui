import { isLight, ha, darken, lighten } from '../services/colorUtils.js';

export const COMP_SKELETON = {
  tooltip: {
    promptSlots: '{ "bgColor":"#hex", "textColor":"#hex", "borderRadius":"Npx", "shadow":"box-shadow or none", "padding":"Npx Npx", "fontSize":"Npx", "arrowDirection":"top|bottom|left|right", "maxWidth":"Npx or auto" }',
    multiMode: 'variant', // multiple → light/dark variants or arrow directions
    render(s, ds) {
      const bg=s.bgColor||(ds.isDark?ds.colors.surface:ds.colors.text);
      const fg=s.textColor||(ds.isDark?ds.colors.text:ds.colors.surface);
      const r=s.borderRadius||'6px'; const sh=s.shadow||ds.shadows.sm;
      const pad=s.padding||'8px 14px'; const fs=s.fontSize||'12px';
      const dir=s.arrowDirection||'bottom'; const mw=s.maxWidth||'240px';
      const arrowCSS={top:'bottom:100%;left:16px;border-bottom:5px solid '+bg+';border-left:5px solid transparent;border-right:5px solid transparent',
        bottom:'top:100%;left:16px;border-top:5px solid '+bg+';border-left:5px solid transparent;border-right:5px solid transparent',
        left:'right:100%;top:8px;border-right:5px solid '+bg+';border-top:5px solid transparent;border-bottom:5px solid transparent',
        right:'left:100%;top:8px;border-left:5px solid '+bg+';border-top:5px solid transparent;border-bottom:5px solid transparent'}[dir]||'';
      return `<div style="position:relative;display:inline-block;max-width:${mw};">
        <div style="background:${bg};color:${fg};border-radius:${r};padding:${pad};font-size:${fs};box-shadow:${sh};line-height:1.4;">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.</div>
        <div style="position:absolute;width:0;height:0;${arrowCSS}"></div></div>`;
    }
  },
  button: {
    promptSlots: '{ "variant":"filled|outline|ghost|soft", "bgColor":"#hex or transparent", "textColor":"#hex", "borderRadius":"Npx", "border":"none or Npx solid #hex", "padding":"Npx Npx", "fontSize":"Npx", "fontWeight":"400-800", "shadow":"box-shadow or none", "label":"visible text" }',
    multiMode: 'variant',
    render(s, ds) {
      const bg=s.bgColor||ds.colors.primary; const fg=s.textColor||(isLight(bg)?'#333':'#fff');
      const r=s.borderRadius||'8px'; const pad=s.padding||'8px 18px';
      const fs=s.fontSize||'13px'; const fw=s.fontWeight||'600';
      const border=s.border||'none'; const sh=s.shadow||'none';
      const label=s.label||s.variant||'Button';
      return `<div style="display:inline-block;padding:${pad};border-radius:${r};font-weight:${fw};font-size:${fs};background:${bg};color:${fg};border:${border};box-shadow:${sh};cursor:pointer;">${label}</div>`;
    },
    renderVariants(slots, ds) {
      const first=slots[0]||{}; const bg=first.bgColor||ds.colors.primary;
      const r=first.borderRadius||'8px'; const pad=first.padding||'8px 18px';
      const fs=first.fontSize||'13px';
      return `<div style="font-size:10px;font-weight:700;color:#aaa;margin-bottom:8px;margin-top:10px;">DESIGN SYSTEM VARIANTS</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <div style="padding:${pad};border-radius:${r};font-weight:600;font-size:${fs};background:${bg};color:${isLight(bg)?'#333':'#fff'};box-shadow:0 4px 12px ${ha(bg,.25)};">Filled</div>
          <div style="padding:${pad};border-radius:${r};font-weight:600;font-size:${fs};background:transparent;color:${bg};border:2px solid ${bg};">Outline</div>
          <div style="padding:${pad};border-radius:${r};font-weight:600;font-size:${fs};background:${ha(bg,.1)};color:${bg};">Soft</div>
          <div style="padding:${pad};font-weight:600;font-size:${fs};color:${bg};text-decoration:underline;">Ghost</div>
        </div>`;
    }
  },
  select: {
    promptSlots: '{ "state":"collapsed|expanded", "triggerBg":"#hex", "triggerBorder":"Npx solid #hex", "triggerRadius":"Npx", "textColor":"#hex", "chevronColor":"#hex", "height":"Npx", "menuBg":"#hex", "menuShadow":"box-shadow", "menuRadius":"Npx", "itemHeight":"Npx", "itemHoverBg":"#hex", "activeColor":"#hex", "divider":"none or 1px solid #hex" }',
    multiMode: 'state',
    render(s, ds) {
      const isExpanded=s.state==='expanded';
      const tBg=s.triggerBg||(ds.isDark?'rgba(255,255,255,.04)':'white');
      const tBorder=s.triggerBorder||`1.5px solid ${ds.colors.border}`;
      const tRadius=s.triggerRadius||'8px'; const fg=s.textColor||(ds.isDark?'#ddd':'#333');
      const chev=s.chevronColor||'#999'; const h=s.height||'38px';
      let html=`<div style="width:220px;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;height:${h};border-radius:${tRadius};border:${tBorder};background:${tBg};color:${fg};font-size:13px;">
          <span>Selected item</span><span style="color:${chev};font-size:10px;">${isExpanded?'▴':'▾'}</span></div>`;
      if(isExpanded){
        const mBg=s.menuBg||(ds.isDark?'#1a1a1a':'white');
        const mSh=s.menuShadow||ds.shadows.lg; const mR=s.menuRadius||'8px';
        const iH=s.itemHeight||'36px'; const hover=s.itemHoverBg||(ds.isDark?'rgba(255,255,255,.05)':'#f5f5f5');
        const active=s.activeColor||ds.colors.primary;
        const div=s.divider||'none';
        html+=`<div style="margin-top:4px;background:${mBg};border-radius:${mR};box-shadow:${mSh};overflow:hidden;border:1px solid ${ds.colors.border};">
          <div style="height:${iH};padding:0 12px;display:flex;align-items:center;font-size:13px;color:${fg};border-bottom:${div};">Item 1</div>
          <div style="height:${iH};padding:0 12px;display:flex;align-items:center;justify-content:space-between;font-size:13px;background:${hover};color:${fg};border-bottom:${div};font-weight:500;">Item 2 <span style="color:${active};">✓</span></div>
          <div style="height:${iH};padding:0 12px;display:flex;align-items:center;font-size:13px;color:${fg};">Item 3</div></div>`;
      }
      html+='</div>';
      return html;
    }
  },
  card: {
    promptSlots: '{ "bgColor":"#hex", "textColor":"#hex", "borderRadius":"Npx", "border":"none or value", "shadow":"box-shadow or none", "padding":"Npx", "hasImage":true/false, "hasFooter":true/false }',
    multiMode: 'variant',
    render(s, ds) {
      const bg=s.bgColor||(ds.isDark?'#1a1a1a':'#fff'); const fg=s.textColor||(ds.isDark?'#eee':'#333');
      const r=s.borderRadius||'12px'; const border=s.border||`1px solid ${ds.colors.border}`;
      const sh=s.shadow||'none'; const pad=s.padding||'16px';
      let html=`<div style="border-radius:${r};padding:${pad};background:${bg};border:${border};box-shadow:${sh};max-width:260px;">`;
      if(s.hasImage) html+=`<div style="height:100px;border-radius:${Math.max(0,parseInt(r)-4)}px;background:${ha(ds.colors.primary,.08)};margin:-${parseInt(pad)/2}px -${parseInt(pad)/2}px ${pad} -${parseInt(pad)/2}px;display:flex;align-items:center;justify-content:center;font-size:28px;color:${ha(fg,.2)};">▣</div>`;
      html+=`<div style="font-size:15px;font-weight:700;color:${fg};margin-bottom:4px;">Card Title</div>
        <div style="font-size:12px;color:${ha(fg,.6)};line-height:1.5;margin-bottom:${s.hasFooter?'12px':'0'};">Description text goes here.</div>`;
      if(s.hasFooter) html+=`<div style="padding-top:10px;border-top:1px solid ${ha(fg,.08)};display:flex;gap:8px;">
        <div style="padding:5px 12px;border-radius:6px;background:${ds.colors.primary};color:${isLight(ds.colors.primary)?'#333':'#fff'};font-size:11px;font-weight:600;">Action</div>
        <div style="padding:5px 12px;border-radius:6px;border:1px solid ${ds.colors.border};font-size:11px;color:${ha(fg,.6)};">Cancel</div></div>`;
      html+='</div>';
      return html;
    }
  },
  navbar: {
    promptSlots: '{ "bgColor":"#hex", "textColor":"#hex", "linkColor":"#hex", "activeLinkColor":"#hex", "ctaBg":"#hex", "ctaColor":"#hex", "height":"Npx", "borderBottom":"none or value", "borderRadius":"Npx", "shadow":"box-shadow or none" }',
    multiMode: 'variant',
    render(s, ds) {
      const bg=s.bgColor||ds.colors.primary; const fg=s.textColor||(isLight(bg)?'#333':'#fff');
      const link=s.linkColor||ha(fg,.55); const active=s.activeLinkColor||fg;
      const ctaBg=s.ctaBg||fg; const ctaFg=s.ctaColor||bg;
      const r=s.borderRadius||'10px'; const sh=s.shadow||'none';
      return `<div style="background:${bg};border-radius:${r};padding:12px 16px;display:flex;align-items:center;justify-content:space-between;box-shadow:${sh};border-bottom:${s.borderBottom||'none'};">
        <div style="font-weight:800;color:${fg};font-size:15px;">Brand</div>
        <div style="display:flex;gap:16px;">${['Home','Product','About'].map((l,j)=>`<span style="color:${j===0?active:link};font-size:13px;font-weight:${j===0?600:400};">${l}</span>`).join('')}</div>
        <div style="padding:5px 12px;border-radius:6px;background:${ctaBg};color:${ctaFg};font-size:12px;font-weight:700;">CTA</div></div>`;
    }
  },
  input: {
    promptSlots: '{ "state":"default|focus|error|disabled", "bgColor":"#hex", "textColor":"#hex", "borderColor":"#hex", "focusBorderColor":"#hex", "borderRadius":"Npx", "padding":"Npx Npx", "fontSize":"Npx", "labelPosition":"top|floating|inline", "placeholderColor":"#hex" }',
    multiMode: 'state',
    render(s, ds) {
      const bg=s.bgColor||(ds.isDark?'rgba(255,255,255,.04)':'white');
      const fg=s.textColor||(ds.isDark?'#ddd':'#333');
      const bc=s.state==='focus'?(s.focusBorderColor||ds.colors.primary):s.state==='error'?'#e05050':(s.borderColor||ds.colors.border);
      const r=s.borderRadius||'8px'; const pad=s.padding||'8px 12px';
      const fs=s.fontSize||'13px'; const ph=s.placeholderColor||'#aaa';
      const ring=s.state==='focus'?`box-shadow:0 0 0 3px ${ha(bc,.15)};`:s.state==='error'?`box-shadow:0 0 0 3px ${ha(bc,.12)};`:'';
      const disabled=s.state==='disabled';
      let html='<div style="max-width:240px;">';
      if(s.labelPosition!=='inline') html+=`<label style="font-size:12px;font-weight:600;margin-bottom:4px;display:block;color:${disabled?'#aaa':fg};">Label</label>`;
      html+=`<input style="width:100%;padding:${pad};border-radius:${r};border:1.5px solid ${bc};font-size:${fs};background:${disabled?'#f5f5f5':bg};color:${disabled?'#aaa':fg};outline:none;${ring}" placeholder="Placeholder…" ${disabled?'disabled':''}${s.state==='focus'?' value="Focused input"':''}${s.state==='error'?' value="Invalid value"':''}>`;
      if(s.state==='error') html+=`<div style="font-size:11px;color:#e05050;margin-top:3px;">Error message</div>`;
      html+='</div>';
      return html;
    }
  },
  alert: {
    promptSlots: '{ "type":"info|success|warning|error", "accentColor":"#hex", "bgColor":"#hex", "textColor":"#hex", "borderRadius":"Npx", "borderStyle":"left-bar|full-border|none", "icon":"emoji or none", "padding":"Npx Npx" }',
    multiMode: 'variant',
    render(s, ds) {
      const accent=s.accentColor||ds.colors.primary;
      const bg=s.bgColor||ha(accent,.08); const fg=s.textColor||(ds.isDark?'#ccc':'#555');
      const r=s.borderRadius||'8px'; const pad=s.padding||'10px 14px';
      const icons={info:'i',success:'✓',warning:'!',error:'✕'};
      const icon=s.icon||icons[s.type]||'i';
      const border=s.borderStyle==='full-border'?`border:1px solid ${ha(accent,.3)};`:s.borderStyle==='none'?'':`border-left:3px solid ${accent};`;
      return `<div style="padding:${pad};border-radius:${r};background:${bg};${border}font-size:13px;display:flex;align-items:center;gap:10px;">
        <div style="width:22px;height:22px;border-radius:50%;background:${ha(accent,.15)};display:flex;align-items:center;justify-content:center;font-size:11px;color:${accent};font-weight:700;flex-shrink:0;">${icon}</div>
        <div><strong style="color:${accent};">${(s.type||'Info')}:</strong> <span style="color:${fg};">Alert message content here.</span></div></div>`;
    }
  },
  badge: {
    promptSlots: '{ "variant":"filled|soft|outline", "bgColor":"#hex", "textColor":"#hex", "borderRadius":"Npx", "padding":"Npx Npx", "fontSize":"Npx", "border":"none or value", "label":"text" }',
    multiMode: 'variant',
    render(s, ds) {
      const bg=s.bgColor||ds.colors.primary; const fg=s.textColor||(isLight(bg)?'#333':'#fff');
      const r=s.borderRadius||'999px'; const pad=s.padding||'3px 10px';
      const fs=s.fontSize||'11px'; const border=s.border||'none';
      return `<span style="display:inline-block;padding:${pad};border-radius:${r};font-size:${fs};font-weight:600;background:${bg};color:${fg};border:${border};">${s.label||'Badge'}</span>`;
    },
    renderVariants(slots, ds) {
      const first=slots[0]||{}; const bg=first.bgColor||ds.colors.primary; const r=first.borderRadius||'999px';
      const pad=first.padding||'3px 10px'; const fs=first.fontSize||'11px';
      return `<div style="font-size:10px;font-weight:700;color:#aaa;margin-top:10px;margin-bottom:6px;">SOFT + OUTLINE</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <span style="padding:${pad};border-radius:${r};font-size:${fs};font-weight:500;background:${ha(bg,.12)};color:${bg};">Soft</span>
          <span style="padding:${pad};border-radius:${r};font-size:${fs};font-weight:500;border:1.5px solid ${bg};color:${bg};background:transparent;">Outline</span></div>`;
    }
  },
  toggle: {
    promptSlots: '{ "state":"on|off", "trackOnColor":"#hex", "trackOffColor":"#hex", "thumbColor":"#hex", "borderRadius":"Npx", "width":"Npx", "height":"Npx" }',
    multiMode: 'state',
    render(s, ds) {
      const isOn=s.state!=='off';
      const trackOn=s.trackOnColor||ds.colors.primary; const trackOff=s.trackOffColor||ds.colors.border;
      const thumb=s.thumbColor||'white'; const w=parseInt(s.width)||40; const h=parseInt(s.height)||22;
      const thumbSz=h-4; const r=s.borderRadius||(h/2+'px');
      return `<div style="display:flex;align-items:center;gap:8px;">
        <div style="width:${w}px;height:${h}px;border-radius:${r};background:${isOn?trackOn:trackOff};position:relative;transition:background .2s;">
          <div style="width:${thumbSz}px;height:${thumbSz}px;border-radius:50%;background:${thumb};position:absolute;${isOn?'right':'left'}:2px;top:2px;box-shadow:0 1px 3px rgba(0,0,0,.2);"></div></div>
        <span style="font-size:12px;color:${isOn?(ds.isDark?'#eee':'#333'):'#999'};">${isOn?'On':'Off'}</span></div>`;
    }
  },
  checkbox: {
    promptSlots: '{ "state":"checked|unchecked|indeterminate", "checkColor":"#hex", "borderColor":"#hex", "bgColor":"#hex", "borderRadius":"Npx", "size":"Npx" }',
    multiMode: 'state',
    render(s, ds) {
      const checked=s.state==='checked'; const indet=s.state==='indeterminate';
      const chk=s.checkColor||ds.colors.primary; const bc=s.borderColor||ds.colors.border;
      const sz=parseInt(s.size)||18; const r=s.borderRadius||'4px';
      const inner=checked?`<svg width="${sz*.55}" height="${sz*.44}" fill="none"><path d="M1 ${sz*.22}l${sz*.14} ${sz*.14}L${sz*.5} 1" stroke="${isLight(chk)?ds.colors.text:'white'}" stroke-width="1.8" stroke-linecap="round"/></svg>`
        :indet?`<div style="width:${sz*.44}px;height:2px;background:${isLight(chk)?ds.colors.text:'white'};border-radius:1px;"></div>`:'';
      return `<div style="display:flex;align-items:center;gap:8px;">
        <div style="width:${sz}px;height:${sz}px;border-radius:${r};background:${checked||indet?chk:'transparent'};border:${checked||indet?'none':'2px solid '+bc};display:flex;align-items:center;justify-content:center;">${inner}</div>
        <span style="font-size:13px;">${s.state||'Checkbox'}</span></div>`;
    }
  },
  modal: {
    promptSlots: '{ "overlayOpacity":"0-1", "cardBg":"#hex", "cardRadius":"Npx", "cardShadow":"box-shadow", "headerBorder":"none or value", "footerBorder":"none or value", "closeBtnStyle":"icon|text", "padding":"Npx" }',
    multiMode: 'variant',
    render(s, ds) {
      const bg=s.cardBg||(ds.isDark?'#1a1a1a':'white'); const r=s.cardRadius||'14px';
      const sh=s.cardShadow||ds.shadows.lg; const pad=s.padding||'24px';
      const hBorder=s.headerBorder||'none'; const fBorder=s.footerBorder||`1px solid ${ds.colors.border}`;
      return `<div style="max-width:360px;background:${bg};border-radius:${r};padding:${pad};box-shadow:${sh};border:1px solid ${ds.colors.border};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:${hBorder!=='none'?'8px':'0'};border-bottom:${hBorder};">
          <div style="font-size:16px;font-weight:700;color:${ds.isDark?'#eee':'#222'};">Dialog Title</div>
          <div style="width:24px;height:24px;border-radius:6px;background:${ds.isDark?'#333':'#f0f0f0'};display:flex;align-items:center;justify-content:center;font-size:12px;color:#999;">✕</div></div>
        <div style="font-size:13px;color:${ds.isDark?'#888':'#666'};margin-bottom:20px;line-height:1.5;">Are you sure? This action cannot be undone.</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:${fBorder!=='none'?'12px':'0'};border-top:${fBorder};">
          <div style="padding:7px 16px;border-radius:8px;border:1px solid ${ds.colors.border};font-size:12px;color:${ds.isDark?'#888':'#666'};">Cancel</div>
          <div style="padding:7px 16px;border-radius:8px;background:${ds.colors.primary};color:${isLight(ds.colors.primary)?ds.colors.text:'white'};font-size:12px;font-weight:600;">Confirm</div></div></div>`;
    }
  },
  toast: {
    promptSlots: '{ "bgColor":"#hex", "textColor":"#hex", "borderRadius":"Npx", "shadow":"box-shadow", "iconColor":"#hex", "hasAction":true/false, "actionColor":"#hex" }',
    multiMode: 'variant',
    render(s, ds) {
      const bg=s.bgColor||(ds.isDark?ds.colors.surface:ds.colors.text);
      const fg=s.textColor||(ds.isDark?ds.colors.text:ds.colors.surface);
      const r=s.borderRadius||'10px'; const sh=s.shadow||ds.shadows.lg;
      const ic=s.iconColor||ds.colors.primary;
      let html=`<div style="display:inline-flex;align-items:center;gap:10px;padding:10px 16px;border-radius:${r};background:${bg};box-shadow:${sh};">
        <div style="width:8px;height:8px;border-radius:50%;background:${ic};flex-shrink:0;"></div>
        <span style="font-size:13px;color:${fg};">Operation completed.</span>`;
      if(s.hasAction!==false) html+=`<span style="font-size:12px;font-weight:600;color:${s.actionColor||ds.colors.primary};cursor:pointer;">Undo</span>`;
      html+='</div>';
      return html;
    }
  },
  tabs: {
    promptSlots: '{ "activeStyle":"underline|filled|pill", "activeBg":"#hex", "activeColor":"#hex", "inactiveColor":"#hex", "borderColor":"#hex", "fontSize":"Npx", "padding":"Npx Npx", "borderRadius":"Npx" }',
    multiMode: 'variant',
    render(s, ds) {
      const style=s.activeStyle||'underline'; const activeBg=s.activeBg||ds.colors.primary;
      const activeFg=s.activeColor||(style==='underline'?ds.colors.primary:(isLight(activeBg)?ds.colors.text:'white'));
      const inactive=s.inactiveColor||(ds.isDark?'#777':'#999');
      const tabs=['Active','Tab 2','Tab 3'];
      if(style==='pill') return `<div style="display:flex;gap:4px;">${tabs.map((l,i)=>`<div style="padding:${s.padding||'6px 14px'};border-radius:${s.borderRadius||'999px'};font-size:${s.fontSize||'12px'};font-weight:${i===0?600:400};background:${i===0?activeBg:'transparent'};color:${i===0?activeFg:inactive};border:${i===0?'none':'1px solid '+ds.colors.border};">${l}</div>`).join('')}</div>`;
      if(style==='filled') return `<div style="display:flex;gap:0;background:${ds.isDark?'#222':'#f0f0f0'};border-radius:${s.borderRadius||'8px'};padding:3px;">${tabs.map((l,i)=>`<div style="padding:${s.padding||'6px 14px'};border-radius:${parseInt(s.borderRadius||'8')-2}px;font-size:${s.fontSize||'12px'};font-weight:${i===0?600:400};background:${i===0?activeBg:'transparent'};color:${i===0?activeFg:inactive};">${l}</div>`).join('')}</div>`;
      return `<div style="display:flex;gap:0;border-bottom:2px solid ${s.borderColor||ds.colors.border};">${tabs.map((l,i)=>`<div style="padding:${s.padding||'8px 16px'};font-size:${s.fontSize||'13px'};font-weight:${i===0?600:400};color:${i===0?activeFg:inactive};border-bottom:2px solid ${i===0?activeFg:'transparent'};margin-bottom:-2px;">${l}</div>`).join('')}</div>`;
    }
  },
  search: { promptSlots: '{ "bgColor":"#hex", "borderColor":"#hex", "borderRadius":"Npx", "iconPosition":"left|right", "fontSize":"Npx", "padding":"Npx Npx" }', multiMode: 'variant',
    render(s, ds) { const bg=s.bgColor||(ds.isDark?'rgba(255,255,255,.04)':'white'); const bc=s.borderColor||ds.colors.border; const r=s.borderRadius||'8px';
      return `<div style="max-width:300px;position:relative;"><input style="width:100%;padding:${s.padding||'8px 12px 8px 34px'};border-radius:${r};border:1.5px solid ${bc};font-size:${s.fontSize||'13px'};background:${bg};color:${ds.isDark?'#ddd':'#333'};outline:none;" placeholder="Search…">
        <div style="position:absolute;${s.iconPosition==='right'?'right':'left'}:12px;top:50%;transform:translateY(-50%);color:#aaa;font-size:13px;">⌕</div></div>`; }
  },
  pagination: { promptSlots: '{ "activeBg":"#hex", "activeColor":"#hex", "inactiveColor":"#hex", "borderRadius":"Npx", "border":"none or value", "fontSize":"Npx" }', multiMode: 'variant',
    render(s, ds) { const bg=s.activeBg||ds.colors.primary; const fg=s.activeColor||(isLight(bg)?ds.colors.text:'white'); const r=s.borderRadius||'6px';
      return `<div style="display:flex;gap:4px;align-items:center;">${['‹',1,2,3,'…',10,'›'].map(n=>`<div style="padding:5px 10px;border-radius:${r};font-size:${s.fontSize||'12px'};font-weight:${n===1?700:400};background:${n===1?bg:'transparent'};color:${n===1?fg:(s.inactiveColor||(ds.isDark?'#888':'#666'))};border:${n===1?'none':(s.border||'1px solid '+ds.colors.border)};">${n}</div>`).join('')}</div>`; }
  },
  avatar: { promptSlots: '{ "shape":"circle|square", "bgColor":"#hex", "textColor":"#hex", "size":"Npx", "borderRadius":"Npx", "statusDot":true/false, "statusColor":"#hex" }', multiMode: 'variant',
    render(s, ds) { const bg=s.bgColor||ha(ds.colors.primary,.15); const fg=s.textColor||ds.colors.primary; const sz=parseInt(s.size)||40; const r=s.shape==='square'?(s.borderRadius||'8px'):'50%';
      let html=`<div style="position:relative;display:inline-block;"><div style="width:${sz}px;height:${sz}px;border-radius:${r};background:${bg};display:flex;align-items:center;justify-content:center;font-size:${Math.round(sz*.36)}px;font-weight:700;color:${fg};">AB</div>`;
      if(s.statusDot) html+=`<div style="position:absolute;bottom:0;right:0;width:${Math.round(sz*.28)}px;height:${Math.round(sz*.28)}px;border-radius:50%;background:${s.statusColor||'#4ade80'};border:2px solid white;"></div>`;
      html+='</div>'; return html; }
  },
  hero: {
    promptSlots: '{ "bgColor":"#hex", "textColor":"#hex", "ctaBg":"#hex", "ctaColor":"#hex", "ctaRadius":"Npx", "alignment":"left|center|right", "hasSubtitle":true/false, "hasImage":true/false, "overlayOpacity":"0-1 or none", "padding":"Npx" }',
    multiMode: 'variant',
    render(s, ds) {
      const bg=s.bgColor||ds.colors.primary; const fg=s.textColor||(isLight(bg)?ds.colors.text:'white');
      const ctaBg=s.ctaBg||(isLight(bg)?ds.colors.text:'white'); const ctaFg=s.ctaColor||(isLight(ctaBg)?'white':ds.colors.text);
      const r=s.ctaRadius||'8px'; const align=s.alignment||'center'; const pad=s.padding||'40px';
      return `<div style="background:${bg};padding:${pad};border-radius:14px;text-align:${align};">
        <div style="font-size:24px;font-weight:800;color:${fg};margin-bottom:8px;">Hero Headline</div>
        ${s.hasSubtitle!==false?`<div style="font-size:14px;color:${ha(fg,.6)};margin-bottom:20px;">Supporting description text for the hero section.</div>`:''}
        <div style="display:${align==='center'?'flex':'inline-flex'};justify-content:${align};gap:10px;">
          <div style="padding:10px 24px;border-radius:${r};background:${ctaBg};color:${ctaFg};font-size:14px;font-weight:700;">Primary CTA</div>
          <div style="padding:10px 24px;border-radius:${r};border:1.5px solid ${ha(fg,.3)};color:${fg};font-size:14px;">Secondary</div>
        </div></div>`;
    }
  },
  section: {
    promptSlots: '{ "bgColor":"#hex", "textColor":"#hex", "headingSize":"Npx", "padding":"Npx", "borderRadius":"Npx", "border":"none or value", "divider":"none or value", "alignment":"left|center" }',
    multiMode: 'variant',
    render(s, ds) {
      const bg=s.bgColor||(ds.isDark?'rgba(255,255,255,.02)':'rgba(0,0,0,.01)');
      const fg=s.textColor||(ds.isDark?'#ddd':'#333'); const hs=s.headingSize||'18px';
      const pad=s.padding||'24px'; const r=s.borderRadius||'12px';
      return `<div style="background:${bg};padding:${pad};border-radius:${r};border:${s.border||'none'};">
        <div style="font-size:${hs};font-weight:700;color:${fg};margin-bottom:8px;text-align:${s.alignment||'left'};">Section Title</div>
        <div style="font-size:13px;color:${ha(fg,.6)};line-height:1.6;">Content area for this section. Supports multiple child elements.</div></div>`;
    }
  },
  sidebar: {
    promptSlots: '{ "bgColor":"#hex", "textColor":"#hex", "activeItemBg":"#hex", "activeItemColor":"#hex", "itemPadding":"Npx Npx", "borderRadius":"Npx", "width":"Npx", "divider":"none or value" }',
    multiMode: 'variant',
    render(s, ds) {
      const bg=s.bgColor||(ds.isDark?'#111':'#fafafa'); const fg=s.textColor||(ds.isDark?'#ccc':'#555');
      const aBg=s.activeItemBg||ha(ds.colors.primary,.1); const aFg=s.activeItemColor||ds.colors.primary;
      const pad=s.itemPadding||'8px 12px'; const r=s.borderRadius||'8px';
      const items=['Dashboard','Analytics','Settings','Users'];
      return `<div style="width:${s.width||'200px'};background:${bg};border-radius:12px;padding:8px;border:1px solid ${ds.colors.border};">
        ${items.map((l,i)=>`<div style="padding:${pad};border-radius:${r};margin-bottom:2px;font-size:13px;font-weight:${i===0?600:400};background:${i===0?aBg:'transparent'};color:${i===0?aFg:fg};cursor:pointer;">${l}</div>`).join('')}</div>`;
    }
  },
  footer: {
    promptSlots: '{ "bgColor":"#hex", "textColor":"#hex", "linkColor":"#hex", "borderTop":"none or value", "padding":"Npx", "fontSize":"Npx", "columns":2/3/4 }',
    multiMode: 'variant',
    render(s, ds) {
      const bg=s.bgColor||(ds.isDark?'#0a0a0a':'#f5f5f5'); const fg=s.textColor||(ds.isDark?'#888':'#666');
      const link=s.linkColor||ds.colors.primary; const pad=s.padding||'20px';
      const cols=s.columns||3; const fs=s.fontSize||'12px';
      const colData=[['Product','Features','Pricing'],['Company','About','Careers'],['Support','Help Center','Contact']];
      return `<div style="background:${bg};padding:${pad};border-radius:12px;border-top:${s.borderTop||'none'};">
        <div style="display:flex;gap:24px;margin-bottom:16px;">${colData.slice(0,cols).map(col=>`<div style="flex:1;">
          <div style="font-size:${fs};font-weight:700;color:${fg};margin-bottom:8px;">${col[0]}</div>
          ${col.slice(1).map(l=>`<div style="font-size:${fs};color:${link};margin-bottom:4px;">${l}</div>`).join('')}</div>`).join('')}</div>
        <div style="font-size:11px;color:${ha(fg,.5)};border-top:1px solid ${ds.colors.border};padding-top:12px;">© 2026 Brand. All rights reserved.</div></div>`;
    }
  },
  breadcrumb: {
    promptSlots: '{ "separatorChar":"/|>|→", "activeColor":"#hex", "inactiveColor":"#hex", "fontSize":"Npx", "gap":"Npx" }',
    multiMode: 'variant',
    render(s, ds) {
      const active=s.activeColor||(ds.isDark?'#eee':'#222'); const inactive=s.inactiveColor||(ds.isDark?'#666':'#999');
      const sep=s.separatorChar||'/'; const fs=s.fontSize||'13px'; const gap=s.gap||'6px';
      const items=['Home','Products','Category','Current'];
      return `<div style="display:flex;align-items:center;gap:${gap};font-size:${fs};">${items.map((l,i)=>{
        const isLast=i===items.length-1;
        return `${i>0?`<span style="color:${inactive};opacity:.5;">${sep}</span>`:''}<span style="color:${isLast?active:inactive};font-weight:${isLast?600:400};${!isLast?'cursor:pointer;':''}">${l}</span>`;
      }).join('')}</div>`;
    }
  },
  stepper: {
    promptSlots: '{ "activeColor":"#hex", "completedColor":"#hex", "inactiveColor":"#hex", "lineColor":"#hex", "size":"Npx", "fontSize":"Npx", "orientation":"horizontal|vertical" }',
    multiMode: 'variant',
    render(s, ds) {
      const active=s.activeColor||ds.colors.primary; const done=s.completedColor||'#4ade80';
      const inactive=s.inactiveColor||ds.colors.border; const line=s.lineColor||ds.colors.border;
      const sz=parseInt(s.size)||28; const fs=s.fontSize||'11px';
      const steps=['Account','Details','Review','Done'];
      return `<div style="display:flex;align-items:center;gap:0;">${steps.map((l,i)=>{
        const color=i<1?done:i===1?active:inactive; const fg=i<=1?'white':ha(ds.isDark?'#fff':'#333',.4);
        const check=i<1?`<svg width="12" height="10" fill="none"><path d="M1 5l3 3L11 1" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>`:`<span style="font-size:${fs};color:${fg};">${i+1}</span>`;
        return `${i>0?`<div style="width:28px;height:2px;background:${i<=1?done:line};"></div>`:''}<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;">${check}</div>
          <span style="font-size:${fs};color:${i<=1?(ds.isDark?'#eee':'#333'):(ds.isDark?'#666':'#999')};font-weight:${i===1?600:400};">${l}</span></div>`;
      }).join('')}</div>`;
    }
  },
  list: {
    promptSlots: '{ "bgColor":"#hex", "textColor":"#hex", "divider":"none or value", "itemPadding":"Npx Npx", "borderRadius":"Npx", "hoverBg":"#hex", "hasAvatar":true/false, "hasAction":true/false }',
    multiMode: 'variant',
    render(s, ds) {
      const bg=s.bgColor||(ds.isDark?'#1a1a1a':'white'); const fg=s.textColor||(ds.isDark?'#ddd':'#333');
      const div=s.divider||`1px solid ${ds.colors.border}`; const pad=s.itemPadding||'10px 14px';
      const r=s.borderRadius||'10px';
      const items=['List item one','List item two','List item three'];
      return `<div style="background:${bg};border-radius:${r};border:1px solid ${ds.colors.border};overflow:hidden;max-width:280px;">
        ${items.map((l,i)=>`<div style="padding:${pad};display:flex;align-items:center;gap:10px;${i<items.length-1?'border-bottom:'+div:''};font-size:13px;color:${fg};">
          ${s.hasAvatar!==false?`<div style="width:28px;height:28px;border-radius:50%;background:${ha(ds.colors.primary,.12)};flex-shrink:0;"></div>`:''}
          <div style="flex:1;"><div style="font-weight:500;">${l}</div><div style="font-size:11px;color:${ha(fg,.5)};">Description</div></div>
          ${s.hasAction?`<span style="font-size:11px;color:${ds.colors.primary};">→</span>`:''}</div>`).join('')}</div>`;
    }
  },
  table: {
    promptSlots: '{ "headerBg":"#hex", "headerColor":"#hex", "rowBg":"#hex", "altRowBg":"#hex", "textColor":"#hex", "borderColor":"#hex", "borderRadius":"Npx", "fontSize":"Npx" }',
    multiMode: 'variant',
    render(s, ds) {
      const hBg=s.headerBg||(ds.isDark?'rgba(255,255,255,.05)':'#f8f8f8');
      const hFg=s.headerColor||(ds.isDark?'#aaa':'#666');
      const rBg=s.rowBg||(ds.isDark?'transparent':'white');
      const alt=s.altRowBg||(ds.isDark?'rgba(255,255,255,.02)':'#fafafa');
      const fg=s.textColor||(ds.isDark?'#ddd':'#333'); const bc=s.borderColor||ds.colors.border;
      const fs=s.fontSize||'12px'; const r=s.borderRadius||'8px';
      return `<div style="border-radius:${r};border:1px solid ${bc};overflow:hidden;max-width:360px;">
        <div style="display:flex;background:${hBg};padding:8px 12px;font-size:${fs};font-weight:700;color:${hFg};">
          <div style="flex:2;">Name</div><div style="flex:1;">Status</div><div style="flex:1;text-align:right;">Value</div></div>
        ${[['Item A','Active','$120'],['Item B','Pending','$85']].map((row,i)=>`<div style="display:flex;padding:8px 12px;font-size:${fs};color:${fg};background:${i%2?alt:rBg};border-top:1px solid ${bc};">
          <div style="flex:2;">${row[0]}</div><div style="flex:1;"><span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;background:${row[1]==='Active'?ha('#4ade80',.15):ha('#f59e0b',.15)};color:${row[1]==='Active'?'#16a34a':'#d97706'};">${row[1]}</span></div><div style="flex:1;text-align:right;">${row[2]}</div></div>`).join('')}</div>`;
    }
  },
  media: {
    promptSlots: '{ "borderRadius":"Npx", "aspectRatio":"16:9|4:3|1:1|auto", "overlayColor":"#hex or none", "border":"none or value", "shadow":"box-shadow or none", "captionColor":"#hex" }',
    multiMode: 'variant',
    render(s, ds) {
      const r=s.borderRadius||'10px'; const ratio=s.aspectRatio||'16:9';
      const [rw,rh]=ratio.split(':').map(Number); const padTop=rh&&rw?Math.round(rh/rw*100):56;
      const sh=s.shadow||'none'; const border=s.border||'none';
      return `<div style="max-width:280px;">
        <div style="position:relative;padding-top:${padTop}%;border-radius:${r};background:${ha(ds.colors.primary,.06)};overflow:hidden;border:${border};box-shadow:${sh};">
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:32px;color:${ha(ds.isDark?'#fff':'#333',.15)};">▣</div>
          ${s.overlayColor&&s.overlayColor!=='none'?`<div style="position:absolute;inset:0;background:${s.overlayColor};"></div>`:''}</div>
        <div style="font-size:11px;color:${s.captionColor||ha(ds.isDark?'#fff':'#333',.4)};margin-top:6px;">Image caption</div></div>`;
    }
  },
  text: {
    promptSlots: '{ "headingColor":"#hex", "bodyColor":"#hex", "linkColor":"#hex", "headingSize":"Npx", "bodySize":"Npx", "lineHeight":"1.5-2", "letterSpacing":"0-2px" }',
    multiMode: 'variant',
    render(s, ds) {
      const hc=s.headingColor||(ds.isDark?'#eee':'#222'); const bc=s.bodyColor||(ds.isDark?'#aaa':'#555');
      const lc=s.linkColor||ds.colors.primary; const hs=s.headingSize||'18px'; const bs=s.bodySize||'14px';
      const lh=s.lineHeight||'1.6'; const ls=s.letterSpacing||'0';
      return `<div style="max-width:320px;letter-spacing:${ls};">
        <div style="font-size:${hs};font-weight:700;color:${hc};margin-bottom:8px;">Rich Text Heading</div>
        <div style="font-size:${bs};color:${bc};line-height:${lh};margin-bottom:8px;">Body text with <strong>bold emphasis</strong> and <em>italic styling</em>. The quick brown fox jumps over the lazy dog.</div>
        <div style="font-size:${bs};color:${bc};line-height:${lh};">Links styled as <span style="color:${lc};text-decoration:underline;cursor:pointer;">clickable text</span> within paragraphs.</div></div>`;
    }
  },
};
