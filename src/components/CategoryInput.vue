<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  modelValue: string
  options: string[]
  placeholder?: string
  inputId?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const wrap = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

const filtered = computed(() => {
  const q = props.modelValue.trim().toLowerCase()
  const list = props.options.filter((o) => !q || o.toLowerCase().includes(q))
  if (q && list.length === 1 && list[0].toLowerCase() === q) return []
  return list.slice(0, 12)
})

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
  open.value = true
}

function onFocus() {
  open.value = true
}

function pick(opt: string) {
  emit('update:modelValue', opt)
  open.value = false
  inputRef.value?.blur()
}

function onClickOutside(e: PointerEvent) {
  if (!wrap.value) return
  if (!wrap.value.contains(e.target as Node)) open.value = false
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    open.value = false
    e.preventDefault()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onClickOutside)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onClickOutside)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="cat-input" ref="wrap">
    <input
      ref="inputRef"
      :id="inputId"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      autocomplete="off"
      autocapitalize="words"
      spellcheck="false"
      @input="onInput"
      @focus="onFocus"
    />
    <ul v-if="open && filtered.length > 0" class="cat-list" role="listbox">
      <li
        v-for="opt in filtered"
        :key="opt"
        role="option"
        @pointerdown.prevent="pick(opt)"
      >{{ opt }}</li>
    </ul>
  </div>
</template>
