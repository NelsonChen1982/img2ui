<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { usePipelineStore } from '../../stores/pipeline'
import { useSettingsStore } from '../../stores/settings'
import { I } from '../../data/i18n'
import { extractColors } from '../../services/colorExtraction'

const pipelineStore = usePipelineStore()
const settingsStore = useSettingsStore()

const tasks = ref([])
const checkedTasks = ref(0)
const timers = ref([])

function t(obj) {
  if (!obj) return ''
  return obj[settingsStore.lang] || obj.en || ''
}

onMounted(() => {
  startAnalysis()
})

function startAnalysis() {
  const taskList = I.s2.tasks[settingsStore.lang] || []
  tasks.value = taskList.map((task, index) => ({
    ...task,
    id: index,
    completed: false,
  }))

  // Animate task completion with evenly spaced delays (3 tasks over ~3s)
  const totalDuration = 3000
  const interval = totalDuration / taskList.length
  taskList.forEach((task, index) => {
    const id = setTimeout(() => {
      completeTask(index)
    }, interval * (index + 1))
    timers.value.push(id)
  })

  // Extract colors and auto-assign
  extractColors(pipelineStore.imgDataUrl, (colors, avgLum) => {
    pipelineStore.setExtractedColors(colors)
    pipelineStore.imgAvgLum = avgLum
  })

  // After all tasks complete, move to step 3
  const finalId = setTimeout(() => {
    pipelineStore.autoAssignSlots()
    pipelineStore.showStep(3)
  }, totalDuration + 600)
  timers.value.push(finalId)
}

function clearTimers() {
  timers.value.forEach(id => clearTimeout(id))
  timers.value = []
}

onUnmounted(clearTimers)

function completeTask(index) {
  if (index >= 0 && index < tasks.value.length) {
    tasks.value[index].completed = true
    checkedTasks.value = tasks.value.filter((t) => t.completed).length
  }
}
</script>

<template>
  <div style="max-width: 760px; margin: 0 auto">
    <h1 style="font-size: 26px; font-weight: 700; color: #111; margin-bottom: 6px">
      {{ t(I.s2.title) }}
    </h1>
    <p style="color: #888; font-size: 15px; margin-bottom: 28px">
      {{ t(I.s2.desc) }}
    </p>

    <!-- Task checklist (top) -->
    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
      <div
        v-for="task in tasks"
        :key="task.id"
        :style="{
          background: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: '10px',
          padding: '10px 12px',
          opacity: task.completed ? 1 : 0.2,
          transition: 'all 0.5s',
        }"
        :class="{ 'fade-up': task.completed }"
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
          <div>
            <div style="font-size: 13px; font-weight: 600; color: #333">{{ task.l }}</div>
            <div style="font-size: 11px; color: #aaa">{{ task.s }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Image preview with scan-line animation (bottom) -->
    <div
      style="
        border-radius: 14px;
        overflow: hidden;
        position: relative;
        background: #f0f0f0;
        max-height: 360px;
      "
    >
      <img
        v-if="pipelineStore.imgDataUrl"
        :src="pipelineStore.imgDataUrl"
        style="width: 100%; object-fit: cover; opacity: 0.8; max-height: 360px"
        alt="scanning"
      />
      <div style="position: absolute; inset: 0; background: rgba(0, 0, 0, 0.02)">
        <div class="scan-line"></div>
      </div>
      <div
        id="scan-status"
        style="
          position: absolute;
          bottom: 10px;
          left: 10px;
          font-size: 11px;
          font-family: monospace;
          color: rgba(0, 0, 0, 0.3);
        "
      >
        {{ t(I.s2.scanning) }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.scan-line {
  position: absolute;
  top: -50%;
  left: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0),
    rgba(0, 0, 0, 0.08),
    rgba(0, 0, 0, 0)
  );
  animation: scanDown 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes scanDown {
  0% {
    top: -50%;
  }
  50% {
    top: 0%;
  }
  100% {
    top: 100%;
  }
}

.fade-up {
  animation: fadeUp 0.5s ease-out;
}

@keyframes fadeUp {
  from {
    opacity: 0.2;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
