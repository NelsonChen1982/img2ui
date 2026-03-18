<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { usePipelineStore } from '../../stores/pipeline'
import { useSettingsStore } from '../../stores/settings'
import { I } from '../../data/i18n'
import { DAILY_LIMIT } from '../../data/constants'
import logoImg from '../../assets/logo.jpg'

function t(obj) {
  if (!obj) return ''
  return obj[settingsStore.lang] || obj.en || ''
}

const pipelineStore = usePipelineStore()
const settingsStore = useSettingsStore()

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB

const TURNSTILE_SITE_KEY = '0x4AAAAAACsNmdC4zDbyKXhd'

const email = ref('')
const emailError = ref('')
const imageError = ref('')
const previewFileName = ref('')
const isDraggingOver = ref(false)
const turnstileToken = ref('')
const turnstileEl = ref(null)
const turnstileWidgetId = ref(null)

const isEmailValid = computed(() => {
  if (!email.value) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.value)
})

const isDev = import.meta.env.DEV
const isCtaDisabled = computed(() => !isEmailValid.value || !pipelineStore.uploadedImage || (!isDev && !turnstileToken.value))

// Render Turnstile widget when email becomes valid + image uploaded
onMounted(() => {
  watch([isEmailValid, () => pipelineStore.uploadedImage], () => {
    if (isEmailValid.value && pipelineStore.uploadedImage && !turnstileWidgetId.value && !isDev) {
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

const rateLimitNotice = computed(() => {
  if (!settingsStore.rateLimitRemaining && settingsStore.rateLimitRemaining !== 0) return ''
  return t(I.s1.rateLimitMsg)
    .replace('{n}', DAILY_LIMIT)
    .replace('{r}', settingsStore.rateLimitRemaining || 0)
})

const isRateLimited = computed(() => settingsStore.rateLimitRemaining === 0)

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
  if (files.length > 0) {
    const file = files[0]
    if (file.type.startsWith('image/')) {
      loadFile(file)
    }
  }
}

function handleFileSelect(event) {
  const files = event.target.files
  if (files.length > 0) {
    loadFile(files[0])
  }
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
    const dataUrl = e.target.result
    pipelineStore.setUploadedImage(dataUrl, file.name)
    previewFileName.value = file.name
  }
  reader.readAsDataURL(file)
}

function validateEmailGate() {
  emailError.value = ''
  if (email.value && !isEmailValid.value) {
    emailError.value = t(I.s1.emailError)
  }
}

async function handleNext() {
  if (!isEmailValid.value || !pipelineStore.uploadedImage || (!isDev && !turnstileToken.value)) return
  pipelineStore.setEmail(email.value)

  // Upload image to R2 + rate limit check + Turnstile verification
  const apiBase = import.meta.env.VITE_API_BASE || settingsStore.devSettings?.base || ''
  if (apiBase) {
    const base64 = pipelineStore.uploadedImage.split(',')[1] || ''
    if (base64) {
      try {
        const resp = await fetch(`${apiBase}/api/upload-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_base64: base64,
            email: email.value,
            turnstile_token: turnstileToken.value,
          }),
        })
        const data = await resp.json()

        if (resp.status === 429) {
          // Rate limited — block navigation
          settingsStore.rateLimitRemaining = 0
          emailError.value = t(I.s1.rateLimitExceeded)
          return
        }

        if (data.imageKey) {
          pipelineStore.imageKey = data.imageKey
          console.log('[img2ui] R2 upload OK:', data.imageKey)
        }
        if (data.rateLimit) {
          settingsStore.rateLimitRemaining = data.rateLimit.remaining
        }
      } catch (err) {
        console.warn('[img2ui] R2 upload failed (continuing):', err.message)
      }
    }
  }

  pipelineStore.nextStep()
}
</script>

<template>
  <div style="max-width: 720px; margin: 0 auto">
    <!-- Intro Section -->
    <div style="text-align: center; margin-bottom: 40px; padding-top: 20px">
      <img :src="logoImg" alt="img2ui" style="width:96px;height:96px;border-radius:24px;margin:0 auto 20px;display:block;box-shadow:0 6px 24px rgba(0,0,0,.1);">
      <h1 style="font-size: 34px; font-weight: 800; color: #111; margin-bottom: 12px; line-height: 1.2">
        {{ t(I.s1.title) }}
      </h1>
      <p style="color: #777; font-size: 16px; line-height: 1.7; max-width: 540px; margin: 0 auto 28px">
        {{ t(I.s1.desc) }}
      </p>

      <!-- Feature Cards -->
      <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap">
        <div
          v-for="feature in I.s1.features[settingsStore.lang]"
          :key="feature.fa"
          style="
            text-align: center;
            font-size: 12px;
            color: #999;
            max-width: 100px;
          "
        >
          <div style="font-size: 22px; margin-bottom: 6px; color: #bbb">
            <i :class="'fa-duotone fa-thin ' + feature.fa"></i>
          </div>
          <div style="line-height: 1.4">{{ feature.t }}</div>
        </div>
      </div>
    </div>

    <!-- Drop Zone -->
    <div
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop"
      @click="$refs.fileInput?.click()"
      :style="{
        borderRadius: '20px',
        padding: '44px 24px',
        cursor: 'pointer',
        textAlign: 'center',
        background: '#fff',
        border: isDraggingOver ? '2px solid #6366f1' : '1px solid #e8e8e8',
        transition: 'all 0.2s',
      }"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        style="display: none"
        @change="handleFileSelect"
      />

      <div v-if="!pipelineStore.uploadedImage">
        <div style="font-size: 44px; margin-bottom: 12px; opacity: 0.25; color: #999">
          <i class="fa-duotone fa-thin fa-cloud-arrow-up"></i>
        </div>
        <div style="font-weight: 700; color: #555; margin-bottom: 6px; font-size: 16px">
          {{ t(I.s1.drop) }}
        </div>
        <div style="color: #aaa; font-size: 14px">{{ t(I.s1.hint) }}</div>
        <div style="font-size: 11px; color: #bbb; margin-top: 6px">{{ t(I.s1.maxSize) }}</div>
      </div>

      <div v-else>
        <img
          v-if="pipelineStore.uploadedImage"
          :src="pipelineStore.uploadedImage"
          style="max-height: 280px; max-width: 100%; object-fit: contain; border-radius: 12px; margin: 0 auto; display: block"
          alt="preview"
        />
        <div style="margin-top: 12px; font-size: 14px; color: #999">
          {{ previewFileName }}
        </div>
        <div style="margin-top: 4px; font-size: 12px; color: #aaa">
          {{ t(I.s1.reselect) }}
        </div>
      </div>
    </div>

    <div v-if="imageError" style="font-size: 12px; color: #e05050; margin-top: 8px; text-align: center">
      {{ imageError }}
    </div>

    <!-- Email Gate + CTA -->
    <div style="margin-top: 20px; max-width: 420px; margin-left: auto; margin-right: auto">
      <div style="display: flex; gap: 8px; align-items: center">
        <input
          v-model="email"
          type="email"
          :placeholder="t(I.s1.emailPlaceholder)"
          @input="validateEmailGate"
          @keydown.enter="handleNext"
          style="
            flex: 1;
            padding: 12px 14px;
            border-radius: 10px;
            border: 1.5px solid #ddd;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
            background: #fff;
            color: #333;
          "
          :disabled="isRateLimited"
        />
        <button
          @click="handleNext"
          :disabled="isCtaDisabled"
          style="
            padding: 12px 20px;
            border-radius: 10px;
            border: 1.5px solid #ddd;
            background: #fff;
            color: #333;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 6px;
          "
          :style="{
            opacity: isCtaDisabled ? 0.5 : 1,
            cursor: isCtaDisabled ? 'not-allowed' : 'pointer',
          }"
        >
          <span>{{ t(I.s1.next) }}</span>
          <i class="fa-duotone fa-thin fa-arrow-right" style="font-size: 16px"></i>
        </button>
      </div>

      <div v-if="emailError" style="font-size: 11px; color: #e05050; margin-top: 4px; min-height: 16px">
        {{ emailError }}
      </div>

      <!-- Turnstile -->
      <div
        v-show="!isDev && isEmailValid && pipelineStore.uploadedImage"
        ref="turnstileEl"
        style="margin-top: 12px; display: flex; justify-content: center;"
      ></div>

      <div style="margin-top: 8px; font-size: 12px; color: #aaa; text-align: center">
        {{ t(I.s1.emailHint) }}
      </div>

      <div
        v-if="rateLimitNotice && settingsStore.rateLimitRemaining < DAILY_LIMIT"
        style="margin-top: 6px; font-size: 11px; color: #bbb; text-align: center"
      >
        {{ rateLimitNotice }}
      </div>
    </div>

    <p style="margin-top: 16px; text-align: center; font-size: 12px; color: #bbb">
      {{ t(I.s1.local) }}
    </p>

    <p style="margin-top: 10px; text-align: center; font-size: 12px; color: #bbb">
      <i class="fa-duotone fa-thin fa-envelope" style="margin-right: 4px;"></i>
      <a href="mailto:service@img2ui.com" style="color: #aaa; text-decoration: none; border-bottom: 1px dotted #ccc;">service@img2ui.com</a>
    </p>
  </div>
</template>
