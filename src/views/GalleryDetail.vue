<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { useAuthStore } from '../stores/auth'
import { buildUIKitHTML } from '../services/uiKitRenderer'
import { isLight, ha, darken, safeTextColor } from '../services/colorUtils'
import DesignPreviewCard from '../components/ui/DesignPreviewCard.vue'

const props = defineProps({ id: String })
const router = useRouter()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()

const design = ref(null)
const loading = ref(true)
const notFound = ref(false)
const jsonExpanded = ref(false)
const copyLabel = ref('')
const iframeRef = ref(null)
const originalImgUrl = ref(null)
const originalImgLoading = ref(false)
const designVisibility = ref('public')

const tokens = computed(() => {
  if (!design.value?.tokens_json) return null
  try { return JSON.parse(design.value.tokens_json) } catch { return null }
})

const annotations = computed(() => {
  if (!design.value?.annotations_json) return []
  try { return JSON.parse(design.value.annotations_json) } catch { return [] }
})

const uiKitHTML = computed(() => {
  if (!tokens.value) return ''
  return buildUIKitHTML(tokens.value, annotations.value, [])
})

const isOwner = computed(() => {
  if (!authStore.isAuthenticated || !design.value?.user_id) return false
  return authStore.user?.id === design.value.user_id
})

const displayName = computed(() => design.value?.user_name || (settingsStore.lang === 'zh' ? '匿名' : settingsStore.lang === 'ja' ? '匿名' : 'Anonymous'))
const displayDate = computed(() => {
  if (!design.value?.created_at) return ''
  const d = new Date(design.value.created_at + (design.value.created_at.includes('Z') ? '' : 'Z'))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

// Cover hero computed styles (mirrored from StepResult)
const coverBg = computed(() => {
  const c = tokens.value?.colors
  if (!c?.primary) return '#f5f5f5'
  if (tokens.value.isDark) {
    return `linear-gradient(135deg, ${darken(c.primary, 30)} 0%, ${darken(c.secondary || c.primary, 50)} 100%)`
  }
  return `linear-gradient(135deg, ${c.primary} 0%, ${darken(c.secondary || c.primary, 20)} 100%)`
})
const coverTextColor = computed(() => {
  const c = tokens.value?.colors
  if (!c?.primary) return '#333'
  if (tokens.value.isDark) return '#ffffff'
  return safeTextColor(c.primary, isLight(c.primary) ? c.text : '#ffffff')
})
const coverSubColor = computed(() => {
  return ha(coverTextColor.value.startsWith('#') ? coverTextColor.value : '#ffffff', 0.6)
})

const jsonText = computed(() => {
  if (!tokens.value) return '{}'
  return JSON.stringify(tokens.value, null, 2)
})

const jsonHighlighted = computed(() => {
  const raw = jsonText.value
  return raw.replace(
    /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)/g,
    (match, key, str, num, bool, nil) => {
      if (key) return `<span style="color:#6b7a3a;">${esc(key)}</span>:`
      if (str) {
        const inner = str.slice(1, -1)
        if (/^#[0-9a-fA-F]{3,8}$/.test(inner)) {
          return `<span style="color:#2e6e4e;">"<span style="border-bottom:2px solid ${inner};padding-bottom:1px;">${esc(inner)}</span>"</span>`
        }
        return `<span style="color:#2e6e4e;">${esc(str)}</span>`
      }
      if (num) return `<span style="color:#1a7a7a;">${esc(num)}</span>`
      if (bool) return `<span style="color:#9a6572;">${esc(bool)}</span>`
      if (nil) return `<span style="color:#aaa;">${esc(nil)}</span>`
      return esc(match)
    }
  )
})

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function fetchDesign() {
  loading.value = true
  const apiBase = import.meta.env.VITE_API_BASE || ''
  if (!apiBase) { loading.value = false; notFound.value = true; return }

  try {
    const hdrs = {}
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_KEY) hdrs['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY
    const resp = await fetch(`${apiBase}/api/gallery/${props.id}`, { headers: hdrs })
    if (!resp.ok) { notFound.value = true; loading.value = false; return }
    const data = await resp.json()
    design.value = data.design
    designVisibility.value = data.design?.visibility || 'public'
  } catch {
    notFound.value = true
  }
  loading.value = false

  await nextTick()
  if (iframeRef.value && uiKitHTML.value) {
    iframeRef.value.srcdoc = uiKitHTML.value
  }

  // Load original image for owner
  if (isOwner.value && design.value?.image_key) {
    loadOriginalImage()
  }
}

async function loadOriginalImage() {
  const apiBase = import.meta.env.VITE_API_BASE || ''
  if (!apiBase || !authStore.isAuthenticated) return
  originalImgLoading.value = true
  try {
    const hdrs = {}
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_KEY) hdrs['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY
    const params = `user_id=${authStore.user.id}&session_token=${encodeURIComponent(authStore.sessionToken)}`
    const resp = await fetch(`${apiBase}/api/gallery/${props.id}/image?${params}`, { headers: hdrs })
    if (resp.ok) {
      const blob = await resp.blob()
      originalImgUrl.value = URL.createObjectURL(blob)
    }
  } catch { /* silent */ }
  originalImgLoading.value = false
}

async function toggleVisibility() {
  const newVis = designVisibility.value === 'public' ? 'private' : 'public'
  designVisibility.value = newVis
  const apiBase = import.meta.env.VITE_API_BASE || ''
  if (!apiBase || !authStore.isAuthenticated) return
  try {
    const hdrs = { 'Content-Type': 'application/json' }
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_KEY) hdrs['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY
    await fetch(`${apiBase}/api/gallery/${props.id}`, {
      method: 'PATCH',
      headers: hdrs,
      body: JSON.stringify({ user_id: authStore.user.id, session_token: authStore.sessionToken, visibility: newVis }),
    })
  } catch { /* silent */ }
}

function copyJSON() {
  navigator.clipboard.writeText(jsonText.value).then(() => {
    copyLabel.value = settingsStore.lang === 'zh' ? '已複製' : settingsStore.lang === 'ja' ? 'コピー済み' : 'Copied!'
    setTimeout(() => { copyLabel.value = '' }, 2000)
  })
}

function downloadJSON() {
  incrementDownload()
  const blob = new Blob([jsonText.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${design.value?.title || 'design-tokens'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadHTMLFile() {
  incrementDownload()
  const html = uiKitHTML.value
  if (!html) return
  const full = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(design.value?.title || 'UI Kit Preview')}</title></head><body style="margin:0;background:${tokens.value?.colors?.surface || '#fff'};">${html}</body></html>`
  const blob = new Blob([full], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${design.value?.title || 'ui-kit'}.html`
  a.click()
  URL.revokeObjectURL(url)
}

function incrementDownload() {
  const apiBase = import.meta.env.VITE_API_BASE || ''
  if (!apiBase) return
  const hdrs = {}
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_KEY) hdrs['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY
  fetch(`${apiBase}/api/gallery/${props.id}/download`, { method: 'POST', headers: hdrs }).catch(() => {})
}

onMounted(fetchDesign)
</script>

<template>
  <main style="flex:1;padding:36px 28px;overflow:auto;background:#fafafa;">
    <div style="max-width:900px;margin:0 auto;">
      <!-- Back -->
      <button class="back-btn" @click="router.push('/gallery')">
        <i class="fa-duotone fa-thin fa-arrow-left" style="font-size:12px;"></i>
        {{ settingsStore.lang === 'zh' ? '返回 Gallery' : settingsStore.lang === 'ja' ? 'ギャラリーに戻る' : 'Back to Gallery' }}
      </button>

      <!-- Loading -->
      <div v-if="loading" style="text-align:center;padding:80px 0;color:#aaa;font-size:14px;">
        <i class="fa-duotone fa-thin fa-spinner-third fa-spin" style="margin-right:6px;"></i>Loading...
      </div>

      <!-- Not found -->
      <div v-else-if="notFound" style="text-align:center;padding:80px 0;">
        <div style="font-size:48px;margin-bottom:16px;color:#ccc;"><i class="fa-duotone fa-thin fa-magnifying-glass"></i></div>
        <h2 style="font-size:18px;font-weight:700;color:#333;margin-bottom:8px;">
          {{ settingsStore.lang === 'zh' ? '找不到此設計' : settingsStore.lang === 'ja' ? 'デザインが見つかりません' : 'Design not found' }}
        </h2>
        <p style="color:#888;font-size:14px;">
          <router-link to="/gallery" style="color:#3b82f6;">
            {{ settingsStore.lang === 'zh' ? '回到 Gallery' : settingsStore.lang === 'ja' ? 'ギャラリーへ' : 'Go to Gallery' }}
          </router-link>
        </p>
      </div>

      <!-- Design content -->
      <template v-else-if="design">
        <!-- Author info bar -->
        <div class="detail-header">
          <div class="detail-header__left">
            <img v-if="design.user_avatar" :src="design.user_avatar" class="detail-header__avatar" />
            <div v-else class="detail-header__avatar detail-header__avatar--placeholder">
              {{ displayName[0]?.toUpperCase() || '?' }}
            </div>
            <div>
              <div class="detail-header__name">{{ displayName }}</div>
              <div class="detail-header__meta">
                <span v-if="design.title" style="color:#666;">{{ design.title }}</span>
                <span v-if="design.title"> · </span>
                <span>{{ displayDate }}</span>
                <span class="detail-header__theme-badge">
                  <i :class="design.is_dark ? 'fa-duotone fa-thin fa-moon' : 'fa-duotone fa-thin fa-sun-bright'" style="font-size:11px;margin-right:2px;"></i>
                  {{ design.is_dark ? 'Dark' : 'Light' }}
                </span>
              </div>
            </div>
          </div>
          <div class="detail-header__actions">
            <!-- Visibility toggle (owner only) -->
            <button v-if="isOwner" class="detail-btn" @click="toggleVisibility">
              <i :class="designVisibility === 'public' ? 'fa-duotone fa-thin fa-globe' : 'fa-duotone fa-thin fa-lock'" style="font-size:12px;"></i>
              {{ designVisibility === 'public' ? 'Public' : 'Private' }}
            </button>
            <button class="detail-btn" @click="downloadJSON">
              <i class="fa-duotone fa-thin fa-arrow-down-to-bracket" style="font-size:12px;"></i>
              JSON
            </button>
            <button class="detail-btn" @click="downloadHTMLFile">
              <i class="fa-duotone fa-thin fa-browser" style="font-size:12px;"></i>
              HTML
            </button>
          </div>
        </div>

        <!-- Cover Hero Preview -->
        <div v-if="tokens?.colors?.primary" class="detail-section detail-cover" :style="{ background: coverBg }">
          <div class="detail-cover__inner">
            <!-- Left: title + meta -->
            <div class="detail-cover__left">
              <div class="detail-cover__title" :style="{ color: coverTextColor, fontFamily: tokens.fonts?.heading || 'Inter' }">
                {{ design.title || displayName }}
              </div>
              <div class="detail-cover__sub" :style="{ color: coverSubColor }">
                {{ displayDate }} · {{ design.is_dark ? 'Dark' : 'Light' }} · {{ design.download_count || 0 }} downloads
              </div>
            </div>
            <!-- Right: mini component preview -->
            <div class="detail-cover__preview">
              <DesignPreviewCard :ds="tokens" />
            </div>
          </div>
        </div>

        <!-- Original Image (owner only) -->
        <div v-if="isOwner && (originalImgUrl || originalImgLoading)" class="detail-section">
          <div class="detail-section__label">
            <i class="fa-duotone fa-thin fa-image" style="margin-right:4px;"></i>
            {{ settingsStore.lang === 'zh' ? '原始參考圖' : settingsStore.lang === 'ja' ? '元の参照画像' : 'Original Reference' }}
          </div>
          <div style="padding:0 16px 16px;">
            <div v-if="originalImgLoading" style="text-align:center;padding:24px;color:#aaa;font-size:13px;">
              <i class="fa-duotone fa-thin fa-spinner-third fa-spin" style="margin-right:6px;"></i>Loading...
            </div>
            <img v-else-if="originalImgUrl" :src="originalImgUrl" class="detail-original-img" />
          </div>
        </div>

        <!-- UI Kit Preview (iframe) -->
        <div class="detail-section">
          <div class="detail-section__label">UI Kit Preview</div>
          <div class="detail-iframe-wrap">
            <iframe
              ref="iframeRef"
              class="detail-iframe"
              sandbox="allow-same-origin"
              :srcdoc="uiKitHTML"
            ></iframe>
          </div>
        </div>

        <!-- JSON Panel (collapsible) -->
        <div class="detail-section">
          <div class="detail-section__header" @click="jsonExpanded = !jsonExpanded">
            <div class="detail-section__label" style="margin-bottom:0;">Design Tokens JSON</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <button v-if="jsonExpanded" class="detail-btn detail-btn--sm" @click.stop="copyJSON">
                <i class="fa-duotone fa-thin fa-clipboard" style="font-size:11px;"></i>
                {{ copyLabel || 'Copy' }}
              </button>
              <i :class="jsonExpanded ? 'fa-duotone fa-thin fa-chevron-up' : 'fa-duotone fa-thin fa-chevron-down'" style="font-size:10px;color:#aaa;"></i>
            </div>
          </div>
          <div v-if="jsonExpanded" class="detail-json">
            <pre v-html="jsonHighlighted"></pre>
          </div>
        </div>
      </template>
    </div>
  </main>
</template>

<style scoped>
.back-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border: 1px solid #e8e8e8; border-radius: 8px;
  background: #fff; font-size: 12px; font-weight: 500; color: #555;
  cursor: pointer; margin-bottom: 20px; transition: all .15s;
}
.back-btn:hover { background: #f5f5f5; }

.detail-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; background: #fff; border: 1px solid #e8e8e8;
  border-radius: 14px; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;
}
.detail-header__left {
  display: flex; align-items: center; gap: 12px;
}
.detail-header__avatar {
  width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0;
}
.detail-header__avatar--placeholder {
  background: #e8e8e8; display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 600; color: #888;
}
.detail-header__name {
  font-size: 15px; font-weight: 700; color: #222;
}
.detail-header__meta {
  font-size: 12px; color: #aaa; display: flex; align-items: center; gap: 4px; margin-top: 2px;
}
.detail-header__theme-badge {
  font-size: 11px; margin-left: 4px;
}
.detail-header__actions {
  display: flex; gap: 8px; flex-wrap: wrap;
}

.detail-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 8px 16px; border: 1px solid #e8e8e8; border-radius: 8px;
  background: #fff; font-size: 12px; font-weight: 500; color: #555;
  cursor: pointer; transition: all .15s;
}
.detail-btn:hover { background: #f5f5f5; border-color: #ddd; }
.detail-btn--sm { padding: 4px 10px; font-size: 11px; }

/* ── Cover Hero ── */
.detail-cover {
  border-radius: 14px; overflow: hidden; margin-bottom: 16px;
  border: none;
}
.detail-cover__inner {
  display: flex; align-items: center; justify-content: space-between;
  padding: 28px 24px; gap: 20px;
}
.detail-cover__left {
  flex: 1; min-width: 0;
}
.detail-cover__title {
  font-size: 24px; font-weight: 800; line-height: 1.2; margin-bottom: 8px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.detail-cover__sub {
  font-size: 12px; opacity: .7;
}
.detail-cover__preview {
  flex-shrink: 0; width: 240px; border-radius: 12px; overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,.15);
}

/* ── Original Image ── */
.detail-original-img {
  max-width: 100%; border-radius: 10px; border: 1px solid #e8e8e8;
}

/* ── Sections ── */
.detail-section {
  background: #fff; border: 1px solid #e8e8e8; border-radius: 14px;
  margin-bottom: 16px; overflow: hidden;
}
.detail-section__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; cursor: pointer; user-select: none;
}
.detail-section__label {
  font-size: 11px; font-weight: 700; letter-spacing: .06em; color: #888;
  text-transform: uppercase; margin-bottom: 12px; padding: 14px 20px 0;
}

.detail-iframe-wrap {
  padding: 0 12px 12px;
}
.detail-iframe {
  width: 100%; min-height: 600px; border: none; border-radius: 10px;
  background: #f5f5f5;
}

.detail-json {
  padding: 0 20px 16px; max-height: 400px; overflow: auto;
}
.detail-json pre {
  font-size: 11px; line-height: 1.6; font-family: 'SF Mono', 'Fira Code', monospace;
  white-space: pre-wrap; word-break: break-word; margin: 0;
}

@media (max-width: 640px) {
  .detail-header { flex-direction: column; align-items: flex-start; }
  .detail-header__actions { width: 100%; }
  .detail-btn { flex: 1; justify-content: center; }
  .detail-cover__inner { flex-direction: column; padding: 20px 16px; }
  .detail-cover__preview { width: 100%; }
}
</style>
