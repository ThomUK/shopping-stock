<script setup lang="ts">
import { computed } from 'vue'
import { stockTotal, shoppingTotal, productsTotal, offTodoCount } from '../state/store'
import { loadAuth } from '../services/auth'

const configured = computed(() => Boolean(loadAuth()))
</script>

<template>
  <section class="card col">
    <h1>At a glance</h1>
    <div class="row between tiles">
      <router-link to="/list?tab=stock" class="tile">
        <div class="muted">In stock</div>
        <div class="tile-num">{{ stockTotal }}</div>
      </router-link>
      <router-link to="/list?tab=shopping" class="tile">
        <div class="muted">Shopping list</div>
        <div class="tile-num">{{ shoppingTotal }}</div>
      </router-link>
      <router-link to="/list?tab=products" class="tile">
        <div class="muted">Products</div>
        <div class="tile-num">{{ productsTotal }}</div>
      </router-link>
    </div>
  </section>

  <section class="card col" v-if="offTodoCount > 0">
    <h2>Help OpenFoodFacts</h2>
    <p class="muted">
      <strong>{{ offTodoCount }}</strong>
      {{ offTodoCount === 1 ? 'product needs' : 'products need' }} adding to OpenFoodFacts so future scans
      auto-fill for everyone.
    </p>
    <div class="row">
      <router-link to="/contribute"><button class="primary">View list</button></router-link>
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
