import { reactive, computed } from 'vue'
import type { CatalogEntry, ScanMode, ShoppingItem, StockItem } from '../types'

interface StoreState {
  mode: ScanMode
  stock: Record<string, StockItem>
  shoppingList: Record<string, ShoppingItem>
  catalog: Record<string, CatalogEntry>
  online: boolean
  lastScan: { barcode: string; mode: ScanMode; at: number } | null
  syncing: boolean
  pendingCount: number
}

export const store = reactive<StoreState>({
  mode: 'stockUp',
  stock: {},
  shoppingList: {},
  catalog: {},
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastScan: null,
  syncing: false,
  pendingCount: 0,
})

export const stockEntries = computed(() =>
  Object.entries(store.stock)
    .filter(([, v]) => v.qty > 0)
    .sort(([, a], [, b]) => a.name.localeCompare(b.name)),
)

export const shoppingEntries = computed(() =>
  Object.entries(store.shoppingList)
    .filter(([, v]) => v.qty > 0)
    .sort(([, a], [, b]) => a.name.localeCompare(b.name)),
)

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { store.online = true })
  window.addEventListener('offline', () => { store.online = false })
}
