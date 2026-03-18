<script setup>
import { ref, onMounted } from 'vue'
import { usePipelineStore } from '../../stores/pipeline'
import { useSettingsStore } from '../../stores/settings'
import { I } from '../../data/i18n'
import { analyzeAnnotationsWithAI, analyzeHolisticDesign } from '../../services/aiService'
import { COMP_META } from '../../data/compMeta'
import { COMP_SKELETON } from '../../data/compSkeleton'
import { VARIATION_AXIS } from '../../data/constants'

const pipelineStore = usePipelineStore()
const settingsStore = useSettingsStore()

const progress = ref(0)
const tasks = ref([])
const annoProgress = ref('')
const analysisResults = ref([])

function t(obj) {
  if (!obj) return ''
  return obj[settingsStore.lang] || obj.en || ''
}

/**
 * Create an offscreen canvas with the uploaded image drawn on it.
 * Needed for cropAnnotationToBase64 / compositeAnnotationCrops in aiService.
 */
function createOffscreenCanvas() {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      // Use same scaling as StepAnnotate (max 1200 wide, 600 tall)
      const maxW = 1200
      const maxH = 600
      const scale = Math.min(maxW / img.width, maxH / img.height, 1)
      canvas.width = Math.floor(img.width * scale)
      canvas.height = Math.floor(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas)
    }
    img.onerror = () => resolve(null)
    img.src = pipelineStore.imgDataUrl
  })
}

onMounted(() => {
  startProcessing()
})

async function startProcessing() {
  // Initialize tasks
  const taskList = I.s6.tasks[settingsStore.lang] || []
  tasks.value = taskList.map((label, index) => ({
    id: index,
    label,
    completed: false,
  }))

  // Progress animation
  const progressInterval = setInterval(() => {
    if (progress.value < 85) {
      progress.value += Math.random() * 15
    }
  }, 500)

  // Task completion
  const taskDelays = [800, 1600, 2400, 3200]
  taskDelays.forEach((delay, index) => {
    setTimeout(() => {
      if (index < tasks.value.length) {
        tasks.value[index].completed = true
      }
    }, delay)
  })

  // Set globals that aiService.js reads (legacy compatibility)
  window.selectedProvider = settingsStore.selectedProvider || 'gpt4o-mini'
  window.PIC2UI_API_BASE = import.meta.env.VITE_API_BASE || settingsStore.devSettings?.base || ''

  // ── Debug: email & worker connection ──
  const debugEmail = settingsStore.email || ''
  const debugBase = window.PIC2UI_API_BASE || '(empty — will use direct API)'
  console.log('[img2ui] 📧 Email in settings store:', debugEmail || '⚠️ EMPTY')
  console.log('[img2ui] 🔗 Worker base URL:', debugBase)

  if (window.PIC2UI_API_BASE) {
    try {
      const healthResp = await fetch(`${window.PIC2UI_API_BASE}/health`)
      const healthData = await healthResp.json()
      console.log('[img2ui] ✅ Worker /health response:', healthData)
    } catch (err) {
      console.error('[img2ui] ❌ Worker connection failed:', err.message)
    }
  } else {
    console.warn('[img2ui] ⚠️ No PIC2UI_API_BASE set — worker will not be used')
  }

  if (pipelineStore.annotations.length > 0) {
    try {
      const canvas = await createOffscreenCanvas()
      if (canvas) {
        await analyzeAnnotationsWithAI({
          canvas,
          annotations: pipelineStore.annotations,
          onProgress: (idx, total, label, typeId) => {
            annoProgress.value = `${t({ zh: '分析中', en: 'Analyzing', ja: '分析中' })}: ${label} (${idx + 1}/${total})`
          },
          onResult: (entry) => {
            // entry: { label, typeId, method, provider?, role?, relationship?, reason? }
            analysisResults.value = [...analysisResults.value, entry]
          },
          getDevKeys: () => ({
            anthropic: settingsStore.devSettings?.anthropic || '',
            openai: settingsStore.devSettings?.openai || '',
            gemini: settingsStore.devSettings?.gemini || '',
          }),
          getStoredEmail: () => settingsStore.email || '',
          getSessionToken: () => pipelineStore.sessionToken || '',
          COMP_META,
          COMP_SKELETON,
          VARIATION_AXIS,
        })
      }
    } catch (e) {
      console.warn('AI analysis failed, continuing with local fallback:', e)
    }
  }

  // Run holistic design analysis on full image
  annoProgress.value = t({ zh: '整體風格分析中...', en: 'Analyzing global style...', ja: 'グローバルスタイル分析中...' })
  try {
    const imgBase64 = pipelineStore.imgDataUrl?.split(',')[1] || ''
    if (imgBase64) {
      const ALL_COMP_IDS = Object.keys(COMP_META)
      const hResult = await analyzeHolisticDesign({
        imageBase64: imgBase64,
        getDevKeys: () => ({
          anthropic: settingsStore.devSettings?.anthropic || '',
          openai: settingsStore.devSettings?.openai || '',
          gemini: settingsStore.devSettings?.gemini || '',
        }),
        getStoredEmail: () => settingsStore.email || '',
        getSessionToken: () => pipelineStore.sessionToken || '',
        knownComponentIds: ALL_COMP_IDS,
        onResult: (entry) => {
          analysisResults.value = [...analysisResults.value, entry]
        },
      })
      pipelineStore.holisticResult = hResult
    }
  } catch (e) {
    console.warn('Holistic analysis failed:', e)
  }

  // Final progress
  setTimeout(async () => {
    progress.value = 100
    annoProgress.value = ''
    clearInterval(progressInterval)

    // Build UI Kit
    pipelineStore.buildDS()

    // Save result to D1 (non-blocking)
    const apiBase = window.PIC2UI_API_BASE || ''
    if (apiBase && settingsStore.email) {
      try {
        const saveHdrs = { 'Content-Type': 'application/json' }
        if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_KEY) saveHdrs['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY
        const resp = await fetch(`${apiBase}/api/save-result`, {
          method: 'POST',
          headers: saveHdrs,
          body: JSON.stringify({
            email: settingsStore.email,
            image_key: pipelineStore.imageKey || '',
            tokens: pipelineStore.DS,
            annotations: pipelineStore.annotations,
            holistic: pipelineStore.holisticResult,
            provider: window.selectedProvider || '',
            session_token: pipelineStore.sessionToken || '',
          }),
        })
        const data = await resp.json()
        console.log('[img2ui] D1 save result:', data)
      } catch (err) {
        console.warn('[img2ui] D1 save failed (continuing):', err.message)
      }
    }

    setTimeout(() => {
      pipelineStore.showStep(7)
    }, 600)
  }, 800)
}
</script>

<template>
  <div style="max-width: 640px; margin: 0 auto; text-align: center; padding-top: 80px">
    <h1 style="font-size: 26px; font-weight: 700; color: #111; margin-bottom: 6px">
      {{ t(I.s6.title) }}
    </h1>
    <p style="color: #888; font-size: 15px; margin-bottom: 40px">
      {{ t(I.s6.desc) }}
    </p>

    <div style="max-width: 400px; margin: 0 auto">
      <!-- Progress Bar -->
      <div
        style="
          background: #eee;
          border-radius: 99px;
          overflow: hidden;
          margin-bottom: 24px;
        "
      >
        <div
          id="proc-bar"
          class="proc-bar"
          :style="{
            width: progress + '%',
            height: '8px',
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            transition: 'width 0.3s ease-out',
          }"
        />
      </div>

      <!-- Task List -->
      <div id="proc-tasks" style="text-align: left; display: flex; flex-direction: column; gap: 8px">
        <div
          v-for="task in tasks"
          :key="task.id"
          :style="{
            background: '#fff',
            border: '1px solid #e8e8e8',
            borderRadius: '10px',
            padding: '10px 12px',
            opacity: task.completed ? 1 : 0.3,
            transition: 'all 0.5s',
          }"
        >
          <div style="display: flex; align-items: center; gap: 10px">
            <div
              :style="{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                border: task.completed ? 'none' : '1.5px solid #ccc',
                background: task.completed ? '#222' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.3s',
              }"
            >
              <svg v-if="task.completed" width="8" height="7" fill="none">
                <path d="M1 3.5l2 2L7 1" stroke="#fff" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </div>
            <div style="font-size: 13px; font-weight: 600; color: #333">{{ task.label }}</div>
          </div>
        </div>
      </div>

      <!-- Progress Text -->
      <div
        id="proc-anno-progress"
        :style="{
          marginTop: '16px',
          fontSize: '12px',
          color: '#999',
          opacity: annoProgress ? 1 : 0,
          transition: 'opacity 0.3s',
        }"
      >
        {{ annoProgress }}
      </div>

      <!-- Real-time Analysis Log -->
      <div
        v-if="analysisResults.length > 0"
        style="
          margin-top: 16px;
          text-align: left;
          background: #f9f9f9;
          border: 1px solid #e8e8e8;
          border-radius: 10px;
          padding: 12px;
          max-height: 200px;
          overflow-y: auto;
        "
      >
        <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.06em; color: #aaa; margin-bottom: 8px">
          ANALYSIS LOG
        </div>
        <div
          v-for="(entry, idx) in analysisResults"
          :key="idx"
          style="
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 0;
            border-bottom: 1px solid #f0f0f0;
            font-size: 12px;
          "
        >
          <span
            :style="{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: entry.method === 'ai' || entry.method === 'ai-grouped' ? '#4ade80' : '#f59e0b',
              flexShrink: 0,
            }"
          />
          <span style="font-weight: 600; color: #333; min-width: 60px">{{ entry.typeId }}</span>
          <span style="color: #666; flex: 1">{{ entry.label }}</span>
          <span
            :style="{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '4px',
              fontWeight: 600,
              background: entry.method === 'ai' || entry.method === 'ai-grouped' ? 'rgba(74,222,128,.12)' : 'rgba(245,158,11,.12)',
              color: entry.method === 'ai' || entry.method === 'ai-grouped' ? '#16a34a' : '#d97706',
            }"
          >
            {{ entry.method === 'ai-grouped' ? 'AI Grouped' : entry.method === 'ai' ? 'AI' : 'Local' }}
          </span>
          <span v-if="entry.role" style="font-size: 10px; color: #999">{{ entry.role }}</span>
          <span v-if="entry.provider" style="font-size: 10px; color: #bbb">{{ entry.provider }}</span>
          <span v-if="entry.reason" style="font-size: 10px; color: #e05050">{{ entry.reason }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.proc-bar {
  animation: fillBar 0.3s ease-out;
}

@keyframes fillBar {
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
}
</style>
