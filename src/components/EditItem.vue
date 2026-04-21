<script setup lang="ts">
import { ref } from 'vue'
import { store, knownCategories } from '../state/store'
import { updateCatalogEntry } from '../state/mutations'

const props = defineProps<{ barcode: string }>()
const emit = defineEmits<{ close: [] }>()

const existing = store.catalog[props.barcode]
const name = ref(existing?.name ?? '')
const brand = ref(existing?.brand ?? '')
const category = ref(existing?.category ?? '')

function save() {
  if (!name.value.trim()) return
  updateCatalogEntry(props.barcode, {
    name: name.value,
    brand: brand.value,
    category: category.value.trim() || null,
  })
  emit('close')
}
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
      <input id="edit-category" v-model="category" type="text" list="known-categories-edit" placeholder="e.g. Beans" />
      <datalist id="known-categories-edit">
        <option v-for="c in knownCategories" :key="c" :value="c" />
      </datalist>
      <p class="muted" style="font-size: .75rem; margin-top: .25rem">
        Clearing this moves the item to Uncategorized. Any outstanding shopping entry re-keys automatically.
      </p>
    </div>
    <div class="row">
      <button type="submit" class="primary" :disabled="!name.trim()">Save</button>
      <button type="button" class="ghost" @click="emit('close')">Cancel</button>
    </div>
  </form>
</template>
