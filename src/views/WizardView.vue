<script setup>
import { computed } from 'vue'
import { usePipelineStore } from '../stores/pipeline'
import WizardBar from '../components/ui/WizardBar.vue'
import ActionFooter from '../components/ui/ActionFooter.vue'
import StepUpload from '../components/steps/StepUpload.vue'
import StepScan from '../components/steps/StepScan.vue'
import StepColors from '../components/steps/StepColors.vue'
import StepAnnotate from '../components/steps/StepAnnotate.vue'
import StepProcessing from '../components/steps/StepProcessing.vue'
import StepResult from '../components/steps/StepResult.vue'
import DevModelCompare from '../components/steps/DevModelCompare.vue'

const pipelineStore = usePipelineStore()
const currentStep = computed(() => pipelineStore.step)
const isDev = import.meta.env.DEV
</script>

<template>
  <WizardBar v-if="currentStep !== 1" />

  <main style="flex:1;padding:36px 28px;overflow:auto;background:#fafafa;">
    <StepUpload v-if="currentStep === 1" />
    <StepScan v-if="currentStep === 2" />
    <StepColors v-if="currentStep === 3" />
    <StepAnnotate v-if="currentStep === 5" />
    <StepProcessing v-if="currentStep === 6" />
    <StepResult v-if="currentStep === 7" />
  </main>

  <ActionFooter />

  <DevModelCompare v-if="isDev && pipelineStore.showDevCompare" @close="pipelineStore.showDevCompare = false" />
</template>
