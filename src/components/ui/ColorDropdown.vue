<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { isLight } from '../../services/colorUtils'

const props = defineProps({
  modelValue: { type: String, default: '#cccccc' },
  options: { type: Array, default: () => [] }, // [{hex, label?}]
  allowCustom: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const dropdownRef = ref(null)
const colorInputRef = ref(null)

function toggle() {
  open.value = !open.value
}

function select(hex) {
  emit('update:modelValue', hex)
  open.value = false
}

function openCustomPicker() {
  open.value = false
  if (colorInputRef.value) {
    colorInputRef.value.click()
  }
}

function onCustomChange(e) {
  emit('update:modelValue', e.target.value)
}

function onClickOutside(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    open.value = false
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside, true)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside, true)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="dropdownRef" class="cd-root">
    <!-- Trigger -->
    <button
      class="cd-trigger"
      @click="toggle"
      type="button"
    >
      <span
        class="cd-swatch"
        :style="{ background: modelValue }"
      ></span>
      <span class="cd-hex">{{ modelValue }}</span>
      <span class="cd-arrow">▾</span>
    </button>

    <!-- Hidden native color picker -->
    <input
      v-if="allowCustom"
      ref="colorInputRef"
      type="color"
      :value="modelValue"
      @input="onCustomChange"
      class="cd-hidden-input"
    />

    <!-- Dropdown menu -->
    <div v-if="open" class="cd-menu">
      <button
        v-for="opt in options"
        :key="opt.hex"
        class="cd-option"
        :class="{ 'cd-option--active': opt.hex === modelValue }"
        @click="select(opt.hex)"
        type="button"
      >
        <span
          class="cd-swatch"
          :style="{ background: opt.hex }"
        ></span>
        <span class="cd-opt-hex">{{ opt.hex }}</span>
        <span
          v-if="opt.hex === modelValue"
          class="cd-check"
          :style="{ color: isLight(opt.hex) ? '#333' : '#fff' }"
        >✓</span>
      </button>

      <button
        v-if="allowCustom"
        class="cd-option cd-option--custom"
        @click="openCustomPicker"
        type="button"
      >
        <span class="cd-custom-icon">✎</span>
        <span class="cd-opt-hex">Custom</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.cd-root {
  position: relative;
  display: inline-block;
  width: 100%;
}

.cd-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  font-family: monospace;
  color: #555;
  transition: border-color 0.15s;
}

.cd-trigger:hover {
  border-color: #bbb;
}

.cd-swatch {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.cd-hex {
  flex: 1;
  text-align: left;
}

.cd-arrow {
  font-size: 10px;
  color: #999;
}

.cd-hidden-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.cd-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 100;
  max-height: 260px;
  overflow-y: auto;
  padding: 4px;
}

.cd-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-family: monospace;
  color: #555;
  transition: background 0.12s;
}

.cd-option:hover {
  background: #f5f5f5;
}

.cd-option--active {
  background: #f0f0f0;
}

.cd-opt-hex {
  flex: 1;
  text-align: left;
}

.cd-check {
  font-size: 11px;
  font-weight: 700;
}

.cd-option--custom {
  border-top: 1px solid #eee;
  margin-top: 2px;
  padding-top: 8px;
}

.cd-custom-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #999;
  border: 1px dashed #ccc;
  border-radius: 5px;
  flex-shrink: 0;
}

/* Mobile: larger touch targets */
@media (max-width: 768px) {
  .cd-trigger {
    padding: 10px 12px;
    min-height: 44px;
  }

  .cd-option {
    padding: 10px 12px;
    min-height: 44px;
  }

  .cd-swatch {
    width: 24px;
    height: 24px;
  }
}
</style>
