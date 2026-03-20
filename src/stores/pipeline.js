/**
 * Pipeline Store
 * Manages the wizard state and flow through the image-to-UI generation pipeline
 * - Step navigation (1 → 2 → 3 → 5 → 6 → 7)
 * - Image upload and processing
 * - Color extraction and palette management
 * - Annotation tracking
 * - Design system building
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  STEP_MAP,
  SLOT_IDS,
} from '../data/constants.js';
import { autoAssignSlots } from '../services/autoAssignSlots.js';
import { buildDS } from '../services/dsBuilder.js';
import { deriveThemePair } from '../services/deriveThemePair.js';
import { useSettingsStore } from './settings.js';

export const usePipelineStore = defineStore('pipeline', () => {
  // State
  const step = ref(1); // Current wizard step (1, 2, 3, 5, 6, 7)
  const imgDataUrl = ref(null); // Data URL of uploaded image
  const imgAvgLum = ref(128); // Average luminance of image
  const extractedColors = ref([]); // Colors extracted from image
  const colorSlots = ref({}); // Backward-compatible: points to active theme's slots
  const colorRoles = ref({}); // Legacy compatibility: color index → role
  const DS = ref({}); // Backward-compatible: points to active theme's DS
  const lightColorSlots = ref({}); // Light theme color slots
  const darkColorSlots = ref({}); // Dark theme color slots
  const DS_light = ref({}); // Light design system
  const DS_dark = ref({}); // Dark design system
  const activeTheme = ref('light'); // 'light' | 'dark'
  const annotations = ref([]); // Array of annotation objects
  const activeType = ref(null); // Currently selected component type for annotation
  const drawing = ref(false); // Whether user is drawing annotation
  const sx = ref(0); // Selection start x
  const sy = ref(0); // Selection start y
  const analysisLog = ref([]); // Log of analysis steps
  const detectedFonts = ref([]); // Fonts detected from image via AI
  const holisticResult = ref(null); // Holistic design analysis from AI
  const imageKey = ref(''); // R2 image key after upload
  const sessionToken = ref(''); // Session token from worker (issued on upload)
  const currentDesignId = ref(''); // D1 design_tokens.id after save
  const uiKitName = ref('img2ui UI Kit'); // Editable UI Kit name for cover hero
  const showDevCompare = ref(false); // Dev-only: model comparison overlay

  /**
   * Navigate to a specific step
   * @param {number} n - Step number (1, 2, 3, 5, 6, or 7)
   */
  function showStep(n) {
    if (STEP_MAP.includes(n)) {
      step.value = n;
    }
  }

  /**
   * Handle next button — validates current step and advances
   */
  function handleNext() {
    if (!canGoNext.value) return;

    if (step.value === 1) {
      // Email gate and image validation done before this
      // Just transition to step 2
      showStep(2);
    } else if (step.value === 2 && extractedColors.value.length > 0) {
      // After color extraction, show color tuning
      showStep(3);
    } else if (step.value === 3) {
      // After color tuning, build DS and go to annotation
      buildDS_action();
      showStep(5);
    } else if (step.value === 5) {
      // After annotation (optional), start processing
      showStep(6);
    }
  }

  /**
   * Navigate to previous step
   */
  function prevStep() {
    if (step.value <= 1) return;

    // Map backward with removed step 4 in mind
    if (step.value === 7) {
      showStep(5); // results → annotations
    } else if (step.value === 6) {
      showStep(5); // processing → annotations
    } else if (step.value === 5) {
      showStep(3); // annotations → color (skip removed step 4)
    } else {
      showStep(step.value - 1);
    }
  }

  /**
   * Reset entire pipeline state
   */
  function restartPipeline() {
    step.value = 1;
    imgDataUrl.value = null;
    extractedColors.value = [];
    detectedFonts.value = [];
    holisticResult.value = null;
    DS.value = {};
    DS_light.value = {};
    DS_dark.value = {};
    lightColorSlots.value = {};
    darkColorSlots.value = {};
    activeTheme.value = 'light';
    annotations.value = [];
    activeType.value = null;
    imgAvgLum.value = 128;
    colorRoles.value = {};
    colorSlots.value = {};
    analysisLog.value = [];
    imageKey.value = '';
    sessionToken.value = '';
    uiKitName.value = 'img2ui UI Kit';
  }

  /**
   * Navigate back from results to edit colors or annotations
   * @param {string} target - 'colors' or 'annotations'
   */
  function editFromResult(target) {
    if (target === 'colors') {
      showStep(3);
    } else if (target === 'annotations') {
      showStep(5);
    }
  }

  /**
   * Set uploaded image data URL and file name
   * @param {string} dataUrl - Base64 data URL
   * @param {string} fileName - File name (for display)
   */
  function setUploadedImage(dataUrl, fileName) {
    imgDataUrl.value = dataUrl;
  }

  /**
   * Set uploaded image data URL
   * @param {string} dataUrl - Base64 data URL
   */
  function setImage(dataUrl) {
    imgDataUrl.value = dataUrl;
  }

  /**
   * Upload reference property for template compatibility
   */
  const uploadedImage = computed(() => imgDataUrl.value);

  /**
   * Set extracted colors from image analysis
   * @param {Array} colors - Array of color objects {hex, r, g, b, lum, ratio}
   */
  function setExtractedColors(colors) {
    extractedColors.value = colors || [];
  }

  /**
   * Auto-assign extracted colors to brand slots, then derive Light/Dark palettes
   */
  function autoAssignSlots_action() {
    if (extractedColors.value.length === 0) return;

    const { brand } = autoAssignSlots(extractedColors.value);
    const themes = deriveThemePair(brand);
    lightColorSlots.value = themes.light;
    darkColorSlots.value = themes.dark;

    // Initialize activeTheme from image luminance
    activeTheme.value = imgAvgLum.value < 128 ? 'dark' : 'light';

    // Backward-compatible aliases
    colorSlots.value = activeTheme.value === 'dark' ? themes.dark : themes.light;

    // Legacy compatibility: track which color indices have roles
    colorRoles.value = {};
    const priIdx = extractedColors.value.findIndex(
      (c) => c.hex === brand.primary
    );
    if (priIdx >= 0) colorRoles.value[priIdx] = 'primary';

    const secIdx = extractedColors.value.findIndex(
      (c) => c.hex === brand.secondary
    );
    if (secIdx >= 0) colorRoles.value[secIdx] = 'secondary';
  }

  /**
   * Update a color in the extracted palette
   * @param {number} idx - Index in extractedColors array
   * @param {string} hex - New hex color
   */
  function updateColor(idx, hex) {
    if (idx < 0 || idx >= extractedColors.value.length) return;

    // Update the color
    const oldHex = extractedColors.value[idx].hex;
    extractedColors.value[idx].hex = hex;

    // Update any slots that reference this color
    Object.keys(colorSlots.value).forEach((slotId) => {
      if (colorSlots.value[slotId] === oldHex) {
        colorSlots.value[slotId] = hex;
      }
    });
  }

  /**
   * Add a new color to the palette
   */
  function addColor() {
    const newColor = {
      hex: '#cccccc',
      r: 204,
      g: 204,
      b: 204,
      lum: 204,
      ratio: 0.05,
    };
    extractedColors.value.push(newColor);
  }

  /**
   * Remove a color from the palette
   * @param {number} idx - Index to remove
   */
  function removeColor(idx) {
    if (idx < 0 || idx >= extractedColors.value.length) return;
    if (extractedColors.value.length <= 3) return; // Keep minimum colors

    extractedColors.value.splice(idx, 1);
  }

  /**
   * Update a semantic color slot
   * @param {string} slotId - Slot identifier (e.g., 'primary', 'secondary')
   * @param {string} hex - Hex color value
   */
  function updateSlot(slotId, hex) {
    if (SLOT_IDS.includes(slotId)) {
      colorSlots.value[slotId] = hex;
    }
  }

  /**
   * Build both Light and Dark design systems from current state
   */
  function buildDS_action() {
    DS_light.value = buildDS(
      lightColorSlots.value,
      extractedColors.value,
      imgAvgLum.value,
      null,
      detectedFonts.value,
      false // forceIsDark=false for Light
    );
    DS_light.value.name = uiKitName.value;
    DS_dark.value = buildDS(
      darkColorSlots.value,
      extractedColors.value,
      imgAvgLum.value,
      null,
      detectedFonts.value,
      true // forceIsDark=true for Dark
    );
    DS_dark.value.name = uiKitName.value;
    // Backward-compatible alias
    DS.value = activeTheme.value === 'dark' ? DS_dark.value : DS_light.value;
  }

  /**
   * Add annotation to the list
   * @param {Object} anno - Annotation object {id, type, x, y, width, height, ...}
   */
  function addAnnotation(anno) {
    if (!anno.id) {
      anno.id = 'anno_' + Date.now() + '_' + Math.random();
    }
    annotations.value.push(anno);
  }

  /**
   * Remove annotation by id
   * @param {string} id - Annotation id
   */
  function removeAnnotation(id) {
    const idx = annotations.value.findIndex((a) => a.id === id);
    if (idx >= 0) {
      annotations.value.splice(idx, 1);
    }
  }

  /**
   * Clear all annotations
   */
  function clearAnnotations() {
    annotations.value = [];
  }

  /**
   * Set active component type for annotation
   * @param {string} type - Component type id
   */
  function setActiveType(type) {
    activeType.value = type;
  }

  /**
   * Set drawing state
   * @param {boolean} isDrawing - Whether user is drawing
   */
  function setDrawing(isDrawing) {
    drawing.value = isDrawing;
  }

  /**
   * Set selection start coordinates
   * @param {number} x - Start x
   * @param {number} y - Start y
   */
  function setSelectionStart(x, y) {
    sx.value = x;
    sy.value = y;
  }

  /**
   * Add log entry to analysis log
   * @param {string} message - Log message
   */
  function addLog(message) {
    analysisLog.value.push({
      timestamp: new Date().toISOString(),
      message,
    });
  }

  // Computed properties

  /**
   * Active design system based on activeTheme
   */
  const activeDS = computed(() => {
    return activeTheme.value === 'dark' ? DS_dark.value : DS_light.value;
  });

  /**
   * Active color slots based on activeTheme
   */
  const activeColorSlots = computed(() => {
    return activeTheme.value === 'dark' ? darkColorSlots.value : lightColorSlots.value;
  });

  /**
   * Current step index in STEP_MAP
   */
  const currentStepIndex = computed(() => {
    return STEP_MAP.indexOf(step.value);
  });

  /**
   * Whether we can proceed to next step (validation)
   */
  const canGoNext = computed(() => {
    if (step.value === 1) {
      // Need image on step 1 (email validation happens in UI)
      return imgDataUrl.value !== null;
    } else if (step.value === 2) {
      // Need colors extracted on step 2
      return extractedColors.value.length > 0;
    } else if (step.value === 3) {
      // Always can proceed from color tuning
      return true;
    } else if (step.value === 5) {
      // Always can proceed from annotation (it's optional)
      return true;
    } else if (step.value === 6) {
      // Can't advance from processing step
      return false;
    }
    return false;
  });

  /**
   * Number of annotations
   */
  const annotationCount = computed(() => annotations.value.length);

  /**
   * Whether there are any annotations
   */
  const hasAnnotations = computed(() => annotations.value.length > 0);

  /**
   * Skip annotations: build DS and go straight to processing (step 6)
   */
  function skipToProcessing() {
    buildDS_action();
    showStep(6);
  }

  /**
   * Advance to next step
   */
  function nextStep() {
    if (step.value === 1) {
      showStep(2);
    } else if (step.value === 2) {
      showStep(3);
    } else if (step.value === 3) {
      showStep(5);
    } else if (step.value === 5) {
      showStep(6);
    } else if (step.value === 6) {
      showStep(7);
    }
  }

  /**
   * Set email (for compatibility with StepUpload)
   */
  function setEmail(emailVal) {
    const settingsStore = useSettingsStore()
    settingsStore.setEmail(emailVal)
  }

  return {
    // State
    step,
    imgDataUrl,
    imgAvgLum,
    extractedColors,
    colorSlots,
    colorRoles,
    DS,
    lightColorSlots,
    darkColorSlots,
    DS_light,
    DS_dark,
    activeTheme,
    annotations,
    activeType,
    drawing,
    sx,
    sy,
    analysisLog,
    detectedFonts,
    holisticResult,
    imageKey,
    sessionToken,
    currentDesignId,
    uiKitName,
    showDevCompare,
    uploadedImage,

    // Actions
    showStep,
    handleNext,
    prevStep,
    restartPipeline,
    editFromResult,
    setUploadedImage,
    setImage,
    setExtractedColors,
    autoAssignSlots: autoAssignSlots_action,
    updateColor,
    addColor,
    removeColor,
    updateSlot,
    buildDS: buildDS_action,
    addAnnotation,
    removeAnnotation,
    clearAnnotations,
    setActiveType,
    setDrawing,
    setSelectionStart,
    addLog,
    nextStep,
    skipToProcessing,
    setEmail,

    // Computed
    activeDS,
    activeColorSlots,
    currentStepIndex,
    canGoNext,
    annotationCount,
    hasAnnotations,
  };
});
