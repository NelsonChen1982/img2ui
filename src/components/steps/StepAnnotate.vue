<script setup>
import { ref, onMounted } from 'vue'
import { usePipelineStore } from '../../stores/pipeline'
import { useSettingsStore } from '../../stores/settings'
import { I } from '../../data/i18n'
import { COMP_TYPES } from '../../data/compTypes'
import { ha, isLight } from '../../services/colorUtils'

const pipelineStore = usePipelineStore()
const settingsStore = useSettingsStore()

const canvasRef = ref(null)
const drawing = ref(false)
const sx = ref(0)
const sy = ref(0)
const activeType = ref(null)
const expandedCat = ref(null) // for mobile accordion

function toggleCat(catIdx) {
  expandedCat.value = expandedCat.value === catIdx ? null : catIdx
}

const isMobile = ref(false)
onMounted(() => {
  isMobile.value = window.innerWidth <= 768
  window.addEventListener('resize', () => { isMobile.value = window.innerWidth <= 768 })
})

function t(obj) {
  if (!obj) return ''
  return obj[settingsStore.lang] || obj.en || ''
}

onMounted(() => {
  buildAnnotationStep()
})

function buildAnnotationStep() {
  // Load image onto canvas
  const img = new Image()
  img.onload = () => {
    const canvas = canvasRef.value
    if (!canvas) return

    const wrap = canvas.parentElement
    const maxW = wrap.clientWidth
    const maxH = 600
    const scale = Math.min(maxW / img.width, maxH / img.height, 1)
    const cw = Math.floor(img.width * scale)
    const ch = Math.floor(img.height * scale)

    canvas.width = cw
    canvas.height = ch
    canvas.style.width = cw + 'px'
    canvas.style.height = ch + 'px'

    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, cw, ch)

    setupCanvas(canvas)

    // Redraw existing annotations (e.g. when navigating back)
    if (pipelineStore.annotations.length > 0) {
      redrawCanvas(canvas)
    }
  }
  img.src = pipelineStore.imgDataUrl
}

function setupCanvas(canvas) {
  canvas.addEventListener('mousedown', (e) => {
    if (!activeType.value) return
    drawing.value = true
    const r = canvas.getBoundingClientRect()
    sx.value = e.clientX - r.left
    sy.value = e.clientY - r.top
  })

  canvas.addEventListener('mousemove', (e) => {
    if (!drawing.value) return
    const r = canvas.getBoundingClientRect()
    redrawCanvas(canvas, e.clientX - r.left, e.clientY - r.top)
  })

  canvas.addEventListener('mouseup', (e) => {
    if (!drawing.value) return
    drawing.value = false
    const r = canvas.getBoundingClientRect()
    const ex = e.clientX - r.left
    const ey = e.clientY - r.top
    const w = Math.abs(ex - sx.value)
    const h = Math.abs(ey - sy.value)

    if (w < 12 || h < 12) {
      redrawCanvas(canvas)
      return
    }

    const ax = Math.min(sx.value, ex)
    const ay = Math.min(sy.value, ey)

    const annotation = {
      id: Date.now(),
      x: ax,
      y: ay,
      w: w,
      h: h,
      typeId: activeType.value.id,
      label: activeType.value.label,
      color: activeType.value.color,
      visual: analyzeAnnotationRegion(canvas, ax, ay, w, h),
    }

    pipelineStore.addAnnotation(annotation)
    redrawCanvas(canvas)
  })
}

function analyzeAnnotationRegion(canvas, x, y, w, h) {
  const ctx = canvas.getContext('2d')
  const imgData = ctx.getImageData(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
  const px = imgData.data
  const totalPx = px.length / 4

  let sumR = 0,
    sumG = 0,
    sumB = 0
  const colorBuckets = {}

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i],
      g = px[i + 1],
      b = px[i + 2],
      a = px[i + 3]
    if (a < 128) continue
    sumR += r
    sumG += g
    sumB += b

    const qr = (r >> 4) << 4
    const qg = (g >> 4) << 4
    const qb = (b >> 4) << 4
    const key = `${qr},${qg},${qb}`
    colorBuckets[key] = (colorBuckets[key] || 0) + 1
  }

  const sorted = Object.entries(colorBuckets).sort((a, b) => b[1] - a[1])
  const dominantColors = sorted.slice(0, 3).map(([key, count]) => {
    const [r, g, b] = key.split(',').map(Number)
    return { hex: toHex(r, g, b), ratio: Math.round((count / totalPx) * 100) }
  })

  const avgR = Math.round(sumR / totalPx)
  const avgG = Math.round(sumG / totalPx)
  const avgB = Math.round(sumB / totalPx)
  const avgHex = toHex(avgR, avgG, avgB)
  const avgLum = (avgR * 299 + avgG * 587 + avgB * 114) / 1000

  const bgColor = dominantColors[0]?.hex || avgHex
  const fgColor = dominantColors[1]?.hex || (avgLum > 128 ? '#333333' : '#ffffff')

  const minDim = Math.min(w, h)
  const estimatedRadius = minDim < 30 ? 4 : minDim < 60 ? 8 : minDim < 120 ? 12 : 16

  return {
    dominantColors,
    avgColor: avgHex,
    avgLum,
    bgColor,
    fgColor,
    estimatedRadius,
    width: Math.round(w),
    height: Math.round(h),
    aspectRatio: Math.round((w / h) * 100) / 100,
    inferredSize: w * h < 1500 ? 'xs' : w * h < 4000 ? 'sm' : w * h < 10000 ? 'md' : w * h < 25000 ? 'lg' : 'xl',
    inferredVariant: null,
  }
}

function toHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.min(255, v).toString(16).padStart(2, '0'))
      .join('')
  )
}

function redrawCanvas(canvas, dx, dy) {
  const img = new Image()
  img.onload = () => {
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // Draw existing annotations
    pipelineStore.annotations.forEach((a) => {
      ctx.fillStyle = ha(a.color, 0.15)
      ctx.fillRect(a.x, a.y, a.w, a.h)
      ctx.strokeStyle = ha(a.color, 0.7)
      ctx.lineWidth = 2
      ctx.setLineDash([4, 3])
      ctx.strokeRect(a.x, a.y, a.w, a.h)
      ctx.setLineDash([])

      const lw = ctx.measureText(a.label).width + 8
      ctx.fillStyle = ha(a.color, 0.75)
      ctx.font = 'bold 11px sans-serif'
      ctx.fillRect(a.x, a.y - 16, lw, 16)
      ctx.fillStyle = '#fff'
      ctx.fillText(a.label, a.x + 4, a.y - 4)
    })

    // Draw in-progress rectangle
    if (drawing.value && dx !== undefined && activeType.value) {
      ctx.fillStyle = ha(activeType.value.color, 0.08)
      ctx.fillRect(sx.value, sy.value, dx - sx.value, dy - sy.value)
      ctx.strokeStyle = ha(activeType.value.color, 0.5)
      ctx.lineWidth = 2
      ctx.setLineDash([5, 3])
      ctx.strokeRect(sx.value, sy.value, dx - sx.value, dy - sy.value)
      ctx.setLineDash([])
    }
  }
  img.src = pipelineStore.imgDataUrl
}

function selectType(typeObj) {
  activeType.value = typeObj
  document.querySelectorAll('.type-btn').forEach((el) => el.classList.remove('selected'))
  const btn = document.querySelector(`[data-type="${typeObj.id}"]`)
  if (btn) btn.classList.add('selected')
}

function removeAnnotation(id) {
  pipelineStore.removeAnnotation(id)
  redrawCanvas(canvasRef.value)
}

function clearAnnotations() {
  pipelineStore.clearAnnotations()
  redrawCanvas(canvasRef.value)
}
</script>

<template>
  <div style="max-width: 1200px; margin: 0 auto">
    <div style="margin-bottom: 14px">
      <h1 style="font-size: 26px; font-weight: 700; color: #111">
        {{ t(I.s5.title) }}
      </h1>
      <p style="color: #888; font-size: 15px; margin-top: 4px">
        {{ t(I.s5.desc) }}
      </p>
      <p style="color: #bbb; font-size: 11px; margin-top: 6px; font-style: italic">
        {{ t(I.s5.disclaimer) }}
      </p>
    </div>

    <!-- Mobile: skip annotation entirely -->
    <div v-if="isMobile" style="text-align: center; padding: 40px 20px;">
      <div style="font-size: 40px; margin-bottom: 16px; opacity: 0.2;">
        <i class="fa-duotone fa-thin fa-display"></i>
      </div>
      <p style="font-size: 15px; color: #888; margin-bottom: 8px;">
        {{ t({ zh: '元件標注需要在電腦上操作', en: 'Annotation requires a desktop browser', ja: 'コンポーネント注釈にはPC版ブラウザが必要です' }) }}
      </p>
      <p style="font-size: 13px; color: #bbb;">
        {{ t({ zh: '略過此步驟將產出全部 25 種元件', en: 'Skipping will generate all 25 component types', ja: 'スキップすると全25コンポーネントが生成されます' }) }}
      </p>
    </div>

    <!-- Desktop: full annotation UI -->
    <template v-if="!isMobile">

    <!-- Component Type Selector — Desktop: inline wrap / Mobile: accordion -->
    <div
      class="type-panel"
      style="
        background: #fff;
        border-radius: 12px;
        border: 1px solid #e8e8e8;
        padding: 10px 14px;
        margin-bottom: 14px;
      "
    >
      <!-- Desktop: flat list -->
      <div v-if="!isMobile" style="display: flex; gap: 6px; flex-wrap: wrap">
        <template v-for="(category, catIdx) in COMP_TYPES" :key="catIdx">
          <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0">
            <span
              :style="{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: category.color,
                marginRight: '2px',
                whiteSpace: 'nowrap',
              }"
            >
              {{ category.cat.toUpperCase() }}
            </span>
            <button
              v-for="item in category.items"
              :key="item.id"
              :data-type="item.id"
              class="type-btn"
              @click="selectType({ id: item.id, label: item.label, color: category.color })"
              :style="{
                '--tc': category.color,
                '--tc-alpha': ha(category.color, 0.12),
                whiteSpace: 'nowrap',
                padding: '5px 10px',
                fontSize: '12px',
                border: '1px solid var(--tc-alpha)',
                borderRadius: '6px',
                background: 'transparent',
                color: 'var(--tc)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }"
            >
              <i :class="'fa-duotone fa-thin ' + item.fa" style="opacity: 0.5; margin-right: 4px; font-size: 11px;"></i>
              <span>{{ item.label }}</span>
            </button>
          </div>
          <div
            v-if="catIdx < COMP_TYPES.length - 1"
            style="width: 1px; height: 20px; background: #e8e8e8; margin: 0 6px; flex-shrink: 0;"
          />
        </template>
      </div>

      <!-- Mobile: accordion -->
      <div v-else style="display: flex; flex-direction: column; gap: 4px;">
        <div v-for="(category, catIdx) in COMP_TYPES" :key="catIdx">
          <button
            @click="toggleCat(catIdx)"
            class="cat-toggle"
            :style="{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '8px 4px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderBottom: expandedCat === catIdx ? '1px solid #eee' : 'none',
            }"
          >
            <span
              :style="{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: category.color,
              }"
            >
              {{ category.cat.toUpperCase() }}
              <span style="font-weight: 400; color: #bbb; margin-left: 4px;">{{ category.items.length }}</span>
            </span>
            <i
              class="fa-duotone fa-thin fa-chevron-down"
              :style="{
                fontSize: '10px',
                color: '#bbb',
                transition: 'transform 0.2s',
                transform: expandedCat === catIdx ? 'rotate(180deg)' : 'none',
              }"
            ></i>
          </button>
          <div
            v-show="expandedCat === catIdx"
            style="display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 0 4px;"
          >
            <button
              v-for="item in category.items"
              :key="item.id"
              :data-type="item.id"
              class="type-btn"
              @click="selectType({ id: item.id, label: item.label, color: category.color })"
              :style="{
                '--tc': category.color,
                '--tc-alpha': ha(category.color, 0.12),
                padding: '5px 10px',
                fontSize: '12px',
                border: '1px solid var(--tc-alpha)',
                borderRadius: '6px',
                background: 'transparent',
                color: 'var(--tc)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }"
            >
              <i :class="'fa-duotone fa-thin ' + item.fa" style="opacity: 0.5; margin-right: 4px; font-size: 11px;"></i>
              <span>{{ item.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Canvas -->
    <div
      style="
        background: #f0f0f0;
        border-radius: 14px;
        overflow: hidden;
        position: relative;
        min-height: 400px;
        display: flex;
        align-items: center;
        justify-content: center;
      "
    >
      <canvas ref="canvasRef" style="display: block; max-width: 100%; height: auto" />
      <div
        id="canvas-hint"
        :style="{
          position: 'absolute',
          inset: 0,
          display: activeType ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }"
      >
        <div style="text-align: center; color: rgba(0, 0, 0, 0.15)">
          <div style="font-size: 28px; margin-bottom: 6px">↑</div>
          <div style="font-size: 14px">{{ t(I.s5.hint) }}</div>
        </div>
      </div>
    </div>

    <!-- Annotations List -->
    <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px">
      <template v-if="pipelineStore.annotations.length === 0">
        <span style="font-size: 11px; color: #bbb; font-style: italic">
          {{ t(I.s5.none) }}
        </span>
      </template>
      <template v-else>
        <span
          v-for="anno in pipelineStore.annotations"
          :key="anno.id"
          class="anno-tag"
          :style="{
            background: ha(anno.color, 0.1),
            color: anno.color,
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }"
          @click="removeAnnotation(anno.id)"
        >
          <img
            v-if="anno.visual?.thumbnail"
            :src="anno.visual.thumbnail"
            style="
              width: 28px;
              height: 20px;
              border-radius: 3px;
              object-fit: cover;
              vertical-align: middle;
              margin-right: 4px;
              border: 1px solid rgba(0, 0, 0, 0.1);
            "
            alt="annotation"
          />
          <span
            v-if="anno.visual?.bgColor"
            :style="{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: anno.visual.bgColor,
              border: '1px solid rgba(0, 0, 0, 0.15)',
              verticalAlign: 'middle',
              marginRight: '2px',
            }"
          />
          {{ anno.label }}
          <span v-if="anno.visual?.inferredSize" style="font-size: 9px; opacity: 0.5; margin-left: 2px">
            {{ anno.visual.inferredSize.toUpperCase() }}
          </span>
          <span v-if="anno.visual?.inferredVariant" style="font-size: 9px; opacity: 0.6; margin-left: 3px; font-style: italic">
            {{ anno.visual.inferredVariant }}
          </span>
          <i class="fa-duotone fa-thin fa-xmark" style="margin-left:3px;font-size:10px;"></i>
        </span>
      </template>
    </div>

    </template><!-- end desktop annotation UI -->
  </div>
</template>

<style scoped>
.type-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.type-btn:hover {
  background-color: var(--tc-alpha);
}

.type-btn.selected {
  background-color: var(--tc-alpha);
  font-weight: 600;
}

.anno-tag:hover {
  opacity: 0.8;
}
</style>
