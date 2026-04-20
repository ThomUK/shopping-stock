<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ barcode: string }>()
const emit = defineEmits<{
  submit: [name: string, brand: string]
  cancel: []
}>()

const name = ref('')
const brand = ref('')

function onSubmit() {
  if (!name.value.trim()) return
  emit('submit', name.value, brand.value)
}
</script>

<template>
  <form class="card col" @submit.prevent="onSubmit">
    <h2>Unknown barcode</h2>
    <p class="muted">No match for <strong>{{ props.barcode }}</strong>. Add it to your catalog so future scans auto-fill.</p>
    <div>
      <label for="name">Product name</label>
      <input id="name" v-model="name" type="text" autofocus />
    </div>
    <div>
      <label for="brand">Brand (optional)</label>
      <input id="brand" v-model="brand" type="text" />
    </div>
    <div class="row">
      <button type="submit" class="primary" :disabled="!name.trim()">Save and record scan</button>
      <button type="button" class="ghost" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>
