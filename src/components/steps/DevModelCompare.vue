<script setup>
import { ref, onMounted } from 'vue'
import { usePipelineStore } from '../../stores/pipeline'
import { useSettingsStore } from '../../stores/settings'
import { useAuthStore } from '../../stores/auth'
import { cropAnnotationToBase64 } from '../../services/aiService'
import { buildComponentPrompt } from '../../services/aiService'
import { tryParseJSON } from '../../services/aiService'
import { COMP_META } from '../../data/compMeta'
import { COMP_SKELETON } from '../../data/compSkeleton'

const emit = defineEmits(['close'])
const pipelineStore = usePipelineStore()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()

const ALL_MODELS = [
  { value: 'gpt4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt4o', label: 'GPT-4o' },
  { value: 'gpt-5.4', label: 'GPT-5.4' },
  { value: 'gpt5-nano', label: 'GPT-5 Nano' },
  { value: 'claude-sonnet', label: 'Claude Sonnet 4' },
  { value: 'qwen3.5-35b', label: 'Qwen 3.5 35B' },
  { value: 'qwen3.5-9b', label: 'Qwen 3.5 9B' },
  { value: 'qwen3.5-flash', label: 'Qwen 3.5 Flash' },
  { value: 'grok-4.1-fast', label: 'Grok 4.1 Fast' },
  { value: 'hunter-alpha', label: 'Hunter Alpha (Free)' },
]

const selectedModels = ref(['gpt4o-mini', 'qwen3.5-35b'])
const running = ref(false)
const results = ref([]) // [{ annotation, crops: base64, models: [{ model, status, parsed, raw, time }] }]
const canvasRef = ref(null)

function toggleModel(value) {
  const idx = selectedModels.value.indexOf(value)
  if (idx >= 0) selectedModels.value.splice(idx, 1)
  else selectedModels.value.push(value)
}

onMounted(() => {
  // Build offscreen canvas with the uploaded image
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    const maxW = 1200
    const maxH = 600
    const scale = Math.min(maxW / img.width, maxH / img.height, 1)
    canvas.width = Math.floor(img.width * scale)
    canvas.height = Math.floor(img.height * scale)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    canvasRef.value = canvas
  }
  img.src = pipelineStore.imgDataUrl
})

function workerHeaders() {
  const h = { 'Content-Type': 'application/json' }
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_KEY) {
    h['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY
  }
  return h
}

async function callModelViaWorker(base64, prompt, model) {
  const apiBase = window.PIC2UI_API_BASE || import.meta.env.VITE_API_BASE || ''
  const email = authStore.user?.email || settingsStore.email || ''
  const sessionToken = authStore.sessionToken || pipelineStore.sessionToken || ''
  const userId = authStore.user?.id || ''

  const resp = await fetch(`${apiBase}/api/analyze-component`, {
    method: 'POST',
    headers: workerHeaders(),
    body: JSON.stringify({
      image_base64: base64,
      prompt,
      componentType: '_compare',
      email,
      provider: model,
      session_token: sessionToken,
      user_id: userId,
    }),
  })
  if (!resp.ok) {
    const errBody = await resp.text()
    throw new Error(`${resp.status}: ${errBody}`)
  }
  const data = await resp.json()
  return {
    parsed: data.parsed || tryParseJSON(data.result?.choices?.[0]?.message?.content) || tryParseJSON(data.result?.content?.[0]?.text),
    raw: data.result,
    provider: data.provider,
  }
}

async function runComparison() {
  if (!canvasRef.value || !pipelineStore.annotations.length || !selectedModels.value.length) return
  running.value = true
  results.value = []

  const annotations = pipelineStore.annotations.filter(a => a.visual)

  for (const anno of annotations) {
    const base64 = cropAnnotationToBase64(canvasRef.value, anno.x, anno.y, anno.w, anno.h)
    const prompt = buildComponentPrompt(anno.typeId, anno.label, COMP_META, COMP_SKELETON)
    const thumbUrl = `data:image/png;base64,${base64}`

    const entry = {
      annotation: anno,
      thumbUrl,
      models: selectedModels.value.map(m => ({
        model: m,
        label: ALL_MODELS.find(am => am.value === m)?.label || m,
        status: 'pending',
        parsed: null,
        raw: null,
        time: 0,
      })),
    }
    results.value.push(entry)

    // Fire all models in parallel for this annotation
    const promises = entry.models.map(async (mEntry) => {
      mEntry.status = 'running'
      const t0 = performance.now()
      try {
        const result = await callModelViaWorker(base64, prompt, mEntry.model)
        mEntry.time = Math.round(performance.now() - t0)
        mEntry.parsed = result.parsed
        mEntry.raw = result.raw
        mEntry.status = 'done'
      } catch (e) {
        mEntry.time = Math.round(performance.now() - t0)
        mEntry.status = 'error'
        mEntry.raw = { error: e.message }
      }
    })
    await Promise.all(promises)
  }
  running.value = false
}

function renderPreviewHTML(parsed, typeId) {
  if (!parsed) return null
  const normalized = parsed.css ? { ...parsed, ...parsed.css } : parsed
  const cfg = COMP_SKELETON[typeId]

  // Use skeleton render if available — produces proper component HTML
  if (cfg?.render && pipelineStore.DS?.colors) {
    try {
      return cfg.render(normalized, pipelineStore.DS)
    } catch (e) {
      // Fall through to generic render
    }
  }

  // Generic fallback: styled box
  const p = normalized
  const bg = p.bgColor || p.backgroundColor || '#f0f0f0'
  const fg = p.textColor || p.color || '#333'
  const r = p.borderRadius || '4px'
  const border = (p.border && p.border !== 'none') ? p.border : 'none'
  const pad = p.padding || '8px 16px'
  const fs = p.fontSize || '14px'
  const fw = p.fontWeight || '400'
  const sh = (p.shadow && p.shadow !== 'none') ? p.shadow : 'none'
  return `<div style="background:${bg};color:${fg};border-radius:${r};border:${border};padding:${pad};font-size:${fs};font-weight:${fw};box-shadow:${sh};display:inline-block;max-width:100%;">${p.label || typeId}</div>`
}
</script>

<template>
  <div style="position:fixed;inset:0;z-index:9999;background:#f5f5f5;overflow-y:auto;">
    <!-- Header -->
    <div style="position:sticky;top:0;z-index:10;background:#fff;border-bottom:1px solid #e0e0e0;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:12px;">
        <h2 style="margin:0;font-size:18px;font-weight:700;color:#111;">Model Comparison</h2>
        <span style="font-size:11px;color:#999;background:#f0f0f0;padding:2px 8px;border-radius:4px;">DEV ONLY</span>
      </div>
      <button @click="emit('close')" style="background:none;border:1px solid #ddd;border-radius:6px;padding:6px 16px;font-size:13px;cursor:pointer;color:#666;">
        Close
      </button>
    </div>

    <div style="max-width:1400px;margin:0 auto;padding:24px;">
      <!-- Model selector -->
      <div style="background:#fff;border:1px solid #e8e8e8;border-radius:12px;padding:16px;margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#999;letter-spacing:0.05em;margin-bottom:10px;">SELECT MODELS</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          <label
            v-for="m in ALL_MODELS"
            :key="m.value"
            :style="{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: selectedModels.includes(m.value) ? '2px solid #111' : '1px solid #ddd',
              background: selectedModels.includes(m.value) ? '#f8f8f8' : '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: selectedModels.includes(m.value) ? 600 : 400,
              transition: 'all 0.15s',
            }"
          >
            <input
              type="checkbox"
              :checked="selectedModels.includes(m.value)"
              @change="toggleModel(m.value)"
              style="display:none;"
            />
            <span :style="{ width:'14px', height:'14px', borderRadius:'3px', border: selectedModels.includes(m.value) ? '2px solid #111' : '2px solid #ccc', background: selectedModels.includes(m.value) ? '#111' : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }">
              <svg v-if="selectedModels.includes(m.value)" width="8" height="7" fill="none"><path d="M1 3.5l2 2L7 1" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>
            </span>
            {{ m.label }}
          </label>
        </div>
        <div style="margin-top:14px;display:flex;align-items:center;gap:12px;">
          <button
            @click="runComparison"
            :disabled="running || !selectedModels.length || !pipelineStore.annotations.length"
            :style="{
              padding: '8px 24px',
              borderRadius: '8px',
              border: 'none',
              background: running ? '#ccc' : '#111',
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              cursor: running ? 'not-allowed' : 'pointer',
            }"
          >
            {{ running ? 'Running...' : `Run Comparison (${pipelineStore.annotations.length} annotations × ${selectedModels.length} models)` }}
          </button>
          <span v-if="running" style="font-size:12px;color:#999;">Processing annotations...</span>
        </div>
      </div>

      <!-- No annotations warning -->
      <div v-if="!pipelineStore.annotations.length" style="text-align:center;padding:40px;color:#999;font-size:14px;">
        No annotations found. Go back to the annotation step and mark some components first.
      </div>

      <!-- Results -->
      <div v-for="(entry, ei) in results" :key="ei" style="background:#fff;border:1px solid #e8e8e8;border-radius:12px;margin-bottom:20px;overflow:hidden;">
        <!-- Annotation header -->
        <div style="padding:14px 16px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:12px;background:#fafafa;">
          <img :src="entry.thumbUrl" style="width:60px;height:60px;object-fit:contain;border-radius:6px;border:1px solid #e0e0e0;background:#fff;" />
          <div>
            <div style="font-weight:700;font-size:14px;color:#111;">{{ entry.annotation.label }}</div>
            <div style="font-size:11px;color:#999;">{{ entry.annotation.typeId }} &middot; {{ entry.annotation.w }}×{{ entry.annotation.h }}px</div>
          </div>
        </div>

        <!-- Model results grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:1px;background:#e8e8e8;">
          <div v-for="(mEntry, mi) in entry.models" :key="mi" style="background:#fff;padding:14px;">
            <!-- Model name + status -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <span style="font-weight:700;font-size:13px;color:#333;">{{ mEntry.label }}</span>
              <span :style="{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 600,
                background: mEntry.status === 'done' ? 'rgba(34,197,94,.1)' : mEntry.status === 'error' ? 'rgba(239,68,68,.1)' : mEntry.status === 'running' ? 'rgba(59,130,246,.1)' : '#f5f5f5',
                color: mEntry.status === 'done' ? '#16a34a' : mEntry.status === 'error' ? '#dc2626' : mEntry.status === 'running' ? '#2563eb' : '#999',
              }">
                {{ mEntry.status === 'done' ? `${mEntry.time}ms` : mEntry.status === 'running' ? 'Running...' : mEntry.status === 'error' ? 'Error' : 'Pending' }}
              </span>
            </div>

            <!-- Preview: rendered element using COMP_SKELETON -->
            <div v-if="mEntry.parsed" style="margin-bottom:10px;">
              <div style="font-size:10px;font-weight:700;color:#aaa;letter-spacing:0.05em;margin-bottom:6px;">PREVIEW</div>
              <div style="background:#fafafa;border:1px solid #eee;border-radius:6px;padding:12px;display:flex;align-items:center;justify-content:center;min-height:40px;">
                <div v-html="renderPreviewHTML(mEntry.parsed, entry.annotation.typeId)"></div>
              </div>
            </div>

            <!-- Parsed CSS -->
            <div v-if="mEntry.parsed" style="margin-bottom:10px;">
              <div style="font-size:10px;font-weight:700;color:#aaa;letter-spacing:0.05em;margin-bottom:6px;">EXTRACTED CSS</div>
              <div style="background:#1e1e1e;border-radius:6px;padding:10px;overflow-x:auto;">
                <pre style="margin:0;font-size:11px;line-height:1.6;color:#d4d4d4;white-space:pre-wrap;">{{ JSON.stringify(mEntry.parsed.css || mEntry.parsed, null, 2) }}</pre>
              </div>
            </div>

            <!-- Raw JSON (collapsible) -->
            <details v-if="mEntry.raw" style="margin-top:6px;">
              <summary style="font-size:10px;font-weight:700;color:#aaa;letter-spacing:0.05em;cursor:pointer;user-select:none;">RAW RESPONSE</summary>
              <div style="background:#1e1e1e;border-radius:6px;padding:10px;margin-top:6px;overflow-x:auto;max-height:300px;overflow-y:auto;">
                <pre style="margin:0;font-size:10px;line-height:1.5;color:#d4d4d4;white-space:pre-wrap;">{{ JSON.stringify(mEntry.raw, null, 2) }}</pre>
              </div>
            </details>

            <!-- Error state -->
            <div v-if="mEntry.status === 'error'" style="background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.15);border-radius:6px;padding:10px;margin-top:6px;">
              <pre style="margin:0;font-size:11px;color:#dc2626;white-space:pre-wrap;">{{ JSON.stringify(mEntry.raw, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
