<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { usePipelineStore } from '../../stores/pipeline'
import { useSettingsStore } from '../../stores/settings'
import { I } from '../../data/i18n'
import { SLOT_IDS, SLOT_ICONS } from '../../data/constants'
import { isLight } from '../../services/colorUtils'
import ColorDropdown from '../ui/ColorDropdown.vue'

const pipelineStore = usePipelineStore()
const settingsStore = useSettingsStore()

// Popular Google Fonts grouped
const GOOGLE_FONTS = [
  { value: 'Inter', category: 'sans-serif' },
  { value: 'Roboto', category: 'sans-serif' },
  { value: 'Open Sans', category: 'sans-serif' },
  { value: 'Montserrat', category: 'sans-serif' },
  { value: 'Poppins', category: 'sans-serif' },
  { value: 'Lato', category: 'sans-serif' },
  { value: 'Nunito', category: 'sans-serif' },
  { value: 'Raleway', category: 'sans-serif' },
  { value: 'DM Sans', category: 'sans-serif' },
  { value: 'Plus Jakarta Sans', category: 'sans-serif' },
  { value: 'Noto Sans TC', category: 'sans-serif' },
  { value: 'Noto Sans JP', category: 'sans-serif' },
  { value: 'Source Sans 3', category: 'sans-serif' },
  { value: 'Work Sans', category: 'sans-serif' },
  { value: 'Outfit', category: 'sans-serif' },
  { value: 'Manrope', category: 'sans-serif' },
  { value: 'Space Grotesk', category: 'sans-serif' },
  { value: 'Figtree', category: 'sans-serif' },
  { value: 'Sora', category: 'sans-serif' },
  { value: 'Lexend', category: 'sans-serif' },
  { value: 'Urbanist', category: 'sans-serif' },
  { value: 'Albert Sans', category: 'sans-serif' },
  { value: 'Red Hat Display', category: 'sans-serif' },
  { value: 'Barlow', category: 'sans-serif' },
  { value: 'Cabin', category: 'sans-serif' },
  { value: 'Archivo', category: 'sans-serif' },
  { value: 'Quicksand', category: 'sans-serif' },
  { value: 'Rubik', category: 'sans-serif' },
  { value: 'Josefin Sans', category: 'sans-serif' },
  { value: 'Karla', category: 'sans-serif' },
  { value: 'Exo 2', category: 'sans-serif' },
  { value: 'Playfair Display', category: 'serif' },
  { value: 'Merriweather', category: 'serif' },
  { value: 'Lora', category: 'serif' },
  { value: 'Noto Serif TC', category: 'serif' },
  { value: 'Noto Serif JP', category: 'serif' },
  { value: 'Source Serif 4', category: 'serif' },
  { value: 'DM Serif Display', category: 'serif' },
  { value: 'Cormorant Garamond', category: 'serif' },
  { value: 'Bitter', category: 'serif' },
  { value: 'Libre Baskerville', category: 'serif' },
  { value: 'Crimson Text', category: 'serif' },
  { value: 'EB Garamond', category: 'serif' },
  { value: 'Spectral', category: 'serif' },
  { value: 'Fraunces', category: 'serif' },
  { value: 'IBM Plex Mono', category: 'monospace' },
  { value: 'JetBrains Mono', category: 'monospace' },
  { value: 'Fira Code', category: 'monospace' },
  { value: 'Source Code Pro', category: 'monospace' },
  { value: 'Space Mono', category: 'monospace' },
  { value: 'Inconsolata', category: 'monospace' },
  { value: 'Roboto Mono', category: 'monospace' },
]

// Preload all Google Fonts on mount (lightweight swap=swap)
onMounted(() => {
  const families = GOOGLE_FONTS.map(f => `family=${encodeURIComponent(f.value)}:wght@400;700`).join('&')
  const id = 'gf-preload-all'
  if (!document.getElementById(id)) {
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`
    document.head.appendChild(link)
  }
})

// Custom font dropdown state
const openDropdown = ref(null) // 'heading' | 'body' | null
const fontSearch = ref('')

const filteredFonts = computed(() => {
  const q = fontSearch.value.toLowerCase().trim()
  if (!q) return GOOGLE_FONTS
  return GOOGLE_FONTS.filter(f => f.value.toLowerCase().includes(q))
})

function toggleFontDropdown(role) {
  if (openDropdown.value === role) {
    openDropdown.value = null
    fontSearch.value = ''
  } else {
    openDropdown.value = role
    fontSearch.value = ''
  }
}

function selectFont(role, font) {
  updateFont(role, font.value)
  openDropdown.value = null
  fontSearch.value = ''
}

function onClickOutsideFont(e) {
  if (openDropdown.value && !e.target.closest('.font-dropdown-wrap')) {
    openDropdown.value = null
    fontSearch.value = ''
  }
}

onMounted(() => { document.addEventListener('click', onClickOutsideFont, true) })
onUnmounted(() => { document.removeEventListener('click', onClickOutsideFont, true) })

// Initialize font selections from store
if (!pipelineStore.detectedFonts || pipelineStore.detectedFonts.length === 0) {
  pipelineStore.detectedFonts = [
    { role: 'heading', family: 'Inter', category: 'sans-serif' },
    { role: 'body', family: 'Inter', category: 'sans-serif' },
  ]
}

function updateFont(role, fontValue) {
  const font = GOOGLE_FONTS.find(f => f.value === fontValue)
  if (!font) return
  const idx = pipelineStore.detectedFonts.findIndex(f => f.role === role)
  if (idx >= 0) {
    pipelineStore.detectedFonts[idx] = { role, family: font.value, category: font.category }
  } else {
    pipelineStore.detectedFonts.push({ role, family: font.value, category: font.category })
  }
  pipelineStore.detectedFonts = [...pipelineStore.detectedFonts]
  loadGoogleFont(font.value)
}

function loadGoogleFont(family) {
  const id = 'gf-' + family.replace(/\s+/g, '-')
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;600;700;800&display=swap`
  document.head.appendChild(link)
}

function getFont(role) {
  return pipelineStore.detectedFonts?.find(f => f.role === role)?.family || 'Inter'
}

function t(obj) {
  if (!obj) return ''
  return obj[settingsStore.lang] || obj.en || ''
}

// Dropdown options from extracted palette
const paletteOptions = computed(() => {
  return pipelineStore.extractedColors.map(c => ({ hex: c.hex }))
})

// Update a light theme slot
function updateLightSlot(slotId, hex) {
  pipelineStore.lightColorSlots = { ...pipelineStore.lightColorSlots, [slotId]: hex }
}

// Update a dark theme slot
function updateDarkSlot(slotId, hex) {
  pipelineStore.darkColorSlots = { ...pipelineStore.darkColorSlots, [slotId]: hex }
}
</script>

<template>
  <div style="max-width: 880px; margin: 0 auto">
    <h1 style="font-size: 26px; font-weight: 700; color: #111; margin-bottom: 6px">
      {{ t(I.s3.title) }}
    </h1>
    <p style="color: #888; font-size: 15px; margin-bottom: 28px">
      {{ t(I.s3.desc) }}
    </p>

    <!-- Font Settings Section -->
    <div class="tok-card">
      <div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 16px">
        <div class="tok-label" style="margin-bottom: 0">{{ t(I.s3.fonts) }}</div>
        <span style="font-size: 11px; color: #bbb">{{ t(I.s3.fontsDesc) }}</span>
      </div>
      <div class="font-grid">
        <!-- Heading Font -->
        <div style="border: 1px solid #e8e8e8; border-radius: 10px; padding: 14px">
          <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 8px">
            {{ t(I.s3.headingFont) }}
          </div>
          <div class="font-dropdown-wrap">
            <button class="font-dropdown-trigger" @click.stop="toggleFontDropdown('heading')" :style="{ fontFamily: getFont('heading') + ', sans-serif' }">
              <span>{{ getFont('heading') }}</span>
              <i class="fa-duotone fa-thin fa-chevron-down" style="font-size:10px;color:#999;"></i>
            </button>
            <div v-if="openDropdown === 'heading'" class="font-dropdown-panel">
              <input
                v-model="fontSearch"
                placeholder="Search fonts..."
                class="font-dropdown-search"
                @click.stop
              />
              <div class="font-dropdown-list">
                <template v-for="cat in ['sans-serif', 'serif', 'monospace']" :key="cat">
                  <div v-if="filteredFonts.filter(f=>f.category===cat).length" class="font-dropdown-cat">{{ cat }}</div>
                  <div
                    v-for="f in filteredFonts.filter(f=>f.category===cat)"
                    :key="f.value"
                    class="font-dropdown-item"
                    :class="{ 'font-dropdown-item--active': getFont('heading') === f.value }"
                    :style="{ fontFamily: f.value + ', ' + f.category }"
                    @click.stop="selectFont('heading', f)"
                  >{{ f.value }}</div>
                </template>
              </div>
            </div>
          </div>
          <div :style="{ fontFamily: getFont('heading') + ', sans-serif', fontSize: '22px', fontWeight: 700, lineHeight: '1.3', color: '#222' }">
            Heading Preview
          </div>
          <div :style="{ fontFamily: getFont('heading') + ', sans-serif', fontSize: '14px', fontWeight: 400, color: '#999', marginTop: '2px' }">
            {{ getFont('heading') }}
          </div>
        </div>

        <!-- Body Font -->
        <div style="border: 1px solid #e8e8e8; border-radius: 10px; padding: 14px">
          <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 8px">
            {{ t(I.s3.bodyFont) }}
          </div>
          <div class="font-dropdown-wrap">
            <button class="font-dropdown-trigger" @click.stop="toggleFontDropdown('body')" :style="{ fontFamily: getFont('body') + ', sans-serif' }">
              <span>{{ getFont('body') }}</span>
              <i class="fa-duotone fa-thin fa-chevron-down" style="font-size:10px;color:#999;"></i>
            </button>
            <div v-if="openDropdown === 'body'" class="font-dropdown-panel">
              <input
                v-model="fontSearch"
                placeholder="Search fonts..."
                class="font-dropdown-search"
                @click.stop
              />
              <div class="font-dropdown-list">
                <template v-for="cat in ['sans-serif', 'serif', 'monospace']" :key="cat">
                  <div v-if="filteredFonts.filter(f=>f.category===cat).length" class="font-dropdown-cat">{{ cat }}</div>
                  <div
                    v-for="f in filteredFonts.filter(f=>f.category===cat)"
                    :key="f.value"
                    class="font-dropdown-item"
                    :class="{ 'font-dropdown-item--active': getFont('body') === f.value }"
                    :style="{ fontFamily: f.value + ', ' + f.category }"
                    @click.stop="selectFont('body', f)"
                  >{{ f.value }}</div>
                </template>
              </div>
            </div>
          </div>
          <div :style="{ fontFamily: getFont('body') + ', sans-serif', fontSize: '15px', fontWeight: 400, lineHeight: '1.6', color: '#333' }">
            Body text preview — The quick brown fox jumps over the lazy dog.
          </div>
          <div :style="{ fontFamily: getFont('body') + ', sans-serif', fontSize: '14px', fontWeight: 400, color: '#999', marginTop: '2px' }">
            {{ getFont('body') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Extracted Palette (read-only) -->
    <div class="tok-card">
      <div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 16px">
        <div class="tok-label" style="margin-bottom: 0">{{ t(I.s3.palette) }}</div>
        <span style="font-size: 11px; color: #bbb">{{ t(I.s3.paletteDesc) }}</span>
      </div>
      <div class="palette-grid">
        <div
          v-for="(color, idx) in pipelineStore.extractedColors"
          :key="idx"
          style="text-align: center"
        >
          <div
            class="palette-chip"
            :style="{ background: color.hex }"
          >
            <span
              v-if="color.ratio"
              :style="{
                fontSize: '10px',
                color: isLight(color.hex) ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.65)',
                pointerEvents: 'none',
                fontWeight: 600,
              }"
            >
              {{ Math.round(color.ratio * 100) }}%
            </span>
          </div>
          <div style="font-size: 10px; font-family: monospace; color: #999; margin-top: 4px">
            {{ color.hex }}
          </div>
        </div>
      </div>
    </div>

    <!-- Light Palette (editable) -->
    <div class="tok-card">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px">
        <span style="font-size: 16px;">☀</span>
        <div class="tok-label" style="margin-bottom: 0">{{ t(I.s3.lightPalette) }}</div>
        <span style="font-size: 11px; color: #bbb">{{ t(I.s3.lightPaletteDesc) }}</span>
      </div>
      <div class="slot-grid">
        <div
          v-for="slotId in SLOT_IDS"
          :key="'light-' + slotId"
          class="slot-card"
        >
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px">
            <span
              class="slot-icon"
              :style="{ background: pipelineStore.lightColorSlots[slotId] || '#ccc', color: isLight(pipelineStore.lightColorSlots[slotId] || '#ccc') ? '#333' : '#fff' }"
            >{{ SLOT_ICONS[slotId] }}</span>
            <div>
              <div style="font-size: 12px; font-weight: 600; color: #333">{{ t(I.slotLabels[slotId]) || slotId }}</div>
              <div style="font-size: 10px; color: #bbb; line-height: 1.3">{{ t(I.slotHints[slotId]) }}</div>
            </div>
          </div>
          <ColorDropdown
            :modelValue="pipelineStore.lightColorSlots[slotId] || '#ccc'"
            :options="paletteOptions"
            @update:modelValue="(hex) => updateLightSlot(slotId, hex)"
          />
        </div>
      </div>
    </div>

    <!-- Dark Palette (editable) -->
    <div class="tok-card tok-card--dark">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px">
        <span style="font-size: 16px;">●</span>
        <div class="tok-label" style="margin-bottom: 0; color: #777">{{ t(I.s3.darkPalette) }}</div>
        <span style="font-size: 11px; color: #555">{{ t(I.s3.darkPaletteDesc) }}</span>
      </div>
      <div class="slot-grid">
        <div
          v-for="slotId in SLOT_IDS"
          :key="'dark-' + slotId"
          class="slot-card slot-card--dark"
        >
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px">
            <span
              class="slot-icon"
              :style="{ background: pipelineStore.darkColorSlots[slotId] || '#ccc', color: isLight(pipelineStore.darkColorSlots[slotId] || '#ccc') ? '#333' : '#fff' }"
            >{{ SLOT_ICONS[slotId] }}</span>
            <div>
              <div style="font-size: 12px; font-weight: 600; color: #333">{{ t(I.slotLabels[slotId]) || slotId }}</div>
              <div style="font-size: 10px; color: #bbb; line-height: 1.3">{{ t(I.slotHints[slotId]) }}</div>
            </div>
          </div>
          <ColorDropdown
            :modelValue="pipelineStore.darkColorSlots[slotId] || '#ccc'"
            :options="paletteOptions"
            @update:modelValue="(hex) => updateDarkSlot(slotId, hex)"
          />
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.tok-card {
  margin-bottom: 20px;
  padding: 18px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
}

.tok-card--dark {
  background: #1a1a1a;
  border-color: #333;
}

.tok-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #999;
  margin-bottom: 16px;
  text-transform: uppercase;
}

.palette-chip {
  width: 72px;
  height: 56px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.palette-grid {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.slot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.slot-card {
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 10px;
}

.slot-card--dark {
  border-color: #e0e0e0;
  background: #fff;
}

.slot-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.font-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.font-dropdown-wrap {
  position: relative;
  margin-bottom: 10px;
}

.font-dropdown-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
  font-size: 13px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  color: #333;
  cursor: pointer;
  transition: border-color 0.15s;
}

.font-dropdown-trigger:hover {
  border-color: #bbb;
}

.font-dropdown-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
  z-index: 80;
  overflow: hidden;
}

.font-dropdown-search {
  width: 100%;
  padding: 8px 12px;
  font-size: 12px;
  border: none;
  border-bottom: 1px solid #eee;
  outline: none;
  background: #fafafa;
}

.font-dropdown-list {
  max-height: 260px;
  overflow-y: auto;
}

.font-dropdown-cat {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #aaa;
  text-transform: uppercase;
  padding: 8px 12px 3px;
}

.font-dropdown-item {
  padding: 7px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.1s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.font-dropdown-item:hover {
  background: #f5f5f5;
}

.font-dropdown-item--active {
  background: #f0f0f0;
  font-weight: 600;
  color: #111;
}

@media (max-width: 768px) {
  .font-grid {
    grid-template-columns: 1fr;
  }

  .palette-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .palette-chip {
    width: 100% !important;
    height: 48px !important;
  }

  .slot-grid {
    grid-template-columns: 1fr;
  }
}
</style>
