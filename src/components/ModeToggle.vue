<script setup lang="ts">
import { store } from '../state/store'
import type { ScanMode } from '../types'

function setMode(mode: ScanMode) {
  store.mode = mode
}
</script>

<template>
  <div class="mode-toggle" role="tablist" aria-label="Scan mode">
    <button
      role="tab"
      :aria-selected="store.mode === 'stockUp'"
      :class="{ active: store.mode === 'stockUp' }"
      @click="setMode('stockUp')"
    >Stocking up</button>
    <button
      role="tab"
      :aria-selected="store.mode === 'useUp'"
      :class="{ active: store.mode === 'useUp' }"
      @click="setMode('useUp')"
    >Using up</button>
  </div>
</template>
