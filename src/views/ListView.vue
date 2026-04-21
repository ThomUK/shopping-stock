<script setup lang="ts">
import { ref } from 'vue'
import { stockGroups, shoppingGroups } from '../state/store'
import { manualAdjustStock, decrementShoppingKey, removeShoppingKey } from '../state/mutations'
import EditItem from '../components/EditItem.vue'

const tab = ref<'stock' | 'shopping'>('stock')
const expanded = ref<Set<string>>(new Set())
const editing = ref<string | null>(null)

function toggle(category: string) {
  if (expanded.value.has(category)) expanded.value.delete(category)
  else expanded.value.add(category)
  expanded.value = new Set(expanded.value)
}
</script>

<template>
  <section class="col">
    <div class="mode-toggle" role="tablist" aria-label="List view">
      <button :class="{ active: tab === 'stock' }" @click="tab = 'stock'" role="tab">Stock</button>
      <button :class="{ active: tab === 'shopping' }" @click="tab = 'shopping'" role="tab">Shopping list</button>
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
      <p class="muted" v-if="shoppingGroups.length === 0">Empty. Items are added when you scan in "Using up" mode.</p>
      <div v-for="group in shoppingGroups" :key="group.category">
        <div class="item" @click="toggle(group.category)" style="cursor: pointer">
          <div>
            <div><strong>{{ group.category }}</strong></div>
            <div class="meta">
              need {{ group.total }} · {{ group.items.length }} {{ group.items.length === 1 ? 'entry' : 'entries' }}
            </div>
          </div>
          <span class="muted">{{ expanded.has(group.category) ? '▾' : '▸' }}</span>
        </div>
        <div v-if="expanded.has(group.category)" style="padding: 0 0 .5rem 1rem">
          <div class="item" v-for="{ key, item } in group.items" :key="key">
            <div>
              <div>{{ item.label }}</div>
              <div class="meta">need {{ item.qty }}</div>
            </div>
            <div class="row">
              <button class="ghost" @click="decrementShoppingKey(key)" aria-label="Decrement need">−1</button>
              <button class="ghost" @click="removeShoppingKey(key)" aria-label="Remove">Remove</button>
            </div>
          </div>
        </div>
      </div>
      <p class="muted" v-if="shoppingGroups.length > 0" style="margin-top: .5rem">
        To tick items off, scan them in "Stocking up" mode — the matching category's need drops automatically.
      </p>
    </section>
  </section>
</template>
