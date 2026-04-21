import { reactive, computed } from 'vue'
import type { CatalogEntry, ScanMode, ShoppingItem, StockItem } from '../types'
import { UNCATEGORIZED } from '../types'

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

export interface StockGroup {
  category: string
  total: number
  items: Array<{ barcode: string; item: StockItem }>
}

function categoryFor(barcode: string): string {
  return store.catalog[barcode]?.category || UNCATEGORIZED
}

export interface CatalogGroup {
  category: string
  items: Array<{ barcode: string; entry: CatalogEntry; stockQty: number }>
}

export const stockGroups = computed<StockGroup[]>(() => {
  const groups = new Map<string, StockGroup>()
  for (const [barcode, item] of Object.entries(store.stock)) {
    if (item.qty <= 0) continue
    const category = categoryFor(barcode)
    let g = groups.get(category)
    if (!g) {
      g = { category, total: 0, items: [] }
      groups.set(category, g)
    }
    g.total += item.qty
    g.items.push({ barcode, item })
  }
  for (const g of groups.values()) {
    g.items.sort((a, b) => a.item.name.localeCompare(b.item.name))
  }
  return Array.from(groups.values()).sort(sortGroups)
})

export const catalogGroups = computed<CatalogGroup[]>(() => {
  const groups = new Map<string, CatalogGroup>()
  for (const [barcode, entry] of Object.entries(store.catalog)) {
    const category = entry.category || UNCATEGORIZED
    let g = groups.get(category)
    if (!g) {
      g = { category, items: [] }
      groups.set(category, g)
    }
    g.items.push({ barcode, entry, stockQty: store.stock[barcode]?.qty ?? 0 })
  }
  for (const g of groups.values()) {
    g.items.sort((a, b) => a.entry.name.localeCompare(b.entry.name))
  }
  return Array.from(groups.values()).sort(sortGroups)
})

function sortGroups(a: { category: string }, b: { category: string }): number {
  if (a.category === UNCATEGORIZED) return 1
  if (b.category === UNCATEGORIZED) return -1
  return a.category.localeCompare(b.category)
}

export const productsTotal = computed(() => Object.keys(store.catalog).length)

export const knownCategories = computed<string[]>(() => {
  const set = new Set<string>()
  for (const entry of Object.values(store.catalog)) {
    if (entry.category) set.add(entry.category)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

export const stockTotal = computed(() =>
  Object.values(store.stock).reduce((s, v) => s + (v.qty > 0 ? v.qty : 0), 0),
)

export const shoppingTotal = computed(() =>
  Object.values(store.shoppingList).reduce((s, v) => s + (v.qty > 0 ? v.qty : 0), 0),
)

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { store.online = true })
  window.addEventListener('offline', () => { store.online = false })
}
