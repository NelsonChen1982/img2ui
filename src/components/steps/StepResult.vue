<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePipelineStore } from '../../stores/pipeline'
import { useSettingsStore } from '../../stores/settings'
import { I } from '../../data/i18n'
import { buildUIKitHTML } from '../../services/uiKitRenderer'
import { getJSONOutput } from '../../services/downloadService'
import { COMP_META } from '../../data/compMeta'

const pipelineStore = usePipelineStore()
const settingsStore = useSettingsStore()

const copyLabel = ref('')
const jsonExpanded = ref(false)
const isMobile = ref(false)
onMounted(() => {
  isMobile.value = window.innerWidth <= 768
  window.addEventListener('resize', () => { isMobile.value = window.innerWidth <= 768 })
})

function t(obj) {
  if (!obj) return ''
  return obj[settingsStore.lang] || obj.en || ''
}

const uiKitHTML = computed(() => {
  return buildUIKitHTML(
    pipelineStore.DS,
    pipelineStore.annotations,
    pipelineStore.analysisLog
  )
})

const fullJSONOutput = computed(() => {
  if (!pipelineStore.DS?.colors) return pipelineStore.DS
  return getJSONOutput(
    pipelineStore.DS,
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
</script>

<template>
  <div style="max-width: 1400px; margin: 0 auto">
    <!-- Description -->
    <div style="margin-bottom: 20px">
      <p style="color: #888; font-size: 15px">
        {{ t(I.s7.desc) }}
      </p>
    </div>

    <!-- Two-column layout: UI Kit + JSON Panel -->
    <div class="result-layout">
      <!-- UI Kit Render -->
      <div style="flex: 1; min-width: 0; max-width: 100%; order: 0;">
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
.result-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

@media (max-width: 768px) {
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
