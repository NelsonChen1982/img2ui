<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePipelineStore } from '../../stores/pipeline'
import { useSettingsStore } from '../../stores/settings'
import { useAuthStore } from '../../stores/auth'
import { I } from '../../data/i18n'
import { buildUIKitHTML } from '../../services/uiKitRenderer'
import { getJSONOutput } from '../../services/downloadService'
import { COMP_META } from '../../data/compMeta'
import { isLight, ha, darken, safeTextColor } from '../../services/colorUtils'

const pipelineStore = usePipelineStore()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()

const ds = computed(() => pipelineStore.activeDS)
const coverBg = computed(() => {
  const c = ds.value?.colors
  if (!c?.primary) return '#f5f5f5'
  if (ds.value.isDark) {
    return `linear-gradient(135deg, ${darken(c.primary, 30)} 0%, ${darken(c.secondary || c.primary, 50)} 100%)`
  }
  return `linear-gradient(135deg, ${c.primary} 0%, ${darken(c.secondary || c.primary, 20)} 100%)`
})
const coverTextColor = computed(() => {
  const c = ds.value?.colors
  if (!c?.primary) return '#333'
  // Dark theme always uses white text on dark gradient background
  if (ds.value.isDark) return '#ffffff'
  return safeTextColor(c.primary, isLight(c.primary) ? c.text : '#ffffff')
})
const coverSubColor = computed(() => {
  return ha(coverTextColor.value.startsWith('#') ? coverTextColor.value : '#ffffff', 0.6)
})

const editingTitle = ref(false)
const editTitleValue = ref('')
function startEditTitle() {
  editTitleValue.value = pipelineStore.uiKitName
  editingTitle.value = true
}
function saveTitle() {
  pipelineStore.uiKitName = editTitleValue.value || 'img2ui UI Kit'
  editingTitle.value = false
}

const copyLabel = ref('')
const jsonExpanded = ref(false)
const isMobile = ref(false)
onMounted(async () => {
  isMobile.value = window.innerWidth <= 768
  window.addEventListener('resize', () => { isMobile.value = window.innerWidth <= 768 })

  // ── Credit deduction + anonymous save on Kit page render ──
  await handleGenerationCredit()
})

async function handleGenerationCredit() {
  const apiBase = import.meta.env.VITE_API_BASE || settingsStore.devSettings?.base || ''

  if (authStore.isAuthenticated) {
    // Logged-in: deduct credit via save-result (which also saves design)
    if (apiBase) {
      try {
        const hdrs = { 'Content-Type': 'application/json' }
        if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_KEY) hdrs['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY
        const resp = await fetch(`${apiBase}/api/save-result`, {
          method: 'POST',
          headers: hdrs,
          body: JSON.stringify({
            user_id: authStore.user.id,
            email: authStore.user.email,
            session_token: authStore.sessionToken,
            image_key: pipelineStore.imageKey || '',
            tokens: pipelineStore.activeDS,
            annotations: pipelineStore.annotations,
            holistic: pipelineStore.holisticResult || {},
            provider: settingsStore.selectedProvider,
          }),
        })
        const data = await resp.json()
        if (data.design_id) {
          pipelineStore.currentDesignId = data.design_id
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[img2ui] save-result failed:', err.message)
      }
    }
    // Refresh credits after deduction
    await authStore.refreshCredits()
  } else {
    // Anonymous: mark free pass used + save anonymously
    await authStore.markFreePassUsed()
    if (apiBase) {
      try {
        const hdrs = { 'Content-Type': 'application/json' }
        if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_KEY) hdrs['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY
        const resp = await fetch(`${apiBase}/api/save-result`, {
          method: 'POST',
          headers: hdrs,
          body: JSON.stringify({
            user_id: null,
            email: '',
            image_key: pipelineStore.imageKey || '',
            tokens: pipelineStore.activeDS,
            annotations: pipelineStore.annotations,
            holistic: pipelineStore.holisticResult || {},
            provider: settingsStore.selectedProvider,
          }),
        })
        const data = await resp.json()
        if (data.design_id) {
          pipelineStore.currentDesignId = data.design_id
          authStore.storeAnonDesignId(data.design_id)
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[img2ui] anon save-result failed:', err.message)
      }
    }
  }
}

function t(obj) {
  if (!obj) return ''
  return obj[settingsStore.lang] || obj.en || ''
}

const uiKitHTML = computed(() => {
  return buildUIKitHTML(
    pipelineStore.activeDS,
    pipelineStore.annotations,
    pipelineStore.analysisLog
  )
})

const fullJSONOutput = computed(() => {
  if (!pipelineStore.activeDS?.colors) return pipelineStore.activeDS
  return getJSONOutput(
    pipelineStore.activeDS,
    pipelineStore.annotations,
    COMP_META,
    pipelineStore.extractedColors,
    settingsStore.selectedCSSFramework,
    pipelineStore.holisticResult,
    pipelineStore.analysisLog
  )
})

const jsonPanelText = computed(() => {
  return JSON.stringify(fullJSONOutput.value, null, 2)
})

/**
 * Syntax-highlighted JSON as HTML.
 * Colors: keys=olive, strings=forest-green, numbers=teal, booleans=dusty-rose, null=muted
 */
const jsonHighlighted = computed(() => {
  const raw = jsonPanelText.value || '{}'
  return raw.replace(
    /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)/g,
    (match, key, str, num, bool, nil) => {
      if (key) {
        // Key — strip quotes, muted olive
        const k = key
        return `<span class="jk">${esc(k)}</span>:`
      }
      if (str) {
        // Detect hex color strings like "#4a7c59"
        const inner = str.slice(1, -1)
        if (/^#[0-9a-fA-F]{3,8}$/.test(inner)) {
          return `<span class="js">"<span style="border-bottom:2px solid ${inner};padding-bottom:1px;">${esc(inner)}</span>"</span>`
        }
        return `<span class="js">${esc(str)}</span>`
      }
      if (num) return `<span class="jn">${esc(num)}</span>`
      if (bool) return `<span class="jb">${esc(bool)}</span>`
      if (nil) return `<span class="jl">${esc(nil)}</span>`
      return esc(match)
    }
  )
})

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function copyJSON() {
  const json = JSON.stringify(fullJSONOutput.value, null, 2)
  navigator.clipboard.writeText(json).then(() => {
    copyLabel.value = t(I.s7.copied)
    setTimeout(() => { copyLabel.value = '' }, 2000)
  })
}

// Theme tabs
function setTheme(theme) {
  pipelineStore.activeTheme = theme
}

</script>

<template>
  <div style="max-width: 1400px; margin: 0 auto">
    <!-- Description + Edit Title button -->
    <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
      <p style="color: #888; font-size: 15px; margin: 0;">
        {{ t(I.s7.desc) }}
      </p>
      <button
        v-if="ds?.colors?.primary"
        class="edit-title-btn"
        :style="{ visibility: editingTitle ? 'hidden' : 'visible' }"
        @click="startEditTitle"
      >
        <i class="fa-duotone fa-thin fa-pen" style="margin-right:4px;"></i>
        {{ t(I.s7.editTitle) }}
      </button>
    </div>

    <!-- Theme Tab Bar -->
    <div class="theme-bar" v-if="ds?.colors?.primary">
      <div class="theme-tabs">
        <button
          class="theme-tab"
          :class="{ 'theme-tab--active': pipelineStore.activeTheme === 'light' }"
          @click="setTheme('light')"
        >
          <span style="font-size: 13px;">☀</span>
          {{ t(I.s7.lightTab) }}
        </button>
        <button
          class="theme-tab"
          :class="{ 'theme-tab--active': pipelineStore.activeTheme === 'dark' }"
          @click="setTheme('dark')"
        >
          <span style="font-size: 13px;">●</span>
          {{ t(I.s7.darkTab) }}
        </button>
      </div>
    </div>

    <!-- Two-column layout: UI Kit + JSON Panel -->
    <div class="result-layout">
      <!-- UI Kit Render (with Cover Hero on top) -->
      <div style="flex: 1; min-width: 0; max-width: 100%; order: 0;">

        <!-- Cover Hero -->
        <div
          v-if="ds?.colors?.primary"
          class="cover-hero"
          :style="{
            background: coverBg,
          }"
        >
          <div class="cover-inner">
            <!-- Left: Title + Badges -->
            <div class="cover-left" style="position:relative;z-index:10;">
              <!-- Title: display mode -->
              <div
                v-if="!editingTitle"
                class="cover-title"
                :style="{
                  color: coverTextColor,
                  fontFamily: ds.fonts?.heading || 'Inter',
                  fontSize: `${Math.round(parseInt(ds.typo?.[0]?.size || '36') * 1.4)}px`,
                  fontWeight: ds.typo?.[0]?.weight || '800',
                }"
              >{{ pipelineStore.uiKitName }}</div>
              <!-- Title: edit mode -->
              <div v-else class="cover-title-edit" :style="{ height: `${Math.round(parseInt(ds.typo?.[0]?.size || '36') * 1.4 * 1.15 + 24)}px` }">
                <input
                  v-model="editTitleValue"
                  class="cover-title-input-active"
                  :style="{ fontSize: `${Math.round(parseInt(ds.typo?.[0]?.size || '36') * 1.4)}px`, fontWeight: ds.typo?.[0]?.weight || '800', fontFamily: ds.fonts?.heading || 'Inter' }"
                  spellcheck="false"
                  maxlength="30"
                  @keydown.enter="saveTitle"
                />
                <button class="save-title-btn" @click="saveTitle">
                  <i class="fa-duotone fa-thin fa-floppy-disk"></i>
                </button>
              </div>
              <div class="cover-badges">
                <div class="cover-badge" :style="{ background: ds.colors.accent || ds.colors.primary, color: safeTextColor(ds.colors.accent || ds.colors.primary, isLight(ds.colors.accent || ds.colors.primary) ? '#1a1a1a' : '#fff') }">
                  <i class="fa-duotone fa-thin fa-brackets-curly"></i>
                  <span>JSON Format</span>
                </div>
                <div class="cover-badge" :style="{ background: ds.colors.surface || '#f0f0f0', color: ds.colors.text || '#1a1a1a' }">
                  <i class="fa-duotone fa-thin fa-wand-magic-sparkles"></i>
                  <span>Coding Agent SKILL</span>
                </div>
                <div class="cover-badge" :style="{ background: ds.colors.secondary || ds.colors.primary, color: safeTextColor(ds.colors.secondary || ds.colors.primary, isLight(ds.colors.secondary || ds.colors.primary) ? '#1a1a1a' : '#fff') }">
                  <i class="fa-duotone fa-thin fa-browser"></i>
                  <span>Preview HTML</span>
                </div>
              </div>
            </div>

            <!-- Right: Component Preview with rotation + bleed -->
            <div class="cover-preview-wrapper" style="z-index:1;">
              <div
                class="cover-preview-frame"
                :style="{
                  background: ds.colors.surface || '#f0f0f0',
                  borderRadius: ds.radius?.lg || '16px',
                  boxShadow: ds.shadows?.lg || '0 10px 28px rgba(0,0,0,.12)',
                }"
              >
                <!-- Row 1: Color Palette + Typography -->
                <div style="display:flex;gap:6px;padding:8px 8px 0;">
                  <!-- Color Swatches -->
                  <div :style="{ flex: '0 0 auto', background: ds.isDark ? ha('#ffffff', 0.06) : '#fff', border: `1px solid ${ds.colors.border}`, borderRadius: ds.radius?.md || '8px', padding: '6px', boxShadow: ds.shadows?.sm }">
                    <div :style="{ fontSize: '5px', fontWeight: 700, color: ha(ds.colors.text, 0.45), letterSpacing: '0.05em', marginBottom: '5px' }">PALETTE</div>
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;">
                      <div v-for="(hex, ci) in (ds.allColors || []).slice(0, 8)" :key="'sw'+ci" :style="{ width: '16px', height: '16px', borderRadius: ds.radius?.sm || '4px', background: hex, border: `1px solid ${ha(ds.colors.text, 0.1)}` }"></div>
                    </div>
                    <!-- Semantic row -->
                    <div style="display:flex;gap:2px;margin-top:4px;">
                      <div v-for="(sk) in ['primary','secondary','accent','success','warning','danger']" :key="sk" :style="{ flex: 1, height: '6px', borderRadius: '2px', background: ds.colors[sk] || '#ccc' }"></div>
                    </div>
                  </div>

                  <!-- Typography Scale -->
                  <div :style="{ flex: 1, minWidth: 0, background: ds.isDark ? ha('#ffffff', 0.06) : '#fff', border: `1px solid ${ds.colors.border}`, borderRadius: ds.radius?.md || '8px', padding: '6px', boxShadow: ds.shadows?.sm }">
                    <div :style="{ fontSize: '5px', fontWeight: 700, color: ha(ds.colors.text, 0.45), letterSpacing: '0.05em', marginBottom: '4px' }">TYPOGRAPHY</div>
                    <div :style="{ fontSize: '11px', fontWeight: 800, color: ds.colors.text, lineHeight: 1.2, marginBottom: '2px', fontFamily: ds.fonts?.heading || 'Inter' }">Display</div>
                    <div :style="{ fontSize: '8px', fontWeight: 700, color: ds.colors.text, lineHeight: 1.3, marginBottom: '2px', fontFamily: ds.fonts?.heading || 'Inter' }">Heading One</div>
                    <div :style="{ fontSize: '6.5px', fontWeight: 600, color: ds.colors.text, lineHeight: 1.3, marginBottom: '2px', fontFamily: ds.fonts?.heading || 'Inter' }">Heading Two</div>
                    <div :style="{ fontSize: '5px', color: ha(ds.colors.text, 0.6), lineHeight: 1.5, fontFamily: ds.fonts?.body || 'Inter' }">Body text for paragraphs and descriptions. <span :style="{ color: ds.colors.primary, fontWeight: 600 }">Link style</span></div>
                  </div>
                </div>

                <!-- Row 2: Buttons + Badges + Form Controls -->
                <div style="display:flex;gap:6px;padding:6px 8px 0;">
                  <!-- Buttons -->
                  <div :style="{ flex: 1, background: ds.isDark ? ha('#ffffff', 0.06) : '#fff', border: `1px solid ${ds.colors.border}`, borderRadius: ds.radius?.md || '8px', padding: '6px', boxShadow: ds.shadows?.sm }">
                    <div :style="{ fontSize: '5px', fontWeight: 700, color: ha(ds.colors.text, 0.45), letterSpacing: '0.05em', marginBottom: '5px' }">BUTTONS</div>
                    <div style="display:flex;flex-wrap:wrap;gap:3px;">
                      <div :style="{ padding: '3px 8px', borderRadius: ds.radius?.sm || '4px', background: ds.colors.primary, color: safeTextColor(ds.colors.primary, '#fff'), fontSize: '5px', fontWeight: 700 }">Primary</div>
                      <div :style="{ padding: '3px 8px', borderRadius: ds.radius?.sm || '4px', background: ds.colors.secondary || ds.colors.primary, color: safeTextColor(ds.colors.secondary || ds.colors.primary, '#fff'), fontSize: '5px', fontWeight: 700 }">Secondary</div>
                      <div :style="{ padding: '3px 8px', borderRadius: ds.radius?.sm || '4px', border: `1px solid ${ds.colors.primary}`, color: ds.colors.primary, fontSize: '5px', fontWeight: 600, background: 'transparent' }">Outline</div>
                      <div :style="{ padding: '3px 8px', borderRadius: ds.radius?.sm || '4px', background: ha(ds.colors.text, 0.08), color: ds.colors.text, fontSize: '5px' }">Ghost</div>
                    </div>
                    <!-- Status badges -->
                    <div style="display:flex;gap:3px;margin-top:5px;">
                      <div :style="{ padding: '1.5px 5px', borderRadius: '999px', background: ds.colors.success || '#22c55e', color: '#fff', fontSize: '4px', fontWeight: 600 }">Active</div>
                      <div :style="{ padding: '1.5px 5px', borderRadius: '999px', background: ds.colors.warning || '#f59e0b', color: '#fff', fontSize: '4px', fontWeight: 600 }">Pending</div>
                      <div :style="{ padding: '1.5px 5px', borderRadius: '999px', background: ds.colors.danger || '#ef4444', color: '#fff', fontSize: '4px', fontWeight: 600 }">Error</div>
                      <div :style="{ padding: '1.5px 5px', borderRadius: '999px', background: ha(ds.colors.primary, 0.12), color: ds.colors.primary, fontSize: '4px', fontWeight: 600 }">Info</div>
                    </div>
                  </div>

                  <!-- Form Controls -->
                  <div :style="{ flex: 1, background: ds.isDark ? ha('#ffffff', 0.06) : '#fff', border: `1px solid ${ds.colors.border}`, borderRadius: ds.radius?.md || '8px', padding: '6px', boxShadow: ds.shadows?.sm }">
                    <div :style="{ fontSize: '5px', fontWeight: 700, color: ha(ds.colors.text, 0.45), letterSpacing: '0.05em', marginBottom: '5px' }">FORM</div>
                    <!-- Input -->
                    <div :style="{ height: '13px', border: `1px solid ${ds.colors.border}`, borderRadius: ds.radius?.sm || '4px', background: ds.isDark ? ha('#ffffff', 0.04) : '#fff', display: 'flex', alignItems: 'center', paddingLeft: '5px', marginBottom: '4px' }">
                      <span :style="{ fontSize: '4.5px', color: ha(ds.colors.text, 0.35) }">Enter your email...</span>
                    </div>
                    <!-- Select -->
                    <div :style="{ height: '13px', border: `1px solid ${ds.colors.border}`, borderRadius: ds.radius?.sm || '4px', background: ds.isDark ? ha('#ffffff', 0.04) : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5px', marginBottom: '4px' }">
                      <span :style="{ fontSize: '4.5px', color: ds.colors.text }">Option A</span>
                      <span :style="{ fontSize: '4px', color: ha(ds.colors.text, 0.3) }">▼</span>
                    </div>
                    <!-- Checkbox + Toggle row -->
                    <div style="display:flex;align-items:center;gap:6px;">
                      <div style="display:flex;align-items:center;gap:2px;">
                        <div :style="{ width: '8px', height: '8px', borderRadius: '2px', background: ds.colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }">
                          <span style="color:#fff;font-size:5px;line-height:1;">✓</span>
                        </div>
                        <span :style="{ fontSize: '4.5px', color: ds.colors.text }">Agree</span>
                      </div>
                      <div :style="{ width: '16px', height: '9px', borderRadius: '999px', background: ds.colors.primary, position: 'relative' }">
                        <div style="width:7px;height:7px;border-radius:50%;background:#fff;position:absolute;top:1px;right:1px;"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Row 3: Cards -->
                <div style="display:flex;gap:6px;padding:6px 8px 0;">
                  <div v-for="i in 3" :key="'crd'+i" :style="{ flex: 1, background: ds.isDark ? ha('#ffffff', 0.06) : '#fff', border: `1px solid ${ds.colors.border}`, borderRadius: ds.radius?.md || '8px', overflow: 'hidden', boxShadow: ds.shadows?.sm }">
                    <div :style="{ width: '100%', height: '18px', background: i === 1 ? `linear-gradient(135deg, ${ds.colors.primary}, ${darken(ds.colors.primary, 30)})` : i === 2 ? ha(ds.colors.secondary || ds.colors.primary, 0.15) : ha(ds.colors.accent || ds.colors.primary, 0.15) }"></div>
                    <div style="padding:5px;">
                      <div :style="{ fontSize: '5.5px', fontWeight: 700, color: ds.colors.text, marginBottom: '2px', fontFamily: ds.fonts?.heading || 'Inter' }">{{ ['Featured','Popular','New'][i-1] }}</div>
                      <div :style="{ fontSize: '4px', color: ha(ds.colors.text, 0.5), lineHeight: 1.4, marginBottom: '4px' }">Short description text here.</div>
                      <div :style="{ display: 'inline-block', padding: '2px 6px', borderRadius: ds.radius?.sm || '4px', background: i === 1 ? ds.colors.primary : 'transparent', border: i !== 1 ? `1px solid ${ds.colors.border}` : 'none', color: i === 1 ? safeTextColor(ds.colors.primary, '#fff') : ds.colors.primary, fontSize: '4px', fontWeight: 600 }">{{ i === 1 ? 'Action' : 'Details' }}</div>
                    </div>
                  </div>
                </div>

                <!-- Row 4: Alerts + Navbar -->
                <div style="padding:6px 8px 0;">
                  <!-- Alerts row -->
                  <div style="display:flex;gap:4px;margin-bottom:5px;">
                    <div v-for="(a, ai) in [{c: ds.colors.success || '#22c55e', t: 'Success!'}, {c: ds.colors.warning || '#f59e0b', t: 'Warning'}, {c: ds.colors.danger || '#ef4444', t: 'Error'}]" :key="'al'+ai" :style="{ flex: 1, padding: '4px 5px', borderRadius: ds.radius?.sm || '4px', background: ha(a.c, 0.1), borderLeft: `2px solid ${a.c}`, fontSize: '4.5px', color: ds.colors.text }">
                      <span :style="{ fontWeight: 700, color: a.c }">{{ a.t }}</span>
                    </div>
                  </div>
                </div>

                <!-- Row 5: Navbar -->
                <div style="padding:0 8px 6px;">
                  <div :style="{ background: ds.colors.primary, padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: ds.radius?.sm || '4px' }">
                    <div :style="{ fontWeight: 800, color: safeTextColor(ds.colors.primary, isLight(ds.colors.primary) ? ds.colors.text : '#fff'), fontSize: '7px', fontFamily: ds.fonts?.heading || 'Inter' }">Brand</div>
                    <div style="display:flex;gap:6px;">
                      <span v-for="l in ['Home','About','Blog']" :key="l" :style="{ fontSize: '5.5px', color: ha(safeTextColor(ds.colors.primary, isLight(ds.colors.primary) ? ds.colors.text : '#fff'), 0.7) }">{{ l }}</span>
                    </div>
                    <div style="display:flex;gap:3px;">
                      <div :style="{ padding: '2px 5px', borderRadius: ds.radius?.sm || '4px', border: `1px solid ${ha(safeTextColor(ds.colors.primary, isLight(ds.colors.primary) ? ds.colors.text : '#fff'), 0.3)}`, color: safeTextColor(ds.colors.primary, isLight(ds.colors.primary) ? ds.colors.text : '#fff'), fontSize: '5px' }">Login</div>
                      <div :style="{ padding: '2px 5px', borderRadius: ds.radius?.sm || '4px', background: safeTextColor(ds.colors.primary, isLight(ds.colors.primary) ? ds.colors.text : '#fff'), color: ds.colors.primary, fontSize: '5px', fontWeight: 700 }">Sign up</div>
                    </div>
                  </div>
                </div>

                <!-- Row 6: Mini Table -->
                <div style="padding:0 8px 6px;">
                  <div :style="{ background: ds.isDark ? ha('#ffffff', 0.06) : '#fff', border: `1px solid ${ds.colors.border}`, borderRadius: ds.radius?.md || '8px', overflow: 'hidden', boxShadow: ds.shadows?.sm }">
                    <div :style="{ display: 'flex', padding: '4px 6px', background: ha(ds.colors.primary, 0.06), borderBottom: `1px solid ${ds.colors.border}` }">
                      <div v-for="h in ['Name','Status','Role','Action']" :key="h" :style="{ flex: h === 'Name' ? 2 : 1, fontSize: '4.5px', fontWeight: 700, color: ha(ds.colors.text, 0.5) }">{{ h }}</div>
                    </div>
                    <div v-for="(row, ri) in [{n:'Alice',s:'Active',r:'Admin'},{n:'Bob',s:'Pending',r:'Editor'},{n:'Carol',s:'Active',r:'Viewer'}]" :key="'tr'+ri" :style="{ display: 'flex', padding: '3px 6px', alignItems: 'center', borderBottom: ri < 2 ? `1px solid ${ha(ds.colors.border, 0.5)}` : 'none' }">
                      <div :style="{ flex: 2, fontSize: '4.5px', color: ds.colors.text, fontWeight: 600 }">{{ row.n }}</div>
                      <div style="flex:1;">
                        <span :style="{ fontSize: '3.5px', padding: '1px 4px', borderRadius: '999px', background: row.s === 'Active' ? ha(ds.colors.success || '#22c55e', 0.15) : ha(ds.colors.warning || '#f59e0b', 0.15), color: row.s === 'Active' ? (ds.colors.success || '#22c55e') : (ds.colors.warning || '#f59e0b'), fontWeight: 600 }">{{ row.s }}</span>
                      </div>
                      <div :style="{ flex: 1, fontSize: '4.5px', color: ha(ds.colors.text, 0.5) }">{{ row.r }}</div>
                      <div :style="{ flex: 1, fontSize: '4px', color: ds.colors.primary, fontWeight: 600 }">Edit</div>
                    </div>
                  </div>
                </div>

                <!-- Row 7: Media List -->
                <div style="display:flex;gap:6px;padding:0 8px 6px;">
                  <div v-for="i in 2" :key="'media'+i" :style="{ flex: 1, display: 'flex', gap: '5px', background: ds.isDark ? ha('#ffffff', 0.06) : '#fff', border: `1px solid ${ds.colors.border}`, borderRadius: ds.radius?.sm || '4px', padding: '5px', boxShadow: ds.shadows?.sm }">
                    <div :style="{ width: '22px', height: '22px', borderRadius: ds.radius?.sm || '4px', background: i === 1 ? ha(ds.colors.primary, 0.15) : ha(ds.colors.accent || ds.colors.secondary || ds.colors.primary, 0.15), flexShrink: 0 }"></div>
                    <div style="min-width:0;">
                      <div :style="{ fontSize: '5px', fontWeight: 700, color: ds.colors.text, fontFamily: ds.fonts?.heading || 'Inter' }">{{ i === 1 ? 'Item Title' : 'Another Item' }}</div>
                      <div :style="{ fontSize: '4px', color: ha(ds.colors.text, 0.45), lineHeight: 1.4 }">Description text for this media item.</div>
                    </div>
                  </div>
                </div>

                <!-- Row 8: Footer -->
                <div :style="{ padding: '6px 10px', background: ds.isDark ? ha('#ffffff', 0.03) : ha(ds.colors.text, 0.03), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }">
                  <div :style="{ fontSize: '5px', color: ha(ds.colors.text, 0.4) }">© 2024 Brand. All rights reserved.</div>
                  <div style="display:flex;gap:6px;">
                    <span v-for="l in ['Terms','Privacy','Help']" :key="l" :style="{ fontSize: '4.5px', color: ds.colors.primary }">{{ l }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="ui-kit-render" v-html="uiKitHTML" style="border-radius: 14px; overflow: hidden; max-width: 100%;" />
      </div>

      <!-- JSON Panel -->
      <div
        id="json-panel"
        :style="isMobile ? {} : {
          width: '380px',
          flexShrink: 0,
          position: 'sticky',
          top: '20px',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
        }"
        :class="{ 'json-panel-mobile': isMobile }"
      >
        <div style="background: #fafaf8; border: 1px solid #e8e8e8; border-radius: 14px; overflow: hidden">
          <!-- JSON Header — always visible -->
          <div
            style="
              padding: 12px 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: #fff;
              cursor: pointer;
            "
            :style="{ borderBottom: (!isMobile || jsonExpanded) ? '1px solid #e8e8e8' : 'none' }"
            @click="isMobile && (jsonExpanded = !jsonExpanded)"
          >
            <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #999; display: flex; align-items: center; gap: 6px;">
              <i class="fa-duotone fa-thin fa-code"></i>
              {{ t(I.s7.jsonLabel) }}
              <i
                v-if="isMobile"
                class="fa-duotone fa-thin fa-chevron-down"
                :style="{ fontSize: '9px', transition: 'transform 0.2s', transform: jsonExpanded ? 'rotate(180deg)' : 'none' }"
              ></i>
            </span>
            <button
              @click.stop="copyJSON"
              style="
                padding: 3px 10px;
                font-size: 11px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: #fff;
                color: #666;
                cursor: pointer;
                transition: all 0.2s;
              "
            >
              <i class="fa-duotone fa-thin fa-copy" style="margin-right:3px;"></i>
              {{ copyLabel || t(I.s7.copy) }}
            </button>
          </div>
          <!-- JSON Body — collapsible on mobile -->
          <pre
            v-show="!isMobile || jsonExpanded"
            class="json-pre"
            v-html="jsonHighlighted"
          ></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Theme Bar ── */
.theme-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.theme-tabs {
  display: flex;
  gap: 4px;
  background: #f0f0f0;
  border-radius: 10px;
  padding: 3px;
}
.theme-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #888;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.theme-tab:hover {
  color: #555;
  background: rgba(255,255,255,0.5);
}
.theme-tab--active {
  background: #fff;
  color: #333;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
/* ── Cover Hero ── */
.cover-hero {
  border-radius: 18px;
  padding: 40px 36px;
  margin-bottom: 14px;
  overflow: hidden;
  position: relative;
}
.cover-inner {
  position: relative;
  min-height: 360px;
  isolation: isolate;
}
.cover-left {
  position: relative;
  z-index: 2;
  width: 50%;
  min-height: 360px;
  display: flex;
  flex-direction: column;
}
.cover-title {
  line-height: 1.15;
  text-shadow: 0 2px 24px rgba(0,0,0,0.6);
  word-break: break-word;
}
.cover-title-edit {
  display: flex;
  align-items: stretch;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.cover-title-input-active {
  flex: 1;
  background: #fff;
  border: none;
  outline: none;
  padding: 8px 12px;
  font-size: 14px;
  color: #333;
  min-width: 0;
}
.save-title-btn {
  background: #f5f5f5;
  border: none;
  border-left: 1px solid #ddd;
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  flex-shrink: 0;
  transition: background 0.15s;
}
.save-title-btn:hover {
  background: #eee;
}
.edit-title-btn {
  padding: 5px 12px;
  font-size: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  color: #666;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.edit-title-btn:hover {
  border-color: #999;
  background: #f5f5f5;
}
.cover-badges {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: auto;
}
.cover-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  width: fit-content;
  transition: transform 0.15s;
}
.cover-badge:hover {
  transform: translateX(2px);
}
.cover-badge i {
  font-size: 13px;
  width: 16px;
  text-align: center;
}

/* ── Preview Panel (right side) ── */
.cover-preview-wrapper {
  position: absolute;
  top: -50px;
  right: -120px;
  width: 60%;
  overflow: visible;
  z-index: 0;
}
.cover-preview-frame {
  transform: rotate(7deg) scale(1.3);
  transform-origin: top right;
  overflow: hidden;
  pointer-events: none;
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
}

.result-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

@media (max-width: 768px) {
  .cover-hero {
    padding: 24px 20px;
  }
  .cover-inner {
    min-height: 280px;
  }
  .cover-left {
    width: 100%;
    min-height: 280px;
  }
  .cover-title {
    font-size: 28px !important;
  }
  .cover-title-input-active {
    font-size: 28px !important;
  }
  .cover-preview-wrapper {
    position: absolute;
    top: auto;
    right: -30%;
    bottom: -60px;
    left: auto;
    width: 65%;
    aspect-ratio: 1 / 1;
    overflow: visible;
  }
  .cover-preview-frame {
    position: absolute;
    top: auto;
    right: 0;
    bottom: -20px;
    width: 100%;
    transform: rotate(6deg) scale(1.25);
    transform-origin: bottom right;
  }

  .theme-bar {
    flex-wrap: wrap;
    gap: 8px;
  }
  .theme-tab {
    padding: 7px 12px;
    font-size: 12px;
  }

  .result-layout {
    flex-direction: column;
    gap: 16px;
  }

  .json-panel-mobile {
    width: 100%;
    order: -1;
  }

  .json-pre {
    max-height: 300px !important;
  }
}

button:hover {
  border-color: #999;
  background: #f5f5f5;
}

button:active {
  transform: scale(0.98);
}

.json-pre {
  padding: 14px 16px;
  font-size: 11px;
  line-height: 1.55;
  font-family: 'SF Mono', Monaco, Consolas, 'Fira Code', monospace;
  color: #6b7280;
  margin: 0;
  overflow-x: auto;
  max-height: calc(100vh - 200px);
  white-space: pre-wrap;
  word-break: break-all;
  scrollbar-width: thin;
  scrollbar-color: #ddd #f5f5f5;
}

/* JSON syntax token colors — earthy/muted palette */
.json-pre :deep(.jk) { color: #6b7352; font-weight: 500; } /* keys: olive */
.json-pre :deep(.js) { color: #4a7c59; }                    /* strings: forest green */
.json-pre :deep(.jn) { color: #3b7d8a; }                    /* numbers: teal */
.json-pre :deep(.jb) { color: #b5636a; }                    /* booleans: dusty rose */
.json-pre :deep(.jl) { color: #9ca3af; font-style: italic; }/* null: muted gray */

.json-pre::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.json-pre::-webkit-scrollbar-track {
  background: #f5f5f5;
}

.json-pre::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 3px;
}

.json-pre::-webkit-scrollbar-thumb:hover {
  background: #ccc;
}
</style>
