<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../../stores/settings'
import { buildUIKitHTML } from '../../services/uiKitRenderer'
import { getJSONOutput, downloadSKILL, downloadSKILLZip, downloadHTML, downloadDesignMD } from '../../services/downloadService'
import { buildFigmaJSON } from '../../services/figmaJsonBuilder'
import { COMP_META } from '../../data/compMeta'
import DesignPreviewCard from './DesignPreviewCard.vue'

const props = defineProps({
  item: { type: Object, required: true },
  showVisibilityToggle: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle-visibility'])

const router = useRouter()
const settingsStore = useSettingsStore()

const colors = computed(() => props.item.colors || {})
const displayName = computed(() => props.item.user_name || (settingsStore.lang === 'zh' ? '匿名' : settingsStore.lang === 'ja' ? '匿名' : 'Anonymous'))
const displayDate = computed(() => {
  if (!props.item.created_at) return ''
  const d = new Date(props.item.created_at + (props.item.created_at.includes('Z') ? '' : 'Z'))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const miniDS = computed(() => ({
  colors: colors.value,
  isDark: !!props.item.is_dark,
  allColors: Object.values(colors.value).filter(c => c && typeof c === 'string' && c.startsWith('#')),
}))

// Mobile: randomly show swatch or preview (decided once on mount)
const showPreviewOnMobile = ref(false)
let popRaf = null

onMounted(() => {
  showPreviewOnMobile.value = Math.random() > 0.5
  document.addEventListener('click', closePopoverOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', closePopoverOutside)
  if (popRaf) cancelAnimationFrame(popRaf)
})

function viewDetail() {
  router.push({ name: 'gallery-detail', params: { id: props.item.id } })
}

// ── Download popover (teleported to body) ──
const dlOpen = ref(false)
const dlLoading = ref(false)
const cardEl = ref(null)
const dlBtnEl = ref(null)
const popStyle = ref({})

function toggleDlPopover() {
  if (!dlOpen.value) {
    cachedDesign = null; cachedTokens = null; figmaCopied.value = false
    updatePopPosition()
    startPositionTracking()
  } else {
    stopPositionTracking()
  }
  dlOpen.value = !dlOpen.value
}

function updatePopPosition() {
  if (!dlBtnEl.value) return
  const rect = dlBtnEl.value.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) { dlOpen.value = false; stopPositionTracking(); return }
  popStyle.value = {
    position: 'fixed',
    left: `${rect.left + rect.width / 2}px`,
    bottom: `${window.innerHeight - rect.top + 6}px`,
    transform: 'translateX(-50%)',
    zIndex: 99990,
  }
}

function startPositionTracking() {
  function track() {
    if (!dlOpen.value) return
    updatePopPosition()
    popRaf = requestAnimationFrame(track)
  }
  popRaf = requestAnimationFrame(track)
}

function stopPositionTracking() {
  if (popRaf) { cancelAnimationFrame(popRaf); popRaf = null }
}

function closePopoverOutside(e) {
  if (dlOpen.value && cardEl.value && !cardEl.value.contains(e.target)) {
    const pop = document.querySelector('.gallery-card__dl-pop')
    if (pop && pop.contains(e.target)) return
    dlOpen.value = false
    stopPositionTracking()
  }
}

function incrementDownload() {
  const apiBase = import.meta.env.VITE_API_BASE || ''
  if (!apiBase) return
  const hdrs = {}
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_KEY) hdrs['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY
  fetch(`${apiBase}/api/gallery/${props.item.id}/download`, { method: 'POST', headers: hdrs }).catch(() => {})
}

async function fetchFullTokens() {
  const apiBase = import.meta.env.VITE_API_BASE || ''
  if (!apiBase) return null
  try {
    const hdrs = {}
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_KEY) hdrs['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY
    const resp = await fetch(`${apiBase}/api/gallery/${props.item.id}`, { headers: hdrs })
    if (!resp.ok) return null
    const data = await resp.json()
    return data.design
  } catch { return null }
}

// Cached full design (fetched once per popover session)
let cachedDesign = null
let cachedTokens = null

async function ensureFullData() {
  if (cachedDesign) return true
  dlLoading.value = true
  cachedDesign = await fetchFullTokens()
  if (cachedDesign?.tokens_json) {
    try { cachedTokens = JSON.parse(cachedDesign.tokens_json) } catch { cachedTokens = null }
  }
  dlLoading.value = false
  return !!cachedTokens
}

const figmaCopied = ref(false)

async function dlJSON() {
  if (!await ensureFullData()) return
  incrementDownload()
  const out = getJSONOutput(cachedTokens, [], COMP_META, Object.values(cachedTokens.colors || {}), 'tailwind', null, [])
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `${props.item.title || 'design-system'}.json`
  a.click(); URL.revokeObjectURL(url)
  dlOpen.value = false
}

async function dlHTML() {
  if (!await ensureFullData()) return
  incrementDownload()
  const html = buildUIKitHTML(cachedTokens, [], [])
  downloadHTML(cachedTokens, html)
  dlOpen.value = false
}

async function dlSKILL() {
  if (!await ensureFullData()) return
  incrementDownload()
  downloadSKILL(cachedTokens, [], settingsStore.lang, COMP_META, Object.values(cachedTokens.colors || {}), 'tailwind', null)
  dlOpen.value = false
}

async function dlSKILLZip() {
  if (!await ensureFullData()) return
  incrementDownload()
  await downloadSKILLZip(cachedTokens, null, [], settingsStore.lang, COMP_META, Object.values(cachedTokens.colors || {}), 'tailwind', null, [])
  dlOpen.value = false
}

async function dlDesignMD() {
  if (!await ensureFullData()) return
  incrementDownload()
  let holistic = null
  try { holistic = JSON.parse(cachedDesign.holistic_json || '{}') } catch {}
  downloadDesignMD(cachedTokens, holistic, settingsStore.lang)
  dlOpen.value = false
}

async function dlFigmaCopy() {
  if (!await ensureFullData()) return
  const figma = buildFigmaJSON(cachedTokens)
  if (!figma) return
  await navigator.clipboard.writeText(JSON.stringify(figma, null, 2))
  figmaCopied.value = true
  setTimeout(() => { figmaCopied.value = false }, 2500)
}
</script>

<template>
  <div ref="cardEl" class="gallery-card" :class="{ 'gallery-card--mobile-preview': showPreviewOnMobile }">
    <!-- Visual area: swatch default, preview on hover (desktop) / random (mobile) -->
    <div class="gallery-card__visual" @click="viewDetail">
      <!-- Swatch -->
      <div class="gallery-card__swatch">
        <div class="gallery-card__swatch-top">
          <div :style="{ background: colors.primary || '#ccc' }"></div>
          <div :style="{ background: colors.secondary || colors.primary || '#aaa' }"></div>
        </div>
        <div class="gallery-card__swatch-mid">
          <div :style="{ background: colors.accent || '#888' }"></div>
          <div :style="{ background: colors.success || '#22c55e' }"></div>
          <div :style="{ background: colors.warning || '#f59e0b' }"></div>
          <div :style="{ background: colors.danger || '#ef4444' }"></div>
        </div>
        <div class="gallery-card__swatch-bottom">
          <div :style="{ background: colors.surface || '#f5f5f5' }"></div>
          <div :style="{ background: colors.text || '#222' }"></div>
        </div>
      </div>

      <!-- Preview -->
      <div class="gallery-card__preview">
        <DesignPreviewCard :ds="miniDS" />
      </div>

      <!-- Theme badge -->
      <span class="gallery-card__theme-badge">
        <i :class="item.is_dark ? 'fa-duotone fa-thin fa-moon' : 'fa-duotone fa-thin fa-sun-bright'" style="font-size:11px;"></i>
      </span>
    </div>

    <!-- Meta -->
    <div class="gallery-card__meta">
      <div class="gallery-card__author">
        <img v-if="item.user_avatar" :src="item.user_avatar" class="gallery-card__avatar" />
        <div v-else class="gallery-card__avatar gallery-card__avatar--placeholder">
          {{ displayName[0]?.toUpperCase() || '?' }}
        </div>
        <span class="gallery-card__name">{{ displayName }}</span>
      </div>
      <div class="gallery-card__info">
        <span v-if="item.title" class="gallery-card__title">{{ item.title }}</span>
        <span v-if="item.title" class="gallery-card__sep">·</span>
        <span class="gallery-card__date">{{ displayDate }}</span>
        <span v-if="item.download_count > 0" class="gallery-card__downloads">
          <i class="fa-duotone fa-thin fa-arrow-down-to-bracket" style="font-size:9px;"></i>
          {{ item.download_count }}
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="gallery-card__actions">
      <button class="gallery-card__btn" @click.stop="viewDetail">
        <i class="fa-duotone fa-thin fa-eye" style="font-size:11px;"></i>
        View
      </button>
      <div class="gallery-card__dl-wrap">
        <button ref="dlBtnEl" class="gallery-card__btn" @click.stop="toggleDlPopover">
          <i class="fa-duotone fa-thin fa-arrow-down-to-bracket" style="font-size:11px;"></i>
          Download
        </button>
      </div>
      <button
        v-if="showVisibilityToggle"
        class="gallery-card__btn gallery-card__btn--vis"
        @click.stop="emit('toggle-visibility', item)"
        :title="item.visibility === 'public' ? 'Make private' : 'Make public'"
      >
        <i :class="item.visibility === 'public' ? 'fa-duotone fa-thin fa-globe' : 'fa-duotone fa-thin fa-lock'" style="font-size:11px;"></i>
      </button>
    </div>
  </div>

  <!-- Download popover (teleported to body to escape overflow) -->
  <Teleport to="body">
    <Transition name="pop">
      <div v-if="dlOpen" class="gallery-card__dl-pop" :style="popStyle" @click.stop>
        <button class="dl-pop__item" @click="dlJSON" :disabled="dlLoading">
          <i class="fa-duotone fa-thin fa-brackets-curly dl-pop__icon"></i>
          <span>JSON</span>
          <span class="dl-pop__desc">Design Tokens</span>
        </button>
        <button class="dl-pop__item" @click="dlHTML" :disabled="dlLoading">
          <i class="fa-duotone fa-thin fa-browser dl-pop__icon"></i>
          <span>HTML</span>
          <span class="dl-pop__desc">UI Kit Preview</span>
        </button>
        <button class="dl-pop__item" @click="dlSKILL" :disabled="dlLoading">
          <i class="fa-duotone fa-thin fa-wand-magic-sparkles dl-pop__icon"></i>
          <span>SKILL.md</span>
          <span class="dl-pop__desc">Coding Agent</span>
        </button>
        <button class="dl-pop__item" @click="dlSKILLZip" :disabled="dlLoading">
          <i class="fa-duotone fa-thin fa-folder-open dl-pop__icon"></i>
          <span>SKILL.zip</span>
          <span class="dl-pop__desc">Light + Dark</span>
        </button>
        <button class="dl-pop__item" @click="dlDesignMD" :disabled="dlLoading">
          <i class="fa-duotone fa-thin fa-palette dl-pop__icon"></i>
          <span>DESIGN.md</span>
          <span class="dl-pop__desc">for Stitch</span>
        </button>
        <div class="dl-pop__divider"></div>
        <button class="dl-pop__item" :class="{ 'dl-pop__item--disabled': !settingsStore.features.figma }" @click="settingsStore.features.figma && dlFigmaCopy()" :disabled="dlLoading || !settingsStore.features.figma">
          <i class="fa-brands fa-figma dl-pop__icon"></i>
          <span>{{ figmaCopied ? 'Copied!' : 'Copy Figma JSON' }}</span>
          <span v-if="!settingsStore.features.figma" class="dl-pop__desc">Coming Soon</span>
          <i v-if="figmaCopied" class="fa-duotone fa-thin fa-check" style="margin-left:auto;font-size:11px;color:#22c55e;"></i>
        </button>
        <div v-if="dlLoading" class="dl-pop__loading">
          <i class="fa-duotone fa-thin fa-spinner-third fa-spin" style="font-size:11px;margin-right:4px;"></i>
          Loading...
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.gallery-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
  position: relative;
}
.gallery-card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,.08);
  transform: translateY(-2px);
}

/* ── Visual area: fixed height, both faces fill it ── */
.gallery-card__visual {
  position: relative;
  padding: 10px;
  height: 130px;
  overflow: hidden;
}

.gallery-card__swatch {
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.gallery-card__preview {
  position: absolute;
  inset: 8px;
  opacity: 0;
  transform: scale(0.96);
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: none;
  z-index: 1;
  border-radius: 8px;
  overflow: hidden;
}

/* Desktop hover: flip swatch → preview */
@media (hover: hover) {
  .gallery-card:hover .gallery-card__swatch {
    opacity: 0;
    transform: scale(0.96);
  }
  .gallery-card:hover .gallery-card__preview {
    opacity: 1;
    transform: scale(1);
  }
  .gallery-card:hover .gallery-card__theme-badge {
    opacity: 0;
  }
}

.gallery-card__swatch-top {
  display: flex; gap: 4px; margin-bottom: 4px; flex: 5;
}
.gallery-card__swatch-top > div {
  flex: 1; border-radius: 8px;
}
.gallery-card__swatch-mid {
  display: flex; gap: 3px; margin-bottom: 4px; flex: 2;
}
.gallery-card__swatch-mid > div {
  flex: 1; border-radius: 5px;
}
.gallery-card__swatch-bottom {
  display: flex; gap: 3px; flex: 1.5;
}
.gallery-card__swatch-bottom > div {
  flex: 1; border-radius: 4px;
}

.gallery-card__theme-badge {
  position: absolute; top: 14px; right: 14px;
  background: rgba(255,255,255,.85); border-radius: 6px; padding: 3px 6px;
  line-height: 1; z-index: 2;
  transition: opacity 0.2s;
}

/* ── Mobile: randomly show preview face ── */
@media (hover: none) {
  .gallery-card--mobile-preview .gallery-card__swatch {
    opacity: 0;
    position: absolute;
    pointer-events: none;
  }
  .gallery-card--mobile-preview .gallery-card__preview {
    opacity: 1;
    transform: scale(1);
    position: absolute;
    inset: 8px;
    border-radius: 8px;
    overflow: hidden;
  }
  .gallery-card--mobile-preview .gallery-card__theme-badge {
    opacity: 0;
  }
}

/* ── Meta ── */
.gallery-card__meta {
  padding: 10px 12px 4px;
}
.gallery-card__author {
  display: flex; align-items: center; gap: 6px; margin-bottom: 4px;
}
.gallery-card__avatar {
  width: 20px; height: 20px; border-radius: 50%; object-fit: cover; flex-shrink: 0;
}
.gallery-card__avatar--placeholder {
  background: #e8e8e8; display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 600; color: #888;
}
.gallery-card__name {
  font-size: 12px; font-weight: 600; color: #333;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.gallery-card__info {
  display: flex; align-items: center; gap: 4px; font-size: 11px; color: #aaa;
  overflow: hidden; white-space: nowrap;
}
.gallery-card__title {
  color: #888; overflow: hidden; text-overflow: ellipsis;
}
.gallery-card__sep { color: #ddd; }
.gallery-card__date { flex-shrink: 0; }
.gallery-card__downloads {
  margin-left: auto; display: flex; align-items: center; gap: 2px; flex-shrink: 0;
}

/* ── Actions ── */
.gallery-card__actions {
  display: flex; gap: 6px; padding: 8px 12px 12px;
  position: relative;
  z-index: 3;
}
.gallery-card__btn {
  flex: 1; padding: 6px 0; border: 1px solid #e8e8e8; border-radius: 8px;
  background: #fff; font-size: 11px; font-weight: 500; color: #555; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  transition: all .15s;
}
.gallery-card__btn:hover {
  background: #f5f5f5; border-color: #ddd;
}
.gallery-card__btn--vis {
  flex: 0 0 32px; padding: 6px;
}

/* ── Download wrap ── */
.gallery-card__dl-wrap {
  position: relative; flex: 1;
}
.gallery-card__dl-wrap .gallery-card__btn {
  width: 100%;
}
</style>

<!-- Non-scoped: teleported popover lives outside this component's DOM -->
<style>
.gallery-card__dl-pop {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.12);
  padding: 4px;
  min-width: 200px;
}
.gallery-card__dl-pop::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 8px; height: 8px;
  background: #fff;
  border-right: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
}
.dl-pop__item {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 8px 10px; border: none; border-radius: 7px;
  background: transparent; font-size: 12px; font-weight: 500; color: #333;
  cursor: pointer; text-align: left; transition: background .12s;
}
.dl-pop__item:hover { background: #f5f5f5; }
.dl-pop__item:disabled { opacity: .5; cursor: wait; }
.dl-pop__item--disabled { opacity: .4; cursor: not-allowed; }
.dl-pop__icon {
  font-size: 12px; width: 16px; text-align: center; flex-shrink: 0;
}
.dl-pop__desc {
  margin-left: auto; font-size: 10px; color: #aaa; font-weight: 400;
}
.dl-pop__divider {
  height: 1px; background: #f0f0f0; margin: 2px 6px;
}
.dl-pop__loading {
  text-align: center; padding: 6px; font-size: 11px; color: #aaa;
}
.pop-enter-active, .pop-leave-active {
  transition: opacity .15s ease, transform .15s ease;
}
.pop-enter-from, .pop-leave-to {
  opacity: 0; transform: translateX(-50%) translateY(4px);
}
</style>
