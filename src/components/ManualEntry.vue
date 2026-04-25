<script setup lang="ts">
import { ref } from 'vue'
import { knownCategories } from '../state/store'
import CategoryInput from './CategoryInput.vue'

const props = defineProps<{ barcode: string }>()
const emit = defineEmits<{
  submit: [name: string, brand: string, category: string | null]
  cancel: []
}>()

const name = ref('')
const brand = ref('')
const category = ref('')

function onSubmit() {
  if (!name.value.trim()) return
  emit('submit', name.value, brand.value, category.value.trim() || null)
}
</script>

<template>
  <form class="card col" @submit.prevent="onSubmit">
    <h2>Unknown barcode</h2>
    <p class="muted">No match for <strong>{{ props.barcode }}</strong>. Add it so future scans auto-fill.</p>
    <div>
      <label for="name">Product name</label>
      <input id="name" v-model="name" type="text" autofocus />
    </div>
    <div>
      <label for="brand">Brand (optional)</label>
      <input id="brand" v-model="brand" type="text" />
    </div>
    <div>
      <label for="category">Category (optional)</label>
      <CategoryInput
        v-model="category"
        input-id="category"
        :options="knownCategories"
        placeholder="e.g. Beans"
      />
      <p class="muted" style="font-size: .75rem; margin-top: .25rem">
        Items in the same category group together on the stock and shopping list.
      </p>
    </div>
    <div class="row">
      <button type="submit" class="primary" :disabled="!name.trim()">Save and record scan</button>
      <button type="button" class="ghost" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>
