<script setup lang="ts">
import { ref } from 'vue'
import Scanner from '../components/Scanner.vue'
import ModeToggle from '../components/ModeToggle.vue'
import ManualEntry from '../components/ManualEntry.vue'
import { store } from '../state/store'
import { applyScan, completeManualScan } from '../state/mutations'
import type { ScanMode } from '../types'

interface PendingManual {
  barcode: string
  mode: ScanMode
  suggestionName: string
  suggestionBrand: string
  source: 'off' | 'none'
}

const toast = ref<string | null>(null)
const pendingManual = ref<PendingManual | null>(null)
const manualEntry = ref('')
let toastTimer: number | null = null

function showToast(msg: string) {
  toast.value = msg
  if (toastTimer !== null) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value = null }, 2200)
}

async function onDetect(barcode: string) {
  if (pendingManual.value) return
  const outcome = await applyScan(barcode, store.mode)
  if (outcome.needsManualEntry) {
    pendingManual.value = {
      barcode,
      mode: store.mode,
      suggestionName: outcome.suggestion.name,
      suggestionBrand: outcome.suggestion.brand,
      source: outcome.suggestion.source,
    }
    return
  }
  const verb = store.mode === 'stockUp' ? 'Added to stock' : 'Used up — on shopping list'
  showToast(`${verb}: ${outcome.product?.name ?? barcode}`)
}

function onManualSubmit(name: string, brand: string, category: string | null) {
  if (!pendingManual.value) return
  const { barcode, mode } = pendingManual.value
  const outcome = completeManualScan(barcode, mode, name, brand, category)
  pendingManual.value = null
  const verb = mode === 'stockUp' ? 'Added to stock' : 'Used up — on shopping list'
  showToast(`${verb}: ${outcome.product?.name ?? barcode}`)
}

function onManualCancel() {
  pendingManual.value = null
}

function submitManualBarcode() {
  const code = manualEntry.value.trim()
  if (!code) return
  manualEntry.value = ''
  void onDetect(code)
}
</script>

<template>
  <section class="col">
    <ModeToggle />
    <Scanner v-if="!pendingManual" @detect="onDetect" />
    <ManualEntry
      v-if="pendingManual"
      :barcode="pendingManual.barcode"
      :default-name="pendingManual.suggestionName"
      :default-brand="pendingManual.suggestionBrand"
      :source="pendingManual.source"
      @submit="onManualSubmit"
      @cancel="onManualCancel"
    />
    <div class="card col" v-if="!pendingManual">
      <label for="manual-code">No camera? Enter a barcode</label>
      <div class="row">
        <input
          id="manual-code"
          v-model="manualEntry"
          type="text"
          inputmode="numeric"
          placeholder="e.g. 5010029217216"
          @keydown.enter.prevent="submitManualBarcode"
        />
        <button class="primary" @click="submitManualBarcode" :disabled="!manualEntry.trim()">Record</button>
      </div>
    </div>
    <div class="toast" v-if="toast">{{ toast }}</div>
  </section>
</template>
