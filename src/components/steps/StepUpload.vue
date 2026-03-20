<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { usePipelineStore } from '../../stores/pipeline'
import { useSettingsStore } from '../../stores/settings'
import { useAuthStore } from '../../stores/auth'
import { I } from '../../data/i18n'
import logoImg from '../../assets/logo.jpg'
import GalleryMarquee from '../ui/GalleryMarquee.vue'

function t(obj) {
  if (!obj) return ''
  return obj[settingsStore.lang] || obj.en || ''
}

const pipelineStore = usePipelineStore()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB
const TURNSTILE_SITE_KEY = '0x4AAAAAACsNmdC4zDbyKXhd'

const imageError = ref('')
const previewFileName = ref('')
const isDraggingOver = ref(false)
const turnstileToken = ref('')
const turnstileEl = ref(null)
const turnstileWidgetId = ref(null)
const submitting = ref(false)
const gateError = ref('')

const isDev = import.meta.env.DEV
const isCtaDisabled = computed(() =>
  submitting.value || !pipelineStore.uploadedImage || (!isDev && !turnstileToken.value)
)

// i18n for this page
const IL = {
  ctaFree: { zh: '開始辨識設計', en: 'Analyze My Design', ja: 'デザインを分析する' },
  ctaStart: { zh: '開始辨識', en: 'Start Analysis', ja: '分析開始' },
  bonusTitle: { zh: '註冊即送 10 點免費額度', en: 'Get 10 free credits on signup', ja: '登録で10クレジットプレゼント' },
  benefit1: { zh: '保存歷史設計', en: 'Save your designs', ja: 'デザインを保存' },
  benefit2: { zh: '每日登入 +3 點額度', en: '+3 credits daily on login', ja: '毎日ログインで+3クレジット' },
  benefit3: { zh: 'Gallery 作品展示（即將推出）', en: 'Gallery showcase (coming soon)', ja: 'ギャラリー展示（近日公開）' },
  google: { zh: '使用 Google 登入', en: 'Continue with Google', ja: 'Google でログイン' },
  github: { zh: '使用 GitHub 登入', en: 'Continue with GitHub', ja: 'GitHub でログイン' },
  noCredits: { zh: '點數不足，每日登入可獲得額度', en: 'No credits. Log in daily for free credits.', ja: 'クレジット不足。毎日ログインで無料クレジット獲得。' },
  loginRequired: { zh: '免費體驗已使用，請登入繼續', en: 'Free trial used. Sign in to continue.', ja: '無料体験は使用済み。ログインして続けてください。' },
  credits: { zh: '剩餘 {n} 點', en: '{n} credits left', ja: '残り{n}クレジット' },
}

const features = computed(() => {
  const lang = settingsStore.lang
  const figmaLabel = { zh: '匯出 Figma JSON', en: 'Export Figma JSON', ja: 'Figma JSON出力' }[lang]
  return [
    { icon: 'fa-palette', label: { zh: '智能色彩萃取', en: 'Smart Color Extraction', ja: 'スマート配色抽出' }, desc: { zh: 'K-means 量化分析主色', en: 'K-means quantization analysis', ja: 'K-meansによる主色分析' } },
    { icon: 'fa-ruler-combined', label: { zh: '自動排版系統', en: 'Auto Typography System', ja: '自動タイポグラフィ' }, desc: { zh: '字級、間距、圓角 tokens', en: 'Font size, spacing, radius tokens', ja: '文字サイズ・間隔・角丸トークン' } },
    { icon: 'fa-puzzle-piece', label: { zh: '25 種元件辨識', en: '25 Component Types', ja: '25種コンポーネント' }, desc: { zh: '按鈕、卡片、導航列...', en: 'Buttons, cards, navbars...', ja: 'ボタン、カード、ナビ...' } },
    { icon: 'fa-file-export', label: { zh: '多格式匯出', en: 'Multi-format Export', ja: 'マルチ形式出力' }, desc: { zh: 'JSON / HTML / SKILL.md', en: 'JSON / HTML / SKILL.md', ja: 'JSON / HTML / SKILL.md' } },
    { icon: 'fa-microchip-ai', label: { zh: '多模型 AI', en: 'Multi-model AI', ja: 'マルチモデルAI' }, desc: { zh: 'Claude / GPT / Gemini', en: 'Claude / GPT / Gemini', ja: 'Claude / GPT / Gemini' } },
    { icon: 'fa-figma', label: { zh: 'Figma 匯出', en: 'Figma Export', ja: 'Figma出力' }, desc: { zh: figmaLabel, en: figmaLabel, ja: figmaLabel }, faPrefix: 'fa-brands' },
  ]
})

const ctaLabel = computed(() => {
  if (!pipelineStore.uploadedImage) return t({ zh: '上傳圖片後即可辨識', en: 'Upload an image to start', ja: '画像をアップロードしてください' })
  return authStore.isAuthenticated ? t(IL.ctaStart) : t(IL.ctaFree)
})

const creditsNotice = computed(() => {
  if (!authStore.isAuthenticated) return ''
  return t(IL.credits).replace('{n}', authStore.creditsBalance)
})

// Render Turnstile when image uploaded
onMounted(() => {
  watch(() => pipelineStore.uploadedImage, () => {
    if (pipelineStore.uploadedImage && !turnstileWidgetId.value && !isDev) {
      nextTick(() => {
        if (turnstileEl.value && window.turnstile) {
          turnstileWidgetId.value = window.turnstile.render(turnstileEl.value, {
            sitekey: TURNSTILE_SITE_KEY,
            size: 'normal',
            theme: 'light',
            callback: (token) => { turnstileToken.value = token },
            'expired-callback': () => { turnstileToken.value = '' },
            'error-callback': () => { turnstileToken.value = '' },
          })
        }
      })
    }
  }, { immediate: true })
})

// ── File handling ──

function handleDragOver(event) {
  event.preventDefault()
  event.stopPropagation()
  isDraggingOver.value = true
}

function handleDragLeave() {
  isDraggingOver.value = false
}

function handleDrop(event) {
  event.preventDefault()
  event.stopPropagation()
  isDraggingOver.value = false
  const files = event.dataTransfer.files
  if (files.length > 0 && files[0].type.startsWith('image/')) {
    loadFile(files[0])
  }
}

function handleFileSelect(event) {
  const files = event.target.files
  if (files.length > 0) loadFile(files[0])
}

function loadFile(file) {
  imageError.value = ''
  if (file.size > MAX_IMAGE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1)
    imageError.value = t(I.s1.imageTooLarge).replace('{size}', sizeMB).replace('{max}', '5')
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    pipelineStore.setUploadedImage(e.target.result, file.name)
    previewFileName.value = file.name
  }
  reader.readAsDataURL(file)
}

// ── CTA: check gate then proceed ──

async function handleNext() {
  if (submitting.value || !pipelineStore.uploadedImage || (!isDev && !turnstileToken.value)) return
  gateError.value = ''
  submitting.value = true

  // Check if user can proceed (anonymous gate / credits)
  const check = await authStore.canStartGeneration()
  if (!check.allowed) {
    submitting.value = false
    if (check.reason === 'login_required') {
      gateError.value = t(IL.loginRequired)
      authStore.showAuthModal('second_use')
    } else if (check.reason === 'no_credits') {
      gateError.value = t(IL.noCredits)
    }
    return
  }

  // Upload image to R2 + Turnstile verification
  const apiBase = import.meta.env.VITE_API_BASE || settingsStore.devSettings?.base || ''
  if (apiBase) {
    const base64 = pipelineStore.uploadedImage.split(',')[1] || ''
    if (base64) {
      try {
        const hdrs = { 'Content-Type': 'application/json' }
        if (isDev && import.meta.env.VITE_DEV_BYPASS_KEY) hdrs['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY
        const email = authStore.isAuthenticated ? authStore.user.email : ''
        const resp = await fetch(`${apiBase}/api/upload-image`, {
          method: 'POST',
          headers: hdrs,
          body: JSON.stringify({
            image_base64: base64,
            email,
            turnstile_token: turnstileToken.value,
            ...(authStore.isAuthenticated ? { user_id: authStore.user.id, session_token: authStore.sessionToken } : {}),
          }),
        })
        const data = await resp.json()

        if (resp.status === 429) {
          gateError.value = t(I.s1.rateLimitExceeded)
          submitting.value = false
          return
        }

        if (data.imageKey) {
          pipelineStore.imageKey = data.imageKey
          if (isDev) console.log('[img2ui] R2 upload OK:', data.imageKey)
        }
        if (data.sessionToken) {
          pipelineStore.sessionToken = data.sessionToken
          if (isDev) console.log('[img2ui] Session token received')
        }
      } catch (err) {
        if (isDev) console.warn('[img2ui] R2 upload failed (continuing):', err.message)
        submitting.value = false
      }
    }
  }

  pipelineStore.nextStep()
}
</script>

<template>
  <div class="step-upload">
    <!-- HERO: logo + description (spans full width on mobile, left col on desktop) -->
    <div class="upload-hero">
      <img :src="logoImg" alt="img2ui" style="width:72px;height:72px;border-radius:18px;box-shadow:0 4px 16px rgba(0,0,0,.08);margin-bottom:20px">

      <h1 style="font-size:36px;font-weight:800;color:#111;margin:0 0 8px;line-height:1.15">
        {{ t(I.s1.title) }}
      </h1>
      <p style="color:#555;font-size:16px;font-weight:500;margin:0 0 6px;letter-spacing:.2px">
        {{ t(I.s1.subtitle) }}
      </p>
      <p style="color:#999;font-size:13px;line-height:1.7;margin:0 0 28px">
        {{ t(I.s1.desc) }}
      </p>
    </div>

    <!-- LEFT COLUMN: auth cards + footer -->
    <div class="upload-left">
      <!-- Registration CTA Card (not logged in) -->
      <div v-if="!authStore.isAuthenticated" class="auth-card" style="background:linear-gradient(135deg,#f5f5f5,#ebebeb);border-radius:14px;padding:18px 20px">
        <div style="font-size:14px;font-weight:600;color:#333;margin-bottom:10px;display:flex;align-items:center;gap:6px">
          <i class="fa-duotone fa-thin fa-gift" style="font-size:15px;color:#999"></i>
          {{ t(IL.bonusTitle) }}
        </div>
        <div style="font-size:12px;color:#666;line-height:2;margin-bottom:14px">
          <div><i class="fa-duotone fa-thin fa-floppy-disk" style="width:16px;color:#aaa;margin-right:4px"></i>{{ t(IL.benefit1) }}</div>
          <div><i class="fa-duotone fa-thin fa-coins" style="width:16px;color:#aaa;margin-right:4px"></i>{{ t(IL.benefit2) }}</div>
          <div><i class="fa-duotone fa-thin fa-grid-2" style="width:16px;color:#aaa;margin-right:4px"></i>{{ t(IL.benefit3) }}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button @click="authStore.showAuthModal('register')" style="flex:1;padding:9px 12px;border-radius:8px;border:1.5px solid #ddd;background:#fff;color:#333;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">
            <svg width="14" height="14" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/></svg>
            Google
          </button>
          <button @click="authStore.loginWithGitHub()" style="flex:1;padding:9px 12px;border-radius:8px;border:1.5px solid #ddd;background:#24292e;color:#fff;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="#fff"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>
            GitHub
          </button>
        </div>
      </div>

      <!-- Logged-in user card -->
      <div v-if="authStore.isAuthenticated" class="auth-card" style="background:linear-gradient(135deg,#f5f5f5,#ebebeb);border-radius:14px;padding:18px 20px;display:flex;align-items:center;gap:14px">
        <img
          v-if="authStore.user?.avatarUrl"
          :src="authStore.user.avatarUrl"
          :alt="authStore.user.name"
          style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0"
        />
        <div
          v-else
          style="width:40px;height:40px;border-radius:50%;background:#e0e0e0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;color:#888;flex-shrink:0"
        >
          {{ (authStore.user?.name || '?')[0].toUpperCase() }}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:600;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            {{ authStore.user?.name || authStore.user?.email || '' }}
          </div>
          <div v-if="authStore.user?.name && authStore.user?.email" style="font-size:11px;color:#aaa;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            {{ authStore.user.email }}
          </div>
          <div style="font-size:12px;color:#999;margin-top:2px;display:flex;align-items:center;gap:5px">
            <i class="fa-duotone fa-thin fa-coins" style="font-size:11px"></i>
            {{ creditsNotice }}
          </div>
          <div style="margin-top:6px;display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:600"
            :style="authStore.hasCheckedInToday
              ? { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }
              : { background: '#fafafa', color: '#bbb', border: '1px solid #e8e8e8' }"
          >
            <i :class="authStore.hasCheckedInToday ? 'fa-duotone fa-thin fa-circle-check' : 'fa-duotone fa-thin fa-circle'" style="font-size:10px"></i>
            {{ authStore.hasCheckedInToday
              ? t({ zh: '本日簽到已領取', en: 'Daily bonus claimed', ja: '本日のログインボーナス受取済' })
              : t({ zh: '今日尚未簽到', en: 'Login to claim daily bonus', ja: '本日未ログイン' })
            }}
          </div>
        </div>
      </div>

      <div class="left-footer">
        <p style="margin-top:20px;font-size:11px;color:#bbb">{{ t(I.s1.local) }}</p>
        <p style="margin-top:6px;font-size:11px;color:#bbb">
          <i class="fa-duotone fa-thin fa-envelope" style="margin-right:4px"></i>
          <a href="mailto:service@img2ui.com" style="color:#bbb;text-decoration:none;border-bottom:1px dotted #ddd">service@img2ui.com</a>
        </p>
        <p style="margin-top:6px;font-size:11px;color:#bbb">
          <i class="fa-brands fa-figma" style="margin-right:4px"></i>
          <a href="https://www.figma.com/community/plugin/1616731798771519323" target="_blank" rel="noopener noreferrer" style="color:#bbb;text-decoration:none;border-bottom:1px dotted #ddd">
            {{ t({ zh: 'Figma Plugin', en: 'Figma Plugin', ja: 'Figma Plugin' }) }}
          </a>
        </p>
      </div>
    </div>

    <!-- RIGHT COLUMN: Upload -->
    <div class="upload-right">
      <!-- Drop Zone -->
      <div
        @dragover.prevent="handleDragOver"
        @dragleave="handleDragLeave"
        @drop.prevent="handleDrop"
        @click="$refs.fileInput?.click()"
        :style="{
          borderRadius: '20px',
          padding: pipelineStore.uploadedImage ? '24px' : '56px 24px',
          cursor: 'pointer',
          textAlign: 'center',
          background: '#fff',
          border: isDraggingOver ? '2px solid #6366f1' : '1.5px solid #e8e8e8',
          transition: 'all 0.2s',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }"
      >
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          style="display:none"
          @change="handleFileSelect"
        />

        <div v-if="!pipelineStore.uploadedImage">
          <div style="font-size:48px;margin-bottom:14px;opacity:.2;color:#999">
            <i class="fa-duotone fa-thin fa-cloud-arrow-up"></i>
          </div>
          <div style="font-weight:700;color:#555;margin-bottom:6px;font-size:16px">
            {{ t(I.s1.drop) }}
          </div>
          <div style="color:#aaa;font-size:14px">{{ t(I.s1.hint) }}</div>
          <div style="font-size:11px;color:#bbb;margin-top:8px">{{ t(I.s1.maxSize) }}</div>
        </div>

        <div v-else>
          <img
            :src="pipelineStore.uploadedImage"
            style="max-height:300px;max-width:100%;object-fit:contain;border-radius:12px;display:block;margin:0 auto"
            alt="preview"
          />
          <div style="margin-top:10px;font-size:13px;color:#999">{{ previewFileName }}</div>
          <div style="margin-top:3px;font-size:12px;color:#aaa">{{ t(I.s1.reselect) }}</div>
        </div>
      </div>

      <div v-if="imageError" style="font-size:12px;color:#e05050;margin-top:8px;text-align:center">
        {{ imageError }}
      </div>

      <!-- Feature Cards (3+3 grid) -->
      <div class="feature-grid">
        <div v-for="f in features" :key="f.icon" class="feature-card">
          <div class="feature-icon">
            <i :class="(f.faPrefix || 'fa-duotone fa-thin') + ' ' + f.icon"></i>
          </div>
          <div class="feature-label">{{ t(f.label) }}</div>
        </div>
      </div>

      <!-- CTA Button -->
      <button
        @click="handleNext"
        :disabled="isCtaDisabled"
        style="width:100%;margin-top:16px;padding:14px 20px;border-radius:12px;border:none;background:#111;color:#fff;font-size:15px;font-weight:700;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px"
        :style="{
          opacity: isCtaDisabled ? 0.4 : 1,
          cursor: isCtaDisabled ? 'not-allowed' : 'pointer',
        }"
      >
        <span>{{ ctaLabel }}</span>
        <i class="fa-duotone fa-thin fa-arrow-right" style="font-size:16px"></i>
      </button>

      <div v-if="gateError" style="font-size:12px;color:#e05050;margin-top:8px;text-align:center">
        {{ gateError }}
      </div>

      <!-- Turnstile -->
      <div
        v-show="!isDev && pipelineStore.uploadedImage"
        ref="turnstileEl"
        style="margin-top:14px;display:flex;justify-content:center"
      ></div>

    </div>
  </div>

  <!-- Community Designs Marquee -->
  <GalleryMarquee />
</template>

<style scoped>
.step-upload {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 24px 48px;
  max-width: 1100px;
  margin: 0 auto;
  align-items: start;
  padding-top: 12px;
}

/* Desktop: hero top-left, left col bottom-left, right col spans both rows */
.upload-hero {
  grid-column: 1;
  grid-row: 1;
  text-align: left;
}

.upload-left {
  grid-column: 1;
  grid-row: 2;
  text-align: left;
}

.upload-right {
  grid-column: 2;
  grid-row: 1 / 3;
  position: sticky;
  top: 24px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 16px;
}

.feature-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 10px 8px;
  border-radius: 10px;
  background: #f8f8f8;
  gap: 2px;
}

.feature-icon {
  font-size: 22px;
  color: #aaa;
}

.feature-label {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  line-height: 1.3;
}

@media (max-width: 768px) {
  .step-upload {
    grid-template-columns: 1fr;
    grid-template-rows: unset;
    gap: 24px;
    max-width: 520px;
  }

  .upload-hero {
    grid-column: 1;
    grid-row: unset;
    order: 1;
    text-align: center;
  }

  .upload-right {
    grid-column: 1;
    grid-row: unset;
    order: 2;
    position: static;
  }

  .upload-left {
    grid-column: 1;
    grid-row: unset;
    order: 3;
    text-align: left;
  }

  .upload-left .left-footer {
    text-align: center;
  }
}
</style>
