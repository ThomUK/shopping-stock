<script setup lang="ts">
import { computed } from 'vue'
import { store, stockEntries, shoppingEntries } from '../state/store'
import { loadAuth } from '../services/auth'

const configured = computed(() => Boolean(loadAuth()))
const stockTotal = computed(() => stockEntries.value.reduce((s, [, v]) => s + v.qty, 0))
const shoppingTotal = computed(() => shoppingEntries.value.reduce((s, [, v]) => s + v.qty, 0))
</script>

<template>
  <section class="card col">
    <h1>At a glance</h1>
    <div class="row between">
      <div>
        <div class="muted">In stock</div>
        <div style="font-size: 2rem; font-weight: 600">{{ stockTotal }}</div>
      </div>
      <div>
        <div class="muted">Shopping list</div>
        <div style="font-size: 2rem; font-weight: 600">{{ shoppingTotal }}</div>
      </div>
      <div>
        <div class="muted">Products</div>
        <div style="font-size: 2rem; font-weight: 600">{{ Object.keys(store.catalog).length }}</div>
      </div>
    </div>
  </section>

  <section class="card col">
    <h2>Get started</h2>
    <p class="muted" v-if="!configured">
      You're running locally. Open
      <router-link to="/settings">Settings</router-link>
      to connect a private GitHub repo so your data is saved across devices.
    </p>
    <p class="muted" v-else>
      Connected to <strong>{{ loadAuth()?.owner }}/{{ loadAuth()?.repo }}</strong>.
    </p>
    <div class="row">
      <router-link to="/scan"><button class="primary">Scan a barcode</button></router-link>
      <router-link to="/list"><button>View list</button></router-link>
    </div>
  </section>
</template>
