<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useScanner } from '../composables/useScanner'

const emit = defineEmits<{ detect: [code: string] }>()
const video = ref<HTMLVideoElement | null>(null)
const { start, stop, toggleTorch, running, torchOn, supportsTorch, error } = useScanner()

onMounted(async () => {
  if (!video.value) return
  await start(video.value, (code) => emit('detect', code))
})

defineExpose({ stop })
</script>

<template>
  <div class="col">
    <div class="video-wrap">
      <video ref="video" playsinline muted autoplay></video>
      <div class="reticle" aria-hidden="true"></div>
    </div>
    <div class="row between">
      <span class="muted" v-if="running">Point the camera at a barcode.</span>
      <span class="muted" v-else-if="!error">Starting camera…</span>
      <span class="error" v-if="error">{{ error }}</span>
      <button v-if="supportsTorch" @click="toggleTorch" class="ghost">
        {{ torchOn ? 'Torch off' : 'Torch on' }}
      </button>
    </div>
  </div>
</template>
