<script setup lang="ts">
import { computed } from 'vue'
import { store } from './state/store'
import { loadAuth } from './services/auth'

const authed = computed(() => Boolean(loadAuth()))
const syncPill = computed(() => {
  if (store.syncing) return { label: 'syncing', cls: 'syncing' }
  if (!store.online) return { label: 'offline', cls: 'offline' }
  if (store.pendingCount > 0) return { label: `pending ${store.pendingCount}`, cls: 'syncing' }
  return { label: authed.value ? 'synced' : 'local only', cls: authed.value ? 'online' : '' }
})
</script>

<template>
  <header class="header">
    <span class="title">Shopping Stock</span>
    <span class="pill" :class="syncPill.cls">{{ syncPill.label }}</span>
  </header>
  <main>
    <router-view />
  </main>
  <nav class="nav">
    <router-link to="/">Home</router-link>
    <router-link to="/scan">Scan</router-link>
    <router-link to="/list">List</router-link>
    <router-link to="/settings">Settings</router-link>
  </nav>
</template>
