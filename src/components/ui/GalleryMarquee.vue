<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../../stores/settings'
import GalleryCard from './GalleryCard.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
const items = ref([])
const loaded = ref(false)

// Duplicate for seamless infinite loop
const loopItems = computed(() => items.value.length > 0 ? [...items.value, ...items.value] : [])

// Dynamic animation duration: more items = slower scroll to keep consistent speed
const animDuration = computed(() => Math.max(30, items.value.length * 5) + 's')

onMounted(async () => {
  const apiBase = import.meta.env.VITE_API_BASE || ''
  if (!apiBase) return
  try {
    const hdrs = {}
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_KEY) hdrs['x-dev-key'] = import.meta.env.VITE_DEV_BYPASS_KEY
    const resp = await fetch(`${apiBase}/api/gallery?limit=20&sort=latest`, { headers: hdrs })
    if (resp.ok) {
      const data = await resp.json()
      items.value = data.items || []
    }
  } catch { /* silent */ }
  loaded.value = true
})

function goToGallery() {
  router.push('/gallery')
}
</script>

<template>
  <div v-if="loaded && items.length > 0" class="marquee-section">
    <div class="marquee-header">
      <span class="marquee-title">
        <i class="fa-duotone fa-thin fa-sparkles" style="font-size:12px;margin-right:4px;"></i>
        {{ settingsStore.lang === 'zh' ? '社群作品' : settingsStore.lang === 'ja' ? 'コミュニティ作品' : 'Community Designs' }}
      </span>
      <button class="marquee-link" @click="goToGallery">
        {{ settingsStore.lang === 'zh' ? '查看 Gallery' : settingsStore.lang === 'ja' ? 'ギャラリーを見る' : 'View Gallery' }}
        <i class="fa-duotone fa-thin fa-arrow-right" style="font-size:10px;"></i>
      </button>
    </div>
    <div class="marquee-track">
      <div class="marquee-inner" :style="{ animationDuration: animDuration }">
        <div v-for="(item, i) in loopItems" :key="i" class="marquee-card-wrap">
          <GalleryCard :item="item" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.marquee-section {
  margin-top: 36px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}
.marquee-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.marquee-title {
  font-size: 12px;
  font-weight: 600;
  color: #888;
  letter-spacing: .04em;
}
.marquee-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #888;
  background: none;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  transition: all .15s;
}
.marquee-link:hover {
  color: #555;
  border-color: #ccc;
  background: #f9f9f9;
}

.marquee-track {
  overflow: hidden;
  mask-image: linear-gradient(to right, transparent, black 3%, black 97%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 3%, black 97%, transparent);
}
.marquee-inner {
  display: flex;
  gap: 16px;
  animation: marquee-scroll linear infinite;
  width: max-content;
}
.marquee-track:hover .marquee-inner {
  animation-play-state: paused;
}

@keyframes marquee-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.marquee-card-wrap {
  flex-shrink: 0;
  width: 270px;
}

@media (max-width: 640px) {
  .marquee-card-wrap {
    width: 75vw;
  }
}
</style>
