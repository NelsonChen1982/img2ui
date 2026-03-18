<script setup>
import { ref, computed } from 'vue'
import { usePipelineStore } from '../../stores/pipeline'
import { useSettingsStore } from '../../stores/settings'
import { I } from '../../data/i18n'
import { SLOT_IDS, SLOT_ICONS } from '../../data/constants'
import { isLight, hexToRgb } from '../../services/colorUtils'

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
  { value: 'Playfair Display', category: 'serif' },
  { value: 'Merriweather', category: 'serif' },
  { value: 'Lora', category: 'serif' },
  { value: 'Noto Serif TC', category: 'serif' },
  { value: 'Noto Serif JP', category: 'serif' },
  { value: 'Source Serif 4', category: 'serif' },
  { value: 'IBM Plex Mono', category: 'monospace' },
  { value: 'JetBrains Mono', category: 'monospace' },
  { value: 'Fira Code', category: 'monospace' },
]

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
  // Load the font
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

function handleDragOver(event) {
  event.preventDefault()
}

function handleFileSelect(event) {
  const files = event.target.files
  if (files.length > 0) {
    const file = files[0]
    const reader = new FileReader()
    reader.onload = (e) => {
      pipelineStore.setImage(e.target.result)
    }
    reader.readAsDataURL(file)
  }
}

function updateColor(idx, newHex) {
  const rgb = hexToRgb(newHex)
  const oldHex = pipelineStore.extractedColors[idx].hex
  pipelineStore.extractedColors[idx].hex = newHex
  pipelineStore.extractedColors[idx].r = rgb.r
  pipelineStore.extractedColors[idx].g = rgb.g
  pipelineStore.extractedColors[idx].b = rgb.b
  pipelineStore.extractedColors[idx].lum = rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114

  // Update slots that use this color
  SLOT_IDS.forEach((slotId) => {
    if (pipelineStore.colorSlots[slotId] === oldHex) {
      pipelineStore.colorSlots[slotId] = newHex
    }
  })

  // Trigger reactivity
  pipelineStore.extractedColors = [...pipelineStore.extractedColors]
  pipelineStore.colorSlots = { ...pipelineStore.colorSlots }
}

function addColor() {
  pipelineStore.addColor()
  pipelineStore.extractedColors = [...pipelineStore.extractedColors]
}

function removeColor(idx) {
  pipelineStore.removeColor(idx)
  pipelineStore.extractedColors = [...pipelineStore.extractedColors]
}

function updateSlot(slotId, hex) {
  pipelineStore.updateSlot(slotId, hex)
  pipelineStore.colorSlots = { ...pipelineStore.colorSlots }
}

function pickSlotFromPalette(slotId, value) {
  if (value === '__custom__') {
    const input = document.querySelector(`input[data-slot="${slotId}"]`)
    if (input) input.click()
    return
  }
  if (value) {
    updateSlot(slotId, value)
  }
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

    <!-- Font Settings Section (top) -->
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
          <select
            :value="getFont('heading')"
            @change="(e) => updateFont('heading', e.target.value)"
            style="
              width: 100%;
              font-size: 13px;
              border: 1px solid #e0e0e0;
              border-radius: 6px;
              padding: 6px 8px;
              background: #fff;
              color: #333;
              margin-bottom: 10px;
            "
          >
            <optgroup label="Sans-serif">
              <option v-for="f in GOOGLE_FONTS.filter(f=>f.category==='sans-serif')" :key="f.value" :value="f.value">{{ f.value }}</option>
            </optgroup>
            <optgroup label="Serif">
              <option v-for="f in GOOGLE_FONTS.filter(f=>f.category==='serif')" :key="f.value" :value="f.value">{{ f.value }}</option>
            </optgroup>
            <optgroup label="Monospace">
              <option v-for="f in GOOGLE_FONTS.filter(f=>f.category==='monospace')" :key="f.value" :value="f.value">{{ f.value }}</option>
            </optgroup>
          </select>
          <div
            :style="{
              fontFamily: getFont('heading') + ', sans-serif',
              fontSize: '22px',
              fontWeight: 700,
              lineHeight: '1.3',
              color: '#222',
            }"
          >
            Heading Preview
          </div>
          <div
            :style="{
              fontFamily: getFont('heading') + ', sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              color: '#999',
              marginTop: '2px',
            }"
          >
            {{ getFont('heading') }}
          </div>
        </div>

        <!-- Body Font -->
        <div style="border: 1px solid #e8e8e8; border-radius: 10px; padding: 14px">
          <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 8px">
            {{ t(I.s3.bodyFont) }}
          </div>
          <select
            :value="getFont('body')"
            @change="(e) => updateFont('body', e.target.value)"
            style="
              width: 100%;
              font-size: 13px;
              border: 1px solid #e0e0e0;
              border-radius: 6px;
              padding: 6px 8px;
              background: #fff;
              color: #333;
              margin-bottom: 10px;
            "
          >
            <optgroup label="Sans-serif">
              <option v-for="f in GOOGLE_FONTS.filter(f=>f.category==='sans-serif')" :key="f.value" :value="f.value">{{ f.value }}</option>
            </optgroup>
            <optgroup label="Serif">
              <option v-for="f in GOOGLE_FONTS.filter(f=>f.category==='serif')" :key="f.value" :value="f.value">{{ f.value }}</option>
            </optgroup>
            <optgroup label="Monospace">
              <option v-for="f in GOOGLE_FONTS.filter(f=>f.category==='monospace')" :key="f.value" :value="f.value">{{ f.value }}</option>
            </optgroup>
          </select>
          <div
            :style="{
              fontFamily: getFont('body') + ', sans-serif',
              fontSize: '15px',
              fontWeight: 400,
              lineHeight: '1.6',
              color: '#333',
            }"
          >
            Body text preview — The quick brown fox jumps over the lazy dog.
          </div>
          <div
            :style="{
              fontFamily: getFont('body') + ', sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              color: '#999',
              marginTop: '2px',
            }"
          >
            {{ getFont('body') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Palette Section -->
    <div class="tok-card">
      <div class="tok-label">{{ t(I.s3.palette) }}</div>
      <div class="palette-grid">
        <div
          v-for="(color, idx) in pipelineStore.extractedColors"
          :key="idx"
          style="text-align: center; position: relative"
        >
          <div
            class="color-chip palette-chip"
            :style="{
              background: color.hex,
            }"
          >
            <input
              type="color"
              :value="color.hex"
              @change="(e) => updateColor(idx, e.target.value)"
              style="
                position: absolute;
                inset: 0;
                opacity: 0;
                cursor: pointer;
                border-radius: 10px;
              "
            />
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
          <button
            v-if="pipelineStore.extractedColors.length > 3"
            @click="removeColor(idx)"
            style="
              position: absolute;
              top: -5px;
              right: -5px;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              border: 1px solid #ddd;
              background: #fff;
              font-size: 9px;
              color: #999;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
            "
          >
            <i class="fa-duotone fa-thin fa-xmark" style="font-size:8px;"></i>
          </button>
        </div>

        <!-- Add Color Button -->
        <div style="text-align: center">
          <button
            @click="addColor"
            class="add-color-btn"
          >
            +
          </button>
          <div style="font-size: 10px; color: #bbb; margin-top: 4px">
            {{ t(I.s3.addColor).replace('+ ', '') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Semantic Slots Section -->
    <div class="tok-card">
      <div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 16px">
        <div class="tok-label" style="margin-bottom: 0">{{ t(I.s3.slots) }}</div>
        <span style="font-size: 11px; color: #bbb">{{ t(I.s3.slotsDesc) }}</span>
      </div>
      <div
        style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 10px;
        "
      >
        <div
          v-for="slotId in SLOT_IDS"
          :key="slotId"
          style="
            border: 1px solid #e8e8e8;
            border-radius: 10px;
            padding: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            position: relative;
          "
        >
          <div
            class="color-chip"
            :style="{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: pipelineStore.colorSlots[slotId] || '#ccc',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              position: 'relative',
            }"
          >
            <input
              :data-slot="slotId"
              type="color"
              :value="pipelineStore.colorSlots[slotId] || '#ccc'"
              @change="(e) => updateSlot(slotId, e.target.value)"
              style="
                position: absolute;
                inset: 0;
                opacity: 0;
                cursor: pointer;
                border-radius: 8px;
              "
            />
            <span
              :style="{
                fontSize: '11px',
                color: isLight(pipelineStore.colorSlots[slotId]) ? '#333' : '#fff',
                pointerEvents: 'none',
              }"
            >
              {{ SLOT_ICONS[slotId] }}
            </span>
          </div>
          <div style="flex: 1; min-width: 0">
            <div style="font-size: 12px; font-weight: 600; color: #333">
              {{ t(I.slotLabels[slotId]) || slotId }}
            </div>
            <div style="font-size: 10px; color: #bbb; line-height: 1.3;">
              {{ t(I.slotHints[slotId]) }}
            </div>
            <select
              :value="pipelineStore.colorSlots[slotId] || ''"
              @change="(e) => pickSlotFromPalette(slotId, e.target.value)"
              style="
                width: 100%;
                font-size: 10px;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                padding: 2px 4px;
                margin-top: 3px;
                background: #fff;
                color: #666;
              "
            >
              <option value="">
                —
                {{ t({ zh: '從色盤選擇', en: 'Pick from palette', ja: 'パレットから選択' }) }} —
              </option>
              <option
                v-for="color in pipelineStore.extractedColors"
                :key="color.hex"
                :value="color.hex"
                :selected="color.hex === pipelineStore.colorSlots[slotId]"
              >
                {{ color.hex }}
              </option>
              <option value="__custom__">✎ {{ t({ zh: '自訂', en: 'Custom', ja: 'カスタム' }) }}</option>
            </select>
          </div>
          <div style="font-size: 9px; font-family: monospace; color: #bbb; position: absolute; top: 4px; right: 8px">
            {{ pipelineStore.colorSlots[slotId] || '#ccc' }}
          </div>
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

.tok-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #999;
  margin-bottom: 16px;
  text-transform: uppercase;
}

.color-chip {
  cursor: pointer;
  transition: transform 0.2s;
}

.color-chip:hover {
  transform: scale(1.05);
}

.palette-chip {
  width: 72px;
  height: 56px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.add-color-btn {
  width: 72px;
  height: 56px;
  border-radius: 10px;
  border: 2px dashed #ddd;
  background: #fafafa;
  cursor: pointer;
  font-size: 18px;
  color: #bbb;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.font-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.palette-grid {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
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

  .palette-chip,
  .add-color-btn {
    width: 100% !important;
    height: 48px !important;
  }
}
</style>
