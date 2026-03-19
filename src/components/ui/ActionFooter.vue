<script setup>
import { computed, ref, onMounted } from 'vue'
import { usePipelineStore } from '../../stores/pipeline'
import { useSettingsStore } from '../../stores/settings'
import { I } from '../../data/i18n'
import { downloadJSON, downloadSKILL, downloadHTML } from '../../services/downloadService'
import { buildUIKitHTML } from '../../services/uiKitRenderer'
import { COMP_META } from '../../data/compMeta'

const pipelineStore = usePipelineStore()
const settingsStore = useSettingsStore()

const isMobile = ref(false)
onMounted(() => {
  isMobile.value = window.innerWidth <= 768
  window.addEventListener('resize', () => { isMobile.value = window.innerWidth <= 768 })
})

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
  // Skip = start processing with no/existing annotations
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

function handleDownloadJSON() {
  downloadJSON(
    pipelineStore.DS,
    pipelineStore.annotations,
    COMP_META,
    pipelineStore.extractedColors,
    settingsStore.selectedCSSFramework
  )
}

function handleDownloadSKILL() {
  downloadSKILL(
    pipelineStore.DS,
    pipelineStore.annotations,
    settingsStore.lang,
    COMP_META,
    pipelineStore.extractedColors,
    settingsStore.selectedCSSFramework,
    pipelineStore.holisticResult
  )
}

function handleDownloadHTML() {
  const kitHTML = buildUIKitHTML(
    pipelineStore.DS,
    pipelineStore.annotations,
    pipelineStore.analysisLog
  )
  downloadHTML(pipelineStore.DS, kitHTML)
}
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

    <!-- ═══ Step 7: edit/restart on left, downloads on right ═══ -->
    <template v-else>
      <div class="af-left">
        <button class="af-btn-secondary" @click="handleEditColors"><i class="fa-duotone fa-thin fa-palette" style="margin-right:4px;"></i>{{ t(I.s7.editColors) }}</button>
        <button class="af-btn-secondary" @click="handleEditAnnotations"><i class="fa-duotone fa-thin fa-puzzle-piece" style="margin-right:4px;"></i>{{ t(I.s7.editAnnotations) }}</button>
        <button class="af-btn-secondary" style="opacity:.6;" @click="handleRestart"><i class="fa-duotone fa-thin fa-rotate-right" style="margin-right:4px;"></i>{{ t(I.s7.restart) }}</button>
      </div>

      <div class="af-center"></div>

      <div class="af-right">
        <button class="af-btn-secondary" @click="handleDownloadJSON"><i class="fa-duotone fa-thin fa-download" style="margin-right:4px;"></i>{{ t(I.s7.dlJSON) }}</button>
        <button class="af-btn-secondary" @click="handleDownloadSKILL"><i class="fa-duotone fa-thin fa-download" style="margin-right:4px;"></i>{{ t(I.s7.dlSkill) }}</button>
        <button class="af-btn af-btn-next" @click="handleDownloadHTML"><i class="fa-duotone fa-thin fa-download" style="margin-right:4px;"></i>{{ t(I.s7.dlHTML) }}</button>
      </div>
    </template>
  </div>
</template>
