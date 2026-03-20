<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { usePipelineStore } from '../../stores/pipeline'
import { useSettingsStore } from '../../stores/settings'
import { I } from '../../data/i18n'
import { getJSONOutput, downloadSKILL, downloadSKILLZip, downloadHTML, downloadDesignMD } from '../../services/downloadService'
import { buildUIKitHTML } from '../../services/uiKitRenderer'
import { COMP_META } from '../../data/compMeta'
import { buildFigmaJSON } from '../../services/figmaJsonBuilder'

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

// Step 3 specific: show skip-annotations button
const showStep3Controls = computed(() => currentStep.value === 3)

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

function handleSkipAnnotations() {
  pipelineStore.skipToProcessing()
}

// Step 7 actions
function handleEditColors() {
  pipelineStore.editFromResult('colors')
}

function handleRestart() {
  pipelineStore.restartPipeline()
}

// Export modal
const exportOpen = ref(false)
const exportTheme = ref('light')
const exportFormat = ref('json')

const exportFormats = [
  { id: 'json', icon: 'fa-brackets-curly', nameKey: 'fmtJsonName', descKey: 'fmtJsonDesc' },
  { id: 'skill', icon: 'fa-wand-magic-sparkles', nameKey: 'fmtSkillName', descKey: 'fmtSkillDesc' },
  { id: 'skill-zip', icon: 'fa-folder-open', nameKey: 'fmtZipName', descKey: 'fmtZipDesc' },
  { id: 'html', icon: 'fa-browser', nameKey: 'fmtHtmlName', descKey: 'fmtHtmlDesc' },
  { id: 'design-md', icon: 'fa-palette', nameKey: 'fmtDesignMdName', descKey: 'fmtDesignMdDesc', badge: 'fmtDesignMdBadge' },
  { id: 'figma-json', icon: 'fa-figma', iconPrefix: 'fa-brands', nameKey: 'fmtFigmaName', descKey: 'fmtFigmaDesc', badge: 'fmtFigmaBadge', comingSoon: true },
]

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
  } else if (exportFormat.value === 'design-md') {
    downloadDesignMD(chosenDS, pipelineStore.holisticResult, settingsStore.lang)
  } else if (exportFormat.value === 'figma-json') {
    const figma = buildFigmaJSON(chosenDS)
    if (!figma) return
    const blob = new Blob([JSON.stringify(figma, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'figma-ui-kit.json'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 200)
  }
  exportOpen.value = false
}


const figmaCopied = ref(false)

function doFigmaCopy() {
  const chosenDS = exportTheme.value === 'dark' ? pipelineStore.DS_dark : pipelineStore.DS_light
  if (!chosenDS?.colors) return
  const figma = buildFigmaJSON(chosenDS)
  if (!figma) return
  navigator.clipboard.writeText(JSON.stringify(figma, null, 2))
  figmaCopied.value = true
  setTimeout(() => { figmaCopied.value = false }, 2500)
}

function closeExportOnBackdrop(e) {
  if (e.target === e.currentTarget) {
    exportOpen.value = false
  }
}
</script>

<template>
  <div class="action-footer" :class="{ hidden: !isFooterVisible }">
    <!-- ═══ Steps 3 & 5: standard back / center / next ═══ -->
    <template v-if="!isStep7">
      <div class="af-left">
        <span class="af-version">Beta v0.1</span>
        <span v-if="centerText" class="af-annotation-count">{{ centerText }}</span>
      </div>

      <div class="af-right">
        <button class="af-btn af-btn-back" @click="handleBack"><i class="fa-duotone fa-thin fa-arrow-left" style="margin-right:4px;font-size:12px;"></i>{{ backButtonText }}</button>
        <button v-if="showStep5Controls && !isMobile" class="af-btn-secondary" @click="handleClear">
          {{ t(I.s5.clear) }}
        </button>
        <button v-if="isDev && showStep5Controls" class="af-btn-secondary" style="font-size:11px;opacity:.7;" @click="pipelineStore.showDevCompare = true">
          <i class="fa-duotone fa-thin fa-flask" style="margin-right:3px;"></i>Compare
        </button>
        <button v-if="showStep3Controls && !isMobile" class="af-btn-secondary" @click="handleSkipAnnotations">
          <i class="fa-duotone fa-thin fa-forward" style="margin-right:4px;font-size:10px;"></i>{{ t(I.s3.skipAnnotate) }}
        </button>
        <button v-if="showStep5Controls && !isMobile" class="af-btn-secondary" @click="handleSkip">
          {{ t(I.s5.skip) }}
        </button>
        <button v-if="currentStep !== 2" class="af-btn af-btn-next" @click="(showStep3Controls && isMobile) ? handleSkipAnnotations() : (showStep5Controls && isMobile) ? handleSkip() : handleNext()">
          {{ (showStep3Controls && isMobile) ? t(I.s3.skipAnnotate) : (showStep5Controls && isMobile) ? t(I.s5.skipGenerate) : nextButtonText }} <i class="fa-duotone fa-thin fa-arrow-right" style="margin-left:4px;font-size:14px;"></i>
        </button>
      </div>

      <div class="af-mobile-version">Beta v0.1</div>
    </template>

    <!-- ═══ Step 7: edit/restart on left, export on right ═══ -->
    <template v-else>
      <div class="af-left">
        <span class="af-version">Beta v0.1</span>
      </div>

      <div class="af-right">
        <button class="af-btn-secondary" @click="handleEditColors"><i class="fa-duotone fa-thin fa-palette" style="margin-right:4px;"></i>{{ t(I.s7.editColors) }}</button>
        <button class="af-btn-secondary" style="opacity:.6;" @click="handleRestart"><i class="fa-duotone fa-thin fa-rotate-right" style="margin-right:4px;"></i>{{ t(I.s7.restart) }}</button>
        <button class="af-btn af-btn-secondary" @click="toggleExport" style="font-weight:600;">
          <i class="fa-duotone fa-thin fa-file-export" style="margin-right:5px;"></i>
          {{ t(I.s7.exportBtn) }}
        </button>
      </div>

      <div class="af-mobile-version">Beta v0.1</div>

      <!-- Export modal overlay -->
      <Teleport to="body">
        <div v-if="exportOpen" class="export-overlay" @click="closeExportOnBackdrop">
          <div class="export-modal">
            <div class="export-modal-header">
              <h3 class="export-modal-title">{{ t(I.s7.exportTitle) }}</h3>
              <button class="export-modal-close" @click="exportOpen = false">
                <i class="fa-duotone fa-thin fa-xmark"></i>
              </button>
            </div>

            <div class="export-section">
              <div class="export-section-label">{{ t(I.s7.exportTheme) }}</div>
              <div class="export-theme-row">
                <label class="export-theme-opt" :class="{ 'export-theme-opt--active': exportTheme === 'light' }">
                  <input type="radio" v-model="exportTheme" value="light" />
                  <span>☀ Light</span>
                </label>
                <label class="export-theme-opt" :class="{ 'export-theme-opt--active': exportTheme === 'dark' }">
                  <input type="radio" v-model="exportTheme" value="dark" />
                  <span>● Dark</span>
                </label>
              </div>
            </div>

            <div class="export-section">
              <div class="export-section-label">{{ t(I.s7.exportFormat) }}</div>
              <div class="export-format-list">
                <label
                  v-for="fmt in exportFormats"
                  :key="fmt.id"
                  class="export-format-row"
                  :class="{
                    'export-format-row--active': exportFormat === fmt.id,
                    'export-format-row--disabled': fmt.comingSoon && !isDev,
                  }"
                  @click="!(fmt.comingSoon && !isDev) && (exportFormat = fmt.id)"
                >
                  <input type="radio" v-model="exportFormat" :value="fmt.id" />
                  <i :class="(fmt.iconPrefix || 'fa-duotone fa-thin') + ' ' + fmt.icon" class="export-format-icon"></i>
                  <div class="export-format-text">
                    <span class="export-format-name">
                      {{ t(I.s7[fmt.nameKey]) }}
                      <span v-if="fmt.badge" class="export-format-badge">{{ t(I.s7[fmt.badge]) }}</span>
                    </span>
                    <span class="export-format-desc">{{ t(I.s7[fmt.descKey]) }}</span>
                  </div>
                </label>
              </div>
            </div>

            <div v-if="exportFormat === 'figma-json'" style="display:flex;gap:8px;">
              <button class="export-dl-btn" style="flex:1;" @click="doFigmaCopy">
                <i :class="figmaCopied ? 'fa-duotone fa-thin fa-check' : 'fa-duotone fa-thin fa-copy'" style="margin-right:6px;"></i>
                {{ figmaCopied ? 'Copied!' : 'Copy' }}
              </button>
              <button class="export-dl-btn" style="flex:1;" @click="doExport">
                <i class="fa-duotone fa-thin fa-download" style="margin-right:6px;"></i>
                Download
              </button>
            </div>
            <button v-else class="export-dl-btn" @click="doExport">
              <i class="fa-duotone fa-thin fa-download" style="margin-right:6px;"></i>
              {{ t(I.s7.exportDownload) }}
            </button>

          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>
