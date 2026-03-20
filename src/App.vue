<script setup>
import { computed, onMounted } from 'vue'
import { usePipelineStore } from './stores/pipeline'
import { useSettingsStore } from './stores/settings'
import { useRateLimitStore } from './stores/rateLimit'
import { useAuthStore } from './stores/auth'
import WizardBar from './components/ui/WizardBar.vue'
import ActionFooter from './components/ui/ActionFooter.vue'
import DropdownMenu from './components/ui/DropdownMenu.vue'
import AuthModal from './components/ui/AuthModal.vue'
import LoginButton from './components/ui/LoginButton.vue'
import UserMenu from './components/ui/UserMenu.vue'
import logoImg from './assets/logo.jpg'
import StepUpload from './components/steps/StepUpload.vue'
import StepScan from './components/steps/StepScan.vue'
import StepColors from './components/steps/StepColors.vue'
import StepAnnotate from './components/steps/StepAnnotate.vue'
import StepProcessing from './components/steps/StepProcessing.vue'
import StepResult from './components/steps/StepResult.vue'
import DevModelCompare from './components/steps/DevModelCompare.vue'

const pipelineStore = usePipelineStore()
const settingsStore = useSettingsStore()
const rateLimitStore = useRateLimitStore()
const authStore = useAuthStore()

// Load Font Awesome Kit dynamically from env variable
const faKitId = import.meta.env.VITE_FA_KIT_ID
if (faKitId && /^[a-f0-9]+$/.test(faKitId)) {
  const s = document.createElement('script')
  s.src = `https://kit.fontawesome.com/${faKitId}.js`
  s.crossOrigin = 'anonymous'
  document.head.appendChild(s)
}

// Load Google GSI script for OAuth
if (import.meta.env.VITE_GOOGLE_CLIENT_ID) {
  const gsi = document.createElement('script')
  gsi.src = 'https://accounts.google.com/gsi/client'
  gsi.async = true
  document.head.appendChild(gsi)
}

const currentStep = computed(() => pipelineStore.step)
const isDev = import.meta.env.DEV

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

// AI Model options
const models = [
  { value: 'gpt4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt4o', label: 'GPT-4o' },
  { value: 'gpt-5.4', label: 'GPT-5.4' },
  { value: 'claude-sonnet', label: 'Claude Sonnet 4' },
  { value: 'gpt5-nano', label: 'GPT-5 Nano' },
  { value: 'qwen3.5-35b', label: 'Qwen 3.5 35B' },
  { value: 'qwen3.5-9b', label: 'Qwen 3.5 9B' },
  { value: 'qwen3.5-flash', label: 'Qwen 3.5 Flash' },
  { value: 'grok-4.1-fast', label: 'Grok 4.1 Fast' },
  { value: 'hunter-alpha', label: 'Hunter Alpha (Free)' },
]

const modelLabel = computed(() => {
  const m = settingsStore.selectedProvider
  return models.find(x => x.value === m)?.label || m
})

// Initialize stores on mount
onMounted(async () => {
  settingsStore.init()
  rateLimitStore.init()
  authStore.init()
  settingsStore.detectLang()

  // ── Debug: check worker connection on startup (dev only) ──
  if (import.meta.env.DEV) {
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
  }
})

function handleCSSFrameworkChange(value) {
  settingsStore.setCSSFW(value)
}

function handleLanguageChange(value) {
  settingsStore.setLang(value)
}

function handleModelChange(value) {
  settingsStore.setProvider(value)
}
</script>

<template>
  <!-- Header with logo, brand, and dropdowns -->
  <header style="background:#fff;border-bottom:1px solid #e8e8e8;flex-shrink:0;">
    <!-- Row 1: logo + brand + dropdowns -->
    <div class="header-row">
      <!-- Left: logo + brand (always visible) -->
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

        <!-- Model dropdown (dev only) -->
        <DropdownMenu
          v-if="isDev"
          :items="models"
          :model-value="settingsStore.selectedProvider"
          @update:model-value="handleModelChange"
        >
          <template #trigger>
            <i class="fa-duotone fa-thin fa-microchip" style="font-size:11px;"></i>
            <span style="font-size:10px;">{{ modelLabel }}</span>
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

        <!-- Auth: Login or User Menu -->
        <UserMenu v-if="authStore.isAuthenticated" />
        <LoginButton v-else />

        <!-- GitHub (rightmost) -->
        <a href="https://github.com/NelsonChen1982/img2ui" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;color:#555;transition:color .15s;" title="GitHub">
          <i class="fa-brands fa-github" style="font-size:15px;"></i>
        </a>
      </div>
    </div>

    <!-- Wizard bar: only show from step 2+ -->
    <WizardBar v-if="currentStep !== 1" />
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

  <!-- Auth Modal -->
  <AuthModal />

  <!-- Dev-only: model comparison overlay -->
  <DevModelCompare v-if="isDev && pipelineStore.showDevCompare" @close="pipelineStore.showDevCompare = false" />
</template>
