<script setup lang="ts">
import { ref } from 'vue'
import { stockEntries, shoppingEntries, store } from '../state/store'
import { manualAdjustStock, removeFromShopping, completeManualScan } from '../state/mutations'

const tab = ref<'stock' | 'shopping'>('stock')

function boughtFromShopping(barcode: string) {
  const item = store.shoppingList[barcode]
  if (!item) return
  const cat = store.catalog[barcode]
  completeManualScan(barcode, 'stockUp', cat?.name ?? item.name, cat?.brand ?? '')
}
</script>

<template>
  <section class="col">
    <div class="mode-toggle" role="tablist" aria-label="List view">
      <button :class="{ active: tab === 'stock' }" @click="tab = 'stock'" role="tab">Stock</button>
      <button :class="{ active: tab === 'shopping' }" @click="tab = 'shopping'" role="tab">Shopping list</button>
    </div>

    <section class="card" v-if="tab === 'stock'">
      <h2>In stock</h2>
      <p class="muted" v-if="stockEntries.length === 0">Nothing yet. Scan in "Stocking up" mode to add items.</p>
      <div class="item" v-for="[barcode, item] in stockEntries" :key="barcode">
        <div>
          <div>{{ item.name }}</div>
          <div class="meta">{{ item.brand || barcode }}</div>
        </div>
        <div class="qty-controls">
          <button @click="manualAdjustStock(barcode, -1)" aria-label="Decrement">−</button>
          <strong>{{ item.qty }}</strong>
          <button @click="manualAdjustStock(barcode, +1)" aria-label="Increment">+</button>
        </div>
      </div>
    </section>

    <section class="card" v-if="tab === 'shopping'">
      <h2>Shopping list</h2>
      <p class="muted" v-if="shoppingEntries.length === 0">Empty. Items are added when you scan in "Using up" mode.</p>
      <div class="item" v-for="[barcode, item] in shoppingEntries" :key="barcode">
        <div>
          <div>{{ item.name }}</div>
          <div class="meta">need {{ item.qty }}</div>
        </div>
        <div class="row">
          <button class="primary" @click="boughtFromShopping(barcode)">Bought</button>
          <button class="ghost" @click="removeFromShopping(barcode)" aria-label="Remove">Remove</button>
        </div>
      </div>
    </section>
  </section>
</template>
