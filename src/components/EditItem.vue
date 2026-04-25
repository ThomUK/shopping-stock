<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { store, knownCategories } from '../state/store'
import { updateCatalogEntry, deleteCatalogEntry } from '../state/mutations'
import CategoryInput from './CategoryInput.vue'

const props = defineProps<{ barcode: string }>()
const emit = defineEmits<{ close: [] }>()

const existing = store.catalog[props.barcode]
const name = ref(existing?.name ?? '')
const brand = ref(existing?.brand ?? '')
const category = ref(existing?.category ?? '')
const confirmDelete = ref(false)

const stockQty = store.stock[props.barcode]?.qty ?? 0

function save() {
  if (!name.value.trim()) return
  updateCatalogEntry(props.barcode, {
    name: name.value,
    brand: brand.value,
    category: category.value.trim() || null,
  })
  emit('close')
}

function doDelete() {
  deleteCatalogEntry(props.barcode)
  confirmDelete.value = false
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && confirmDelete.value) {
    e.preventDefault()
    confirmDelete.value = false
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <form class="card col" @submit.prevent="save">
    <h2>Edit product</h2>
    <p class="muted">Barcode <strong>{{ props.barcode }}</strong></p>
    <div>
      <label for="edit-name">Product name</label>
      <input id="edit-name" v-model="name" type="text" />
    </div>
    <div>
      <label for="edit-brand">Brand</label>
      <input id="edit-brand" v-model="brand" type="text" />
    </div>
    <div>
      <label for="edit-category">Category</label>
      <CategoryInput
        v-model="category"
        input-id="edit-category"
        :options="knownCategories"
        placeholder="e.g. Beans"
      />
      <p class="muted" style="font-size: .75rem; margin-top: .25rem">
        Clearing this moves the item to Uncategorized. Any outstanding shopping entry re-keys automatically.
      </p>
    </div>
    <div class="row between">
      <button type="button" class="danger" @click="confirmDelete = true">Delete product</button>
      <div class="row">
        <button type="submit" class="primary" :disabled="!name.trim()">Save</button>
        <button type="button" class="ghost" @click="emit('close')">Cancel</button>
      </div>
    </div>
  </form>

  <div v-if="confirmDelete" class="modal-backdrop" @click.self="confirmDelete = false">
    <div class="modal card col" role="dialog" aria-modal="true" aria-labelledby="del-title">
      <h2 id="del-title">Delete product?</h2>
      <p>
        Remove <strong>{{ existing?.name || 'this product' }}</strong>
        (barcode <code>{{ props.barcode }}</code>) from your catalog.
      </p>
      <ul class="muted" style="margin: 0; padding-left: 1.25rem">
        <li v-if="stockQty > 0">Clears the {{ stockQty }} in stock for this barcode.</li>
        <li v-else>No stock to clear.</li>
        <li>Shopping-list entries for the product's category (if any) are unchanged — other brands of the same category still count.</li>
        <li>This also rewrites <code>catalog.json</code><span v-if="stockQty > 0"> and <code>stock.json</code></span> in your data repo.</li>
      </ul>
      <div class="row between">
        <button type="button" class="ghost" @click="confirmDelete = false">Cancel</button>
        <button type="button" class="danger" @click="doDelete">Delete</button>
      </div>
    </div>
  </div>
</template>
