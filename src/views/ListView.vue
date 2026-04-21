<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { stockGroups, catalogGroups, store } from '../state/store'
import { manualAdjustStock, decrementShoppingKey, removeShoppingKey } from '../state/mutations'
import EditItem from '../components/EditItem.vue'

type Tab = 'stock' | 'shopping' | 'products'

const route = useRoute()
const router = useRouter()

const tab = computed<Tab>(() => {
  const t = route.query.tab
  if (t === 'shopping' || t === 'products' || t === 'stock') return t
  return 'stock'
})

function setTab(next: Tab) {
  router.replace({ query: { ...route.query, tab: next } })
}

const expanded = ref<Set<string>>(new Set())
const editing = ref<string | null>(null)

const shoppingFlat = computed(() =>
  Object.entries(store.shoppingList)
    .filter(([, item]) => item.qty > 0)
    .map(([key, item]) => ({ key, item }))
    .sort((a, b) => {
      if (!!a.item.category !== !!b.item.category) return a.item.category ? -1 : 1
      return a.item.label.localeCompare(b.item.label)
    }),
)

watch(tab, () => { expanded.value = new Set() })

function toggle(category: string) {
  if (expanded.value.has(category)) expanded.value.delete(category)
  else expanded.value.add(category)
  expanded.value = new Set(expanded.value)
}
</script>

<template>
  <section class="col">
    <div class="mode-toggle" role="tablist" aria-label="List view">
      <button :class="{ active: tab === 'stock' }" @click="setTab('stock')" role="tab">Stock</button>
      <button :class="{ active: tab === 'shopping' }" @click="setTab('shopping')" role="tab">Shopping</button>
      <button :class="{ active: tab === 'products' }" @click="setTab('products')" role="tab">Products</button>
    </div>

    <EditItem v-if="editing" :barcode="editing" @close="editing = null" />

    <section class="card" v-if="tab === 'stock' && !editing">
      <h2>In stock</h2>
      <p class="muted" v-if="stockGroups.length === 0">Nothing yet. Scan in "Stocking up" mode to add items.</p>
      <div v-for="group in stockGroups" :key="group.category">
        <div class="item" @click="toggle(group.category)" style="cursor: pointer">
          <div>
            <div><strong>{{ group.category }}</strong></div>
            <div class="meta">{{ group.items.length }} {{ group.items.length === 1 ? 'product' : 'products' }}</div>
          </div>
          <div class="row">
            <span class="pill online">{{ group.total }}</span>
            <span class="muted">{{ expanded.has(group.category) ? '▾' : '▸' }}</span>
          </div>
        </div>
        <div v-if="expanded.has(group.category)" style="padding: 0 0 .5rem 1rem">
          <div class="item" v-for="{ barcode, item } in group.items" :key="barcode">
            <div>
              <div>{{ item.name }}</div>
              <div class="meta">{{ item.brand || barcode }}</div>
            </div>
            <div class="row">
              <div class="qty-controls">
                <button @click="manualAdjustStock(barcode, -1)" aria-label="Decrement">−</button>
                <strong>{{ item.qty }}</strong>
                <button @click="manualAdjustStock(barcode, +1)" aria-label="Increment">+</button>
              </div>
              <button class="ghost" @click="editing = barcode" aria-label="Edit">Edit</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="card" v-if="tab === 'shopping' && !editing">
      <h2>Shopping list</h2>
      <p class="muted" v-if="shoppingFlat.length === 0">Empty. Items are added when you scan in "Using up" mode.</p>
      <div class="item" v-for="{ key, item } in shoppingFlat" :key="key">
        <div>
          <div><strong>{{ item.label }}</strong></div>
          <div class="meta" v-if="!item.category">Uncategorized</div>
        </div>
        <div class="row">
          <span class="pill">need {{ item.qty }}</span>
          <button class="ghost" @click="decrementShoppingKey(key)" aria-label="Decrement">−1</button>
          <button class="ghost" @click="removeShoppingKey(key)" aria-label="Remove">✕</button>
        </div>
      </div>
      <p class="muted" v-if="shoppingFlat.length > 0" style="margin-top: .5rem">
        To tick items off, scan them in "Stocking up" mode — any brand in the matching category decrements the need.
      </p>
    </section>

    <section class="card" v-if="tab === 'products' && !editing">
      <h2>Product catalog</h2>
      <p class="muted" v-if="catalogGroups.length === 0">Empty. Scan something to add your first product.</p>
      <div v-for="group in catalogGroups" :key="group.category">
        <div class="item" @click="toggle(group.category)" style="cursor: pointer">
          <div>
            <div><strong>{{ group.category }}</strong></div>
            <div class="meta">{{ group.items.length }} {{ group.items.length === 1 ? 'product' : 'products' }}</div>
          </div>
          <span class="muted">{{ expanded.has(group.category) ? '▾' : '▸' }}</span>
        </div>
        <div v-if="expanded.has(group.category)" style="padding: 0 0 .5rem 1rem">
          <div class="item" v-for="{ barcode, entry, stockQty } in group.items" :key="barcode">
            <div>
              <div>{{ entry.name }}</div>
              <div class="meta">{{ entry.brand || '—' }} · {{ barcode }}</div>
            </div>
            <div class="row">
              <span class="pill" :class="stockQty > 0 ? 'online' : ''">{{ stockQty }} in stock</span>
              <button class="ghost" @click="editing = barcode">Edit</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>
