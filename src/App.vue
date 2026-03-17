<script setup>
import { computed, onMounted } from 'vue'
import { usePipelineStore } from './stores/pipeline'
import { useSettingsStore } from './stores/settings'
import { useRateLimitStore } from './stores/rateLimit'
import WizardBar from './components/ui/WizardBar.vue'
import ActionFooter from './components/ui/ActionFooter.vue'
import DropdownMenu from './components/ui/DropdownMenu.vue'
import logoImg from './assets/logo.jpg'
import StepUpload from './components/steps/StepUpload.vue'
import StepScan from './components/steps/StepScan.vue'
import StepColors from './components/steps/StepColors.vue'
import StepAnnotate from './components/steps/StepAnnotate.vue'
import StepProcessing from './components/steps/StepProcessing.vue'
import StepResult from './components/steps/StepResult.vue'

const pipelineStore = usePipelineStore()
const settingsStore = useSettingsStore()
const rateLimitStore = useRateLimitStore()

const currentStep = computed(() => pipelineStore.step)

// CSS Framework options
const cssFrameworks = [
  { value: 'tailwind', label: 'Tailwind CSS' },
  { value: 'vanilla', label: 'Vanilla CSS' },
  { value: 'cssvar', label: 'CSS Variables' }
]

// Language options
const languages = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' }
]

// Initialize stores on mount
onMounted(async () => {
  settingsStore.init()
  rateLimitStore.init()
  settingsStore.detectLang()

  // ── Debug: check worker connection on startup ──
  const apiBase = import.meta.env.VITE_API_BASE || settingsStore.devSettings?.base || ''
  console.log('[img2ui] 🔧 VITE_API_BASE env:', import.meta.env.VITE_API_BASE || '(not set)')
  console.log('[img2ui] 🔧 devSettings.base:', settingsStore.devSettings?.base || '(not set)')
  console.log('[img2ui] 🔗 Resolved API base:', apiBase || '⚠️ EMPTY — worker will not be used')

  if (apiBase) {
    try {
      const resp = await fetch(`${apiBase}/health`)
      const data = await resp.json()
      console.log('[img2ui] ✅ Worker connected:', data)
    } catch (err) {
      console.error('[img2ui] ❌ Worker unreachable:', err.message)
    }
  }
})

function handleCSSFrameworkChange(value) {
  settingsStore.setCSSFW(value)
}

function handleLanguageChange(value) {
  settingsStore.setLang(value)
}
</script>

<template>
  <!-- Header with logo, brand, and dropdowns -->
  <header style="background:#fff;border-bottom:1px solid #e8e8e8;flex-shrink:0;">
    <!-- Row 1: logo + brand + dropdowns -->
    <div class="header-row">
      <div style="display:flex;align-items:center;gap:8px;">
        <img :src="logoImg" alt="img2ui" style="width:28px;height:28px;border-radius:7px;">
        <span class="brand-title" style="font-size:15px;font-weight:800;letter-spacing:.06em;color:#222;">img2ui</span>
      </div>

      <div style="display:flex;gap:8px;align-items:center;">
        <!-- CSS Framework dropdown -->
        <DropdownMenu
          :items="cssFrameworks"
          :model-value="settingsStore.selectedCSSFramework"
          @update:model-value="handleCSSFrameworkChange"
        >
          <template #trigger>
            <i class="fa-duotone fa-thin fa-code" style="font-size:11px;"></i>
            <span style="font-size:10px;">{{ settingsStore.selectedCSSFramework === 'tailwind' ? 'Tailwind' : settingsStore.selectedCSSFramework }}</span>
          </template>
        </DropdownMenu>

        <!-- Language dropdown -->
        <DropdownMenu
          :items="languages"
          :model-value="settingsStore.lang"
          @update:model-value="handleLanguageChange"
        >
          <template #trigger>
            <span style="font-size:10px;">{{ settingsStore.lang === 'zh' ? '中文' : settingsStore.lang === 'ja' ? '日本語' : 'English' }}</span>
          </template>
        </DropdownMenu>
      </div>
    </div>

    <!-- Wizard bar -->
    <WizardBar />
  </header>

  <!-- Main content area -->
  <main style="flex:1;padding:36px 28px;overflow:auto;background:#fafafa;">
    <!-- Step 1: Upload -->
    <StepUpload v-if="currentStep === 1" />

    <!-- Step 2: Scan -->
    <StepScan v-if="currentStep === 2" />

    <!-- Step 3: Colors -->
    <StepColors v-if="currentStep === 3" />

    <!-- Step 5: Annotate -->
    <StepAnnotate v-if="currentStep === 5" />

    <!-- Step 6: Processing -->
    <StepProcessing v-if="currentStep === 6" />

    <!-- Step 7: Result -->
    <StepResult v-if="currentStep === 7" />
  </main>

  <!-- Action footer -->
  <ActionFooter />
</template>
