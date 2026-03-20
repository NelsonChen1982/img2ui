<script setup>
import { useAuthStore } from '../../stores/auth'
import { useSettingsStore } from '../../stores/settings'
import { ref, onMounted, watch } from 'vue'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const googleError = ref('')

function t(obj) {
  if (!obj) return ''
  return obj[settingsStore.lang] || obj.en || ''
}

const I = {
  title: { zh: '登入以繼續', en: 'Sign in to continue', ja: 'ログインして続ける' },
  subtitle: { zh: '免費帳號，立享創作', en: 'Free account, start creating', ja: '無料アカウントで始めよう' },
  bonus: { zh: '🎁 註冊即送 10 點免費額度', en: '🎁 Get 10 free credits on signup', ja: '🎁 登録で10クレジットプレゼント' },
  benefit1: { zh: '保存歷史設計', en: 'Save your designs', ja: 'デザインを保存' },
  benefit2: { zh: '每日登入 +3 點額度', en: '+3 credits daily on login', ja: '毎日ログインで+3クレジット' },
  benefit3: { zh: 'Gallery 作品展示', en: 'Gallery showcase', ja: 'ギャラリー展示' },
  google: { zh: '使用 Google 登入', en: 'Continue with Google', ja: 'Google でログイン' },
  github: { zh: '使用 GitHub 登入', en: 'Continue with GitHub', ja: 'GitHub でログイン' },
  close: { zh: '稍後再說', en: 'Maybe later', ja: 'あとで' },
}

let gsiInitialized = false

function initGSI() {
  if (gsiInitialized || !window.google?.accounts?.id) return
  const clientId = authStore.getGoogleClientId()
  if (!clientId) return
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleResponse,
  })
  gsiInitialized = true
}

async function handleGoogleResponse(response) {
  googleError.value = ''
  try {
    await authStore.loginWithGoogle(response.credential)
  } catch (err) {
    googleError.value = err.message
  }
}

function triggerGoogleLogin() {
  initGSI()
  if (window.google?.accounts?.id) {
    window.google.accounts.id.prompt()
  }
}

function triggerGitHubLogin() {
  authStore.loginWithGitHub()
}

onMounted(() => {
  initGSI()
})

watch(() => authStore.authModalVisible, (visible) => {
  if (visible) initGSI()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="authStore.authModalVisible"
      style="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);backdrop-filter:blur(4px)"
      @click.self="authStore.hideAuthModal"
    >
      <div style="background:#fff;border-radius:20px;padding:36px 32px;max-width:380px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.15);text-align:center">
        <!-- Title -->
        <h2 style="font-size:22px;font-weight:700;color:#111;margin:0 0 6px">
          {{ t(I.title) }}
        </h2>
        <p style="font-size:14px;color:#888;margin:0 0 20px">
          {{ t(I.subtitle) }}
        </p>

        <!-- Bonus highlight -->
        <div style="background:linear-gradient(135deg,#f0f4ff,#fef3f0);border-radius:12px;padding:14px 16px;margin-bottom:20px">
          <div style="font-size:15px;font-weight:600;color:#333;margin-bottom:8px">
            {{ t(I.bonus) }}
          </div>
          <div style="font-size:13px;color:#666;line-height:1.8;text-align:left">
            <div>✦ {{ t(I.benefit1) }}</div>
            <div>✦ {{ t(I.benefit2) }}</div>
            <div>✦ {{ t(I.benefit3) }}</div>
          </div>
        </div>

        <!-- OAuth buttons -->
        <button
          @click="triggerGoogleLogin"
          :disabled="authStore.loading"
          style="width:100%;padding:12px;border-radius:10px;border:1.5px solid #ddd;background:#fff;color:#333;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s;margin-bottom:10px"
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/></svg>
          {{ t(I.google) }}
        </button>

        <button
          @click="triggerGitHubLogin"
          :disabled="authStore.loading"
          style="width:100%;padding:12px;border-radius:10px;border:1.5px solid #ddd;background:#24292e;color:#fff;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s;margin-bottom:16px"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="#fff"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>
          {{ t(I.github) }}
        </button>

        <div v-if="googleError" style="font-size:12px;color:#e05050;margin-bottom:12px">
          {{ googleError }}
        </div>

        <!-- Close -->
        <button
          @click="authStore.hideAuthModal"
          style="background:none;border:none;color:#aaa;font-size:13px;cursor:pointer;padding:4px 12px"
        >
          {{ t(I.close) }}
        </button>
      </div>
    </div>
  </Teleport>
</template>
