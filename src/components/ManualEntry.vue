<script setup lang="ts">
import { ref } from 'vue'
import { knownCategories, activeShoppingCategories } from '../state/store'
import CategoryInput from './CategoryInput.vue'

const props = defineProps<{
  barcode: string
  defaultName?: string
  defaultBrand?: string
  source?: 'off' | 'none'
}>()
const emit = defineEmits<{
  submit: [name: string, brand: string, category: string | null]
  cancel: []
}>()

const name = ref(props.defaultName ?? '')
const brand = ref(props.defaultBrand ?? '')
const category = ref('')

function setCategory(c: string) {
  category.value = c
}

function onSubmit() {
  if (!name.value.trim()) return
  emit('submit', name.value, brand.value, category.value.trim() || null)
}
</script>

<template>
  <form class="card col" @submit.prevent="onSubmit">
    <h2>{{ props.source === 'off' ? 'New product' : 'Unknown barcode' }}</h2>
    <p class="muted">
      <template v-if="props.source === 'off'">
        Pre-filled from OpenFoodFacts. Add a category so this matches your shopping list, then save.
      </template>
      <template v-else>
        No match for <strong>{{ props.barcode }}</strong>. Add it so future scans auto-fill.
      </template>
    </p>
    <div>
      <label for="name">Product name</label>
      <input id="name" v-model="name" type="text" :autofocus="!props.defaultName" />
    </div>
    <div>
      <label for="brand">Brand (optional)</label>
      <input id="brand" v-model="brand" type="text" />
    </div>
    <div>
      <label for="category">Category</label>
      <div v-if="activeShoppingCategories.length > 0" class="chip-row">
        <span class="muted" style="font-size: .75rem; align-self: center; margin-right: .25rem">On your list:</span>
        <button
          v-for="c in activeShoppingCategories"
          :key="c"
          type="button"
          class="chip"
          :class="{ active: category === c }"
          @click="setCategory(c)"
        >{{ c }}</button>
      </div>
      <CategoryInput
        v-model="category"
        input-id="category"
        :options="knownCategories"
        placeholder="e.g. Beans"
      />
      <p class="muted" style="font-size: .75rem; margin-top: .25rem">
        Items in the same category group together, and any brand can satisfy a category's shopping-list need.
      </p>
    </div>
    <div class="row">
      <button type="submit" class="primary" :disabled="!name.trim()">Save and record scan</button>
      <button type="button" class="ghost" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>
