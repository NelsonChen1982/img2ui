<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePipelineStore } from './stores/pipeline'
import { useSettingsStore } from './stores/settings'
import { useRateLimitStore } from './stores/rateLimit'
import { useAuthStore } from './stores/auth'
import DropdownMenu from './components/ui/DropdownMenu.vue'
import AuthModal from './components/ui/AuthModal.vue'
import LoginButton from './components/ui/LoginButton.vue'
import UserMenu from './components/ui/UserMenu.vue'
import logoImg from './assets/logo.jpg'

const router = useRouter()
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

const mobileMenuOpen = ref(false)
const toast = ref(null)
let toastTimer = null

function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 2500)
}

const historyOpen = ref(false)
const historyLoading = ref(false)
const historyItems = ref([])

const typeLabels = {
  welcome: { zh: '註冊獎勵', en: 'Welcome Bonus', ja: '登録ボーナス' },
  daily_refill: { zh: '每日登入', en: 'Daily Login', ja: '毎日ログイン' },
  generation: { zh: 'UI Kit 產出', en: 'UI Kit Generation', ja: 'UIキット生成' },
  admin_grant: { zh: '管理員加值', en: 'Admin Grant', ja: '管理者付与' },
  purchase: { zh: '購買', en: 'Purchase', ja: '購入' },
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts + 'Z')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${mi}`
}

async function openHistory() {
  mobileMenuOpen.value = false
  historyOpen.value = true
  historyLoading.value = true
  historyItems.value = []
  const apiBase = import.meta.env.VITE_API_BASE || ''
  if (!apiBase || !authStore.user?.id) { historyLoading.value = false; return }
  try {
    const hdrs = {}
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_KEY) hdrs['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY
    const resp = await fetch(`${apiBase}/api/credits-history?user_id=${authStore.user.id}&session_token=${encodeURIComponent(authStore.sessionToken)}`, { headers: hdrs })
    if (resp.ok) { const data = await resp.json(); historyItems.value = data.items || [] }
  } catch { /* silent */ }
  historyLoading.value = false
}

function tLabel(obj) {
  return obj?.[settingsStore.lang] || obj?.en || ''
}

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

// AI Model options (public-facing selection)
const models = [
  { value: 'gpt4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt4o', label: 'GPT-4o' },
  { value: 'qwen3.5-9b', label: 'Qwen 3.5 9B' },
  { value: 'grok-4.1-fast', label: 'Grok 4.1 Fast' },
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
    <div class="header-row">
      <!-- Left: logo + brand -->
      <div style="display:flex;align-items:center;gap:8px;cursor:pointer" @click="pipelineStore.restartPipeline(); router.push('/')">
        <img :src="logoImg" alt="img2ui" style="width:28px;height:28px;border-radius:7px;">
        <span class="brand-title" style="font-size:15px;font-weight:800;letter-spacing:.06em;color:#222;">img2ui</span>
      </div>

      <!-- Desktop: all dropdowns inline -->
      <div class="header-controls-desktop" style="display:flex;gap:8px;align-items:center;">
        <router-link to="/gallery" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:500;color:#555;text-decoration:none;border:1px solid #e8e8e8;transition:all .15s;" class="gallery-nav-link">
          <i class="fa-duotone fa-thin fa-grid-2" style="font-size:11px;"></i>
          Gallery
        </router-link>
        <DropdownMenu :items="cssFrameworks" :model-value="settingsStore.selectedCSSFramework" @update:model-value="handleCSSFrameworkChange">
          <template #trigger>
            <i class="fa-duotone fa-thin fa-code" style="font-size:11px;"></i>
            <span style="font-size:10px;">{{ settingsStore.selectedCSSFramework === 'tailwind' ? 'Tailwind' : settingsStore.selectedCSSFramework }}</span>
          </template>
        </DropdownMenu>
        <DropdownMenu :items="models" :model-value="settingsStore.selectedProvider" @update:model-value="handleModelChange">
          <template #trigger>
            <i class="fa-duotone fa-thin fa-microchip" style="font-size:11px;"></i>
            <span style="font-size:10px;">{{ modelLabel }}</span>
          </template>
        </DropdownMenu>
        <DropdownMenu :items="languages" :model-value="settingsStore.lang" @update:model-value="handleLanguageChange">
          <template #trigger>
            <span style="font-size:10px;">{{ settingsStore.lang === 'zh' ? '中文' : settingsStore.lang === 'ja' ? '日本語' : 'English' }}</span>
          </template>
        </DropdownMenu>
        <UserMenu v-if="authStore.isAuthenticated" />
        <LoginButton v-else />
        <a href="https://github.com/NelsonChen1982/img2ui" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;color:#555;" title="GitHub">
          <i class="fa-brands fa-github" style="font-size:15px;"></i>
        </a>
      </div>

      <!-- Mobile: hamburger button -->
      <button
        class="header-hamburger"
        @click="mobileMenuOpen = true"
        style="display:none;align-items:center;justify-content:center;width:32px;height:32px;border:1px solid #e8e8e8;border-radius:7px;background:#fff;cursor:pointer;"
      >
        <i class="fa-duotone fa-thin fa-bars" style="font-size:14px;color:#555;"></i>
      </button>
    </div>

  </header>

  <!-- Mobile menu drawer -->
  <Teleport to="body">
    <div
      v-if="mobileMenuOpen"
      style="position:fixed;inset:0;z-index:9980;background:rgba(0,0,0,.4);backdrop-filter:blur(2px)"
      @click="mobileMenuOpen = false"
    >
      <div
        class="mobile-drawer"
        style="position:absolute;top:0;right:0;width:72vw;max-width:280px;height:100%;background:#fff;box-shadow:-8px 0 32px rgba(0,0,0,.12);display:flex;flex-direction:column;padding:20px 0;"
        @click.stop
      >
        <!-- Close -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0 18px 16px;border-bottom:1px solid #f0f0f0;">
          <span style="font-size:13px;font-weight:700;color:#222;">設定</span>
          <button @click="mobileMenuOpen = false" style="background:none;border:none;font-size:16px;color:#aaa;cursor:pointer;padding:4px;">
            <i class="fa-duotone fa-thin fa-xmark"></i>
          </button>
        </div>

        <!-- CSS Framework -->
        <div style="padding:14px 18px;border-bottom:1px solid #f5f5f5;">
          <div style="font-size:10px;color:#aaa;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">CSS Framework</div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <button
              v-for="item in cssFrameworks" :key="item.value"
              @click="handleCSSFrameworkChange(item.value)"
              style="text-align:left;padding:7px 10px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:500;transition:all .15s;"
              :style="settingsStore.selectedCSSFramework === item.value ? {background:'#111',color:'#fff'} : {background:'#f5f5f5',color:'#555'}"
            >{{ item.label }}</button>
          </div>
        </div>

        <!-- Model -->
        <div style="padding:14px 18px;border-bottom:1px solid #f5f5f5;">
          <div style="font-size:10px;color:#aaa;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">AI Model</div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <button
              v-for="item in models" :key="item.value"
              @click="handleModelChange(item.value)"
              style="text-align:left;padding:7px 10px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:500;transition:all .15s;"
              :style="settingsStore.selectedProvider === item.value ? {background:'#111',color:'#fff'} : {background:'#f5f5f5',color:'#555'}"
            >{{ item.label }}</button>
          </div>
        </div>

        <!-- Language -->
        <div style="padding:14px 18px;border-bottom:1px solid #f5f5f5;">
          <div style="font-size:10px;color:#aaa;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Language</div>
          <div style="display:flex;gap:6px;">
            <button
              v-for="item in languages" :key="item.value"
              @click="handleLanguageChange(item.value)"
              style="flex:1;padding:7px 4px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:500;transition:all .15s;"
              :style="settingsStore.lang === item.value ? {background:'#111',color:'#fff'} : {background:'#f5f5f5',color:'#555'}"
            >{{ item.label }}</button>
          </div>
        </div>

        <!-- Auth -->
        <div style="padding:14px 18px;border-bottom:1px solid #f5f5f5;">
          <!-- Logged in -->
          <div v-if="authStore.isAuthenticated">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
              <img v-if="authStore.user?.avatarUrl" :src="authStore.user.avatarUrl" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;" />
              <div v-else style="width:32px;height:32px;border-radius:50%;background:#e8e8e8;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#888;flex-shrink:0;">
                {{ (authStore.user?.name || '?')[0].toUpperCase() }}
              </div>
              <div style="min-width:0;">
                <div style="font-size:12px;font-weight:600;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ authStore.user?.name || authStore.user?.email }}</div>
                <div style="font-size:10px;color:#aaa;margin-top:1px;">
                  <i class="fa-duotone fa-thin fa-coins" style="margin-right:3px;"></i>{{ authStore.creditsBalance }} pt
                </div>
              </div>
            </div>
            <button
              @click="openHistory"
              style="width:100%;padding:8px;border-radius:8px;border:1px solid #e8e8e8;background:#fff;font-size:12px;color:#555;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:6px;"
            >
              <i class="fa-duotone fa-thin fa-clock-rotate-left"></i>
              {{ settingsStore.lang === 'zh' ? '點數紀錄' : settingsStore.lang === 'ja' ? 'クレジット履歴' : 'Credit History' }}
            </button>
            <button
              @click="authStore.logout(); mobileMenuOpen = false; showToast(settingsStore.lang === 'zh' ? '已登出' : settingsStore.lang === 'ja' ? 'ログアウトしました' : 'Signed out')"
              style="width:100%;padding:8px;border-radius:8px;border:1px solid #e8e8e8;background:#fff;font-size:12px;color:#888;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;"
            >
              <i class="fa-duotone fa-thin fa-arrow-right-from-bracket"></i>
              {{ settingsStore.lang === 'zh' ? '登出' : settingsStore.lang === 'ja' ? 'ログアウト' : 'Sign out' }}
            </button>
          </div>
          <!-- Not logged in -->
          <div v-else style="display:flex;flex-direction:column;gap:6px;">
            <button @click="authStore.showAuthModal('register'); mobileMenuOpen = false"
              style="width:100%;padding:9px;border-radius:8px;border:1.5px solid #ddd;background:#fff;color:#333;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
              <svg width="13" height="13" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/></svg>
              Google
            </button>
            <button @click="authStore.loginWithGitHub(); mobileMenuOpen = false"
              style="width:100%;padding:9px;border-radius:8px;border:1.5px solid #ddd;background:#24292e;color:#fff;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="#fff"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>
              {{ settingsStore.lang === 'zh' ? '用 GitHub 登入' : settingsStore.lang === 'ja' ? 'GitHub でログイン' : 'Login with GitHub' }}
            </button>
          </div>
        </div>

        <!-- GitHub -->
        <div style="padding:14px 18px;">
          <a href="https://github.com/NelsonChen1982/img2ui" target="_blank" rel="noopener"
            style="display:flex;align-items:center;gap:8px;text-decoration:none;">
            <i class="fa-brands fa-github" style="font-size:15px;color:#555;"></i>
            <div>
              <div style="font-size:12px;color:#555;font-weight:500;">GitHub</div>
              <div style="font-size:10px;color:#aaa;">{{ settingsStore.lang === 'zh' ? '查看原始碼' : settingsStore.lang === 'ja' ? 'ソースコード' : 'Source code' }}</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Toast -->
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="toast"
        style="position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#222;color:#fff;font-size:13px;font-weight:500;padding:10px 20px;border-radius:999px;box-shadow:0 4px 16px rgba(0,0,0,.2);z-index:99999;white-space:nowrap;pointer-events:none;"
      >{{ toast }}</div>
    </Transition>
  </Teleport>

  <!-- Credits History Modal (mobile) -->
  <Teleport to="body">
    <div v-if="historyOpen" style="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);backdrop-filter:blur(3px)" @click.self="historyOpen = false">
      <div style="background:#fff;border-radius:16px;padding:24px;max-width:360px;width:90%;max-height:70vh;display:flex;flex-direction:column;box-shadow:0 16px 48px rgba(0,0,0,.12)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <h3 style="font-size:16px;font-weight:700;color:#222;margin:0">{{ settingsStore.lang === 'zh' ? '點數紀錄' : settingsStore.lang === 'ja' ? 'クレジット履歴' : 'Credit History' }}</h3>
          <button @click="historyOpen = false" style="background:none;border:none;font-size:16px;color:#aaa;cursor:pointer;padding:4px;"><i class="fa-duotone fa-thin fa-xmark"></i></button>
        </div>
        <div style="flex:1;overflow-y:auto;min-height:0">
          <div v-if="historyLoading" style="text-align:center;padding:24px;color:#aaa;font-size:13px">
            <i class="fa-duotone fa-thin fa-spinner-third fa-spin" style="margin-right:6px"></i>Loading...
          </div>
          <div v-else-if="historyItems.length === 0" style="text-align:center;padding:24px;color:#bbb;font-size:13px">
            {{ settingsStore.lang === 'zh' ? '尚無紀錄' : settingsStore.lang === 'ja' ? '記録なし' : 'No records yet' }}
          </div>
          <div v-else>
            <div v-for="item in historyItems" :key="item.id" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f5f5f5">
              <div style="min-width:0;flex:1;margin-right:12px">
                <div style="font-size:12px;font-weight:500;color:#444">{{ tLabel(typeLabels[item.type] || { en: item.type }) }}</div>
                <div style="font-size:10px;color:#bbb;margin-top:2px">{{ formatTime(item.created_at) }}</div>
                <div v-if="item.type === 'generation' && item.memo?.includes(':')" style="font-size:9px;color:#ccc;margin-top:3px;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" :title="item.memo.split(':').slice(1).join(':')">
                  # {{ item.memo.split(':').slice(1).join(':') }}
                </div>
              </div>
              <div style="font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;flex-shrink:0" :style="{ color: item.amount >= 0 ? '#22c55e' : '#ef4444' }">
                {{ item.amount >= 0 ? '+' : '' }}{{ item.amount }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Route content -->
  <router-view />

  <!-- Auth Modal -->
  <AuthModal />
</template>
