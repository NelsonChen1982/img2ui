<script setup>
import { computed } from 'vue'
import { usePipelineStore } from '../../stores/pipeline'
import { useSettingsStore } from '../../stores/settings'
import { I } from '../../data/i18n'
import { STEP_MAP } from '../../data/constants'

const pipelineStore = usePipelineStore()
const settingsStore = useSettingsStore()

const currentStep = computed(() => pipelineStore.step)

// Map step numbers to wizard positions (1,2,3,skip 4,5,6,7)
function getWizardIndex(stepNum) {
  const stepArray = [1, 2, 3, 5, 6, 7]
  return stepArray.indexOf(stepNum)
}

const wizardIndex = computed(() => getWizardIndex(currentStep.value))

// Get step label by number — use current language
function getStepLabel(stepNum) {
  const labels = I.steps[settingsStore.lang] || I.steps.en
  const stepArray = [1, 2, 3, 5, 6, 7]
  const idx = stepArray.indexOf(stepNum)
  return labels[idx] || ''
}

// Check if a step is completed (earlier than current)
function isStepCompleted(stepNum) {
  const stepArray = [1, 2, 3, 5, 6, 7]
  const currentIdx = stepArray.indexOf(currentStep.value)
  const checkIdx = stepArray.indexOf(stepNum)
  return checkIdx < currentIdx
}

// Check if a step is current
function isStepCurrent(stepNum) {
  return currentStep.value === stepNum
}
</script>

<template>
  <div class="wiz-bar" style="padding-bottom:10px;">
    <template v-for="(step, idx) in [1, 2, 3, 5, 6, 7]" :key="step">
      <!-- Step circle + label -->
      <div class="wiz-step">
        <div
          class="wiz-num"
          :style="{
            background: isStepCurrent(step) ? '#222' : isStepCompleted(step) ? '#222' : '#f0f0f0',
            color: isStepCurrent(step) || isStepCompleted(step) ? '#fff' : '#999'
          }"
        >
          <i v-if="isStepCompleted(step)" class="fa-duotone fa-thin fa-check" style="font-size:10px;"></i>
          <span v-else>{{ idx + 1 }}</span>
        </div>
        <div class="wiz-label" :style="{ color: isStepCurrent(step) ? '#222' : '#999' }">
          {{ getStepLabel(step) }}
        </div>
      </div>

      <!-- Line between steps (except after last) -->
      <div
        v-if="idx < 5"
        class="wiz-line"
        :class="{ done: isStepCompleted(STEP_MAP[idx + 1]) }"
      ></div>
    </template>
  </div>
</template>
