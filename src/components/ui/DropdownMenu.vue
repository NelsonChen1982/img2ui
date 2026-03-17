<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineProps({
  items: {
    type: Array,
    required: true
    // Each item: { value, label, icon? }
  },
  modelValue: {
    type: String,
    required: true
  },
  trigger: {
    type: String,
    default: 'Click to select'
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)

function toggleDropdown(event) {
  event.stopPropagation()
  isOpen.value = !isOpen.value
}

function selectItem(value) {
  emit('update:modelValue', value)
  isOpen.value = false
}

function closeDropdown() {
  isOpen.value = false
}

// Close dropdown when clicking outside
onMounted(() => {
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>

<template>
  <div class="lang-dropdown" @click.stop>
    <!-- Trigger button -->
    <button class="lang-toggle" @click="toggleDropdown">
      <slot name="trigger">
        <span v-for="item in items" :key="item.value" v-show="item.value === modelValue">
          <span v-if="item.icon" style="font-size:12px;">{{ item.icon }}</span>
          <span style="font-size:10px;">{{ item.label }}</span>
        </span>
      </slot>
      <span style="font-size:8px;opacity:.5;">▼</span>
    </button>

    <!-- Dropdown menu -->
    <div class="lang-menu" :class="{ open: isOpen }">
      <div
        v-for="item in items"
        :key="item.value"
        class="lang-menu-item"
        :class="{ active: item.value === modelValue }"
        @click="selectItem(item.value)"
      >
        <span v-if="item.icon">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>
