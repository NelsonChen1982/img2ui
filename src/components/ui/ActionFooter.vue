<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { usePipelineStore } from '../../stores/pipeline'
import { useSettingsStore } from '../../stores/settings'
import { I } from '../../data/i18n'
import { getJSONOutput, downloadSKILL, downloadSKILLZip, downloadHTML } from '../../services/downloadService'
import { buildUIKitHTML } from '../../services/uiKitRenderer'
import { COMP_META } from '../../data/compMeta'

const pipelineStore = usePipelineStore()
const settingsStore = useSettingsStore()

const isMobile = ref(false)
function onResize() { isMobile.value = window.innerWidth <= 768 }
onMounted(() => {
  onResize()
  window.addEventListener('resize', onResize)
})
onUnmounted(() => { window.removeEventListener('resize', onResize) })

function t(obj) {
  if (!obj) return ''
  return obj[settingsStore.lang] || obj.en || ''
}

const currentStep = computed(() => pipelineStore.step)
const isDev = import.meta.env.DEV

// Footer visibility - hidden on steps 1, 6
const isFooterVisible = computed(() => ![1, 6].includes(currentStep.value))

// Back button text
const backButtonText = computed(() => t(I.back))

// Determine next button label based on step
const nextButtonText = computed(() => {
  switch (currentStep.value) {
    case 3:
      return t(I.s3.next)
    case 5:
      return t(I.s5.next)
    default:
      return 'Next'
  }
})

// Step 5 specific: show clear, skip buttons
const showStep5Controls = computed(() => currentStep.value === 5)

// Step 7 specific
const isStep7 = computed(() => currentStep.value === 7)

// Annotation count for step 5 center text
const centerText = computed(() => {
  if (currentStep.value === 5) {
    const n = pipelineStore.annotations.length
    if (n === 0) return ''
    const lang = settingsStore.lang
    if (lang === 'zh') return `${n} 個標註`
    if (lang === 'ja') return `${n} 件の注釈`
    return `${n} annotation${n === 1 ? '' : 's'}`
  }
  return ''
})

function handleBack() {
  pipelineStore.prevStep()
}

function handleNext() {
  pipelineStore.handleNext()
}

function handleClear() {
  pipelineStore.clearAnnotations()
}

function handleSkip() {
  pipelineStore.handleNext()
}

// Step 7 actions
function handleEditColors() {
  pipelineStore.editFromResult('colors')
}

function handleEditAnnotations() {
  pipelineStore.editFromResult('annotations')
}

function handleRestart() {
  pipelineStore.restartPipeline()
}

// Export panel
const exportOpen = ref(false)
const exportTheme = ref('light')
const exportFormat = ref('json')
const exportPanelRef = ref(null)

function toggleExport() {
  exportTheme.value = pipelineStore.activeTheme || 'light'
  exportOpen.value = !exportOpen.value
}

function doExport() {
  const chosenDS = exportTheme.value === 'dark' ? pipelineStore.DS_dark : pipelineStore.DS_light
  if (!chosenDS?.colors) return

  if (exportFormat.value === 'json') {
    const out = getJSONOutput(
      chosenDS,
      pipelineStore.annotations,
      COMP_META,
      pipelineStore.extractedColors,
      settingsStore.selectedCSSFramework,
      pipelineStore.holisticResult,
      pipelineStore.analysisLog
    )
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'design-system.json'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 200)
  } else if (exportFormat.value === 'skill') {
    downloadSKILL(
      chosenDS,
      pipelineStore.annotations,
      settingsStore.lang,
      COMP_META,
      pipelineStore.extractedColors,
      settingsStore.selectedCSSFramework,
      pipelineStore.holisticResult
    )
  } else if (exportFormat.value === 'skill-zip') {
    const otherDS = exportTheme.value === 'dark' ? pipelineStore.DS_light : pipelineStore.DS_dark
    downloadSKILLZip(
      chosenDS,
      otherDS,
      pipelineStore.annotations,
      settingsStore.lang,
      COMP_META,
      pipelineStore.extractedColors,
      settingsStore.selectedCSSFramework,
      pipelineStore.holisticResult,
      pipelineStore.analysisLog
    )
  } else if (exportFormat.value === 'html') {
    const html = buildUIKitHTML(chosenDS, pipelineStore.annotations, pipelineStore.analysisLog)
    downloadHTML(chosenDS, html)
  }
  exportOpen.value = false
}

function onClickOutsideExport(e) {
  if (exportPanelRef.value && !exportPanelRef.value.contains(e.target)) {
    exportOpen.value = false
  }
}

onMounted(() => { document.addEventListener('click', onClickOutsideExport, true) })
onUnmounted(() => { document.removeEventListener('click', onClickOutsideExport, true) })
</script>

<template>
  <div class="action-footer" :class="{ hidden: !isFooterVisible }">
    <!-- ═══ Steps 3 & 5: standard back / center / next ═══ -->
    <template v-if="!isStep7">
      <div class="af-left">
        <button class="af-btn af-btn-back" @click="handleBack"><i class="fa-duotone fa-thin fa-arrow-left" style="margin-right:4px;font-size:12px;"></i>{{ backButtonText }}</button>
        <span>
          <button v-if="showStep5Controls && !isMobile" class="af-btn-secondary" @click="handleClear">
            {{ t(I.s5.clear) }}
          </button>
        </span>
      </div>

      <div class="af-center">
        {{ centerText }}
        <button v-if="isDev && showStep5Controls" class="af-btn-secondary" style="margin-left:8px;font-size:11px;opacity:.7;" @click="pipelineStore.showDevCompare = true">
          <i class="fa-duotone fa-thin fa-flask" style="margin-right:3px;"></i>Compare
        </button>
      </div>

      <div class="af-right" v-if="currentStep !== 2">
        <span>
          <button v-if="showStep5Controls && !isMobile" class="af-btn-secondary" @click="handleSkip">
            {{ t(I.s5.skip) }}
          </button>
        </span>
        <button class="af-btn af-btn-next" @click="showStep5Controls && isMobile ? handleSkip() : handleNext()">
          {{ showStep5Controls && isMobile ? t(I.s5.skipGenerate) : nextButtonText }} <i class="fa-duotone fa-thin fa-arrow-right" style="margin-left:4px;font-size:14px;"></i>
        </button>
      </div>
    </template>

    <!-- ═══ Step 7: edit/restart on left, export on right ═══ -->
    <template v-else>
      <div class="af-left">
        <button class="af-btn-secondary" @click="handleEditColors"><i class="fa-duotone fa-thin fa-palette" style="margin-right:4px;"></i>{{ t(I.s7.editColors) }}</button>
        <button class="af-btn-secondary" @click="handleEditAnnotations"><i class="fa-duotone fa-thin fa-puzzle-piece" style="margin-right:4px;"></i>{{ t(I.s7.editAnnotations) }}</button>
        <button class="af-btn-secondary" style="opacity:.6;" @click="handleRestart"><i class="fa-duotone fa-thin fa-rotate-right" style="margin-right:4px;"></i>{{ t(I.s7.restart) }}</button>
      </div>

      <div class="af-center"></div>

      <div class="af-right">
        <div ref="exportPanelRef" style="position:relative;">
          <button class="af-btn af-btn-secondary" @click="toggleExport" style="font-weight:600;">
            <i class="fa-duotone fa-thin fa-file-export" style="margin-right:5px;"></i>
            {{ t(I.s7.exportBtn) }}
          </button>
          <!-- Export popover (opens upward from footer) -->
          <div v-if="exportOpen" class="af-export-panel">
            <div style="margin-bottom: 10px;">
              <div class="af-export-label">{{ t(I.s7.exportTheme) }}</div>
              <div class="af-export-radios">
                <label class="af-export-radio" :class="{ 'af-export-radio--active': exportTheme === 'light' }">
                  <input type="radio" v-model="exportTheme" value="light" />
                  <span>☀ Light</span>
                </label>
                <label class="af-export-radio" :class="{ 'af-export-radio--active': exportTheme === 'dark' }">
                  <input type="radio" v-model="exportTheme" value="dark" />
                  <span>● Dark</span>
                </label>
              </div>
            </div>
            <div style="margin-bottom: 12px;">
              <div class="af-export-label">{{ t(I.s7.exportFormat) }}</div>
              <div class="af-export-radios">
                <label class="af-export-radio" :class="{ 'af-export-radio--active': exportFormat === 'json' }">
                  <input type="radio" v-model="exportFormat" value="json" />
                  <i class="fa-duotone fa-thin fa-brackets-curly" style="margin-right:4px;font-size:11px;"></i>
                  <span>JSON</span>
                </label>
                <label class="af-export-radio" :class="{ 'af-export-radio--active': exportFormat === 'skill' }">
                  <input type="radio" v-model="exportFormat" value="skill" />
                  <i class="fa-duotone fa-thin fa-wand-magic-sparkles" style="margin-right:4px;font-size:11px;"></i>
                  <span>SKILL.md</span>
                </label>
                <label class="af-export-radio" :class="{ 'af-export-radio--active': exportFormat === 'skill-zip' }">
                  <input type="radio" v-model="exportFormat" value="skill-zip" />
                  <i class="fa-duotone fa-thin fa-folder-open" style="margin-right:4px;font-size:11px;"></i>
                  <span>SKILL ZIP</span>
                </label>
                <label class="af-export-radio" :class="{ 'af-export-radio--active': exportFormat === 'html' }">
                  <input type="radio" v-model="exportFormat" value="html" />
                  <i class="fa-duotone fa-thin fa-browser" style="margin-right:4px;font-size:11px;"></i>
                  <span>HTML</span>
                </label>
              </div>
            </div>
            <button class="af-export-dl-btn" @click="doExport">
              <i class="fa-duotone fa-thin fa-download" style="margin-right:5px;"></i>
              {{ t(I.s7.exportDownload) }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
