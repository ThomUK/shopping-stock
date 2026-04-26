<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { offTodoEntries } from '../state/store'
import { markOffSubmitted } from '../state/mutations'

const confirming = ref<{ barcode: string; name: string } | null>(null)

function offUrl(barcode: string): string {
  return `https://world.openfoodfacts.org/cgi/product.pl?type=add&code=${encodeURIComponent(barcode)}`
}

function openOff(barcode: string) {
  window.open(offUrl(barcode), '_blank', 'noopener')
}

function askDone(barcode: string, name: string) {
  confirming.value = { barcode, name }
}

function cancel() {
  confirming.value = null
}

function confirmDone() {
  if (!confirming.value) return
  markOffSubmitted(confirming.value.barcode)
  confirming.value = null
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && confirming.value) {
    e.preventDefault()
    cancel()
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <section class="card col">
    <h1>Help OpenFoodFacts</h1>
    <p class="muted">
      These products had no OpenFoodFacts match when scanned. Adding them on
      <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">openfoodfacts.org</a>
      means future scans of the same barcode auto-fill for everyone. Once you've added one,
      tap <strong>Done</strong> to clear it from the list.
    </p>
  </section>

  <section class="card col">
    <h2>Pending ({{ offTodoEntries.length }})</h2>
    <p class="muted" v-if="offTodoEntries.length === 0">Nothing pending. Scan something OFF doesn't recognise to add to this list.</p>
    <div class="item" v-for="{ barcode, entry } in offTodoEntries" :key="barcode">
      <div class="grow" style="min-width: 0">
        <div><strong>{{ entry.name }}</strong></div>
        <div class="meta">
          {{ entry.brand || '—' }}
          <span v-if="entry.category"> · {{ entry.category }}</span>
          · <code>{{ barcode }}</code>
        </div>
      </div>
      <div class="row">
        <button class="ghost" type="button" @click="openOff(barcode)">Open on OFF</button>
        <button class="primary" type="button" @click="askDone(barcode, entry.name)">Done</button>
      </div>
    </div>
  </section>

  <div v-if="confirming" class="modal-backdrop" @click.self="cancel">
    <div class="modal card col" role="dialog" aria-modal="true" aria-labelledby="off-done-title">
      <h2 id="off-done-title">Mark as added to OpenFoodFacts?</h2>
      <p>
        Confirm that <strong>{{ confirming.name }}</strong>
        (barcode <code>{{ confirming.barcode }}</code>) is now on
        <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">openfoodfacts.org</a>.
        It will be removed from this list. The product stays in your catalog.
      </p>
      <div class="row between">
        <button class="ghost" @click="cancel">Cancel</button>
        <button class="primary" @click="confirmDone">Yes, mark as done</button>
      </div>
    </div>
  </div>
</template>
