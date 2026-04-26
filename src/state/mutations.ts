import { store } from './store'
import { fetchProduct } from '../services/openfoodfacts'
import { markPathDirty, scheduleSync } from '../services/sync'
import type { CatalogEntry, ScanMode, StockItem } from '../types'
import { shoppingKey } from '../types'

export interface ProductSuggestion {
  source: 'off' | 'none'
  name: string
  brand: string
}

interface ScanOutcome {
  barcode: string
  mode: ScanMode
  product: CatalogEntry | null
  needsManualEntry: boolean
  suggestion: ProductSuggestion
}

async function resolveProduct(barcode: string): Promise<{ existing: CatalogEntry | null; suggestion: ProductSuggestion }> {
  const cached = store.catalog[barcode]
  if (cached) return { existing: cached, suggestion: { source: 'none', name: '', brand: '' } }
  const fromOff = await fetchProduct(barcode)
  if (fromOff) return { existing: null, suggestion: { source: 'off', name: fromOff.name, brand: fromOff.brand } }
  return { existing: null, suggestion: { source: 'none', name: '', brand: '' } }
}

export function saveManualProduct(
  barcode: string,
  name: string,
  brand: string,
  category: string | null,
): CatalogEntry {
  const entry: CatalogEntry = {
    name: name.trim(),
    brand: brand.trim(),
    category: category?.trim() || null,
    source: 'manual',
    cachedAt: new Date().toISOString(),
  }
  store.catalog[barcode] = entry
  markPathDirty('catalog.json')
  scheduleSync()
  return entry
}

export function updateCatalogEntry(
  barcode: string,
  patch: { name?: string; brand?: string; category?: string | null },
): void {
  const existing = store.catalog[barcode]
  if (!existing) return
  const prevCategory = existing.category
  const nextCategory = patch.category === undefined ? existing.category : (patch.category?.trim() || null)
  const next: CatalogEntry = {
    ...existing,
    name: patch.name !== undefined ? patch.name.trim() : existing.name,
    brand: patch.brand !== undefined ? patch.brand.trim() : existing.brand,
    category: nextCategory,
    cachedAt: new Date().toISOString(),
  }
  store.catalog[barcode] = next
  if (store.stock[barcode]) {
    store.stock[barcode] = {
      ...store.stock[barcode],
      name: next.name,
      brand: next.brand,
      lastUpdated: new Date().toISOString(),
    }
    markPathDirty('stock.json')
  }
  if (prevCategory !== nextCategory) {
    rekeyShoppingForBarcode(barcode, prevCategory, nextCategory, next)
  } else {
    relabelShoppingForBarcode(barcode, next)
  }
  markPathDirty('catalog.json')
  scheduleSync()
}

export async function applyScan(barcode: string, mode: ScanMode): Promise<ScanOutcome> {
  const { existing, suggestion } = await resolveProduct(barcode)
  if (!existing) {
    store.lastScan = { barcode, mode, at: Date.now() }
    return { barcode, mode, product: null, needsManualEntry: true, suggestion }
  }
  applyResolvedScan(barcode, mode, existing)
  return { barcode, mode, product: existing, needsManualEntry: false, suggestion }
}

export function completeManualScan(
  barcode: string,
  mode: ScanMode,
  name: string,
  brand: string,
  category: string | null,
): ScanOutcome {
  const product = saveManualProduct(barcode, name, brand, category)
  applyResolvedScan(barcode, mode, product)
  return { barcode, mode, product, needsManualEntry: false, suggestion: { source: 'none', name: '', brand: '' } }
}

function applyResolvedScan(barcode: string, mode: ScanMode, product: CatalogEntry): void {
  if (mode === 'stockUp') {
    adjustStock(barcode, +1, product.name, product.brand)
    adjustShopping(barcode, -1, product)
  } else {
    adjustStock(barcode, -1, product.name, product.brand)
    adjustShopping(barcode, +1, product)
  }
  store.lastScan = { barcode, mode, at: Date.now() }
  scheduleSync()
}

function adjustStock(barcode: string, delta: number, name: string, brand: string): void {
  const existing: StockItem | undefined = store.stock[barcode]
  const nextQty = Math.max(0, (existing?.qty ?? 0) + delta)
  if (nextQty === 0 && !existing) return
  store.stock[barcode] = { name, brand, qty: nextQty, lastUpdated: new Date().toISOString() }
  markPathDirty('stock.json')
}

function adjustShopping(barcode: string, delta: number, product: CatalogEntry): void {
  const key = shoppingKey(product.category, barcode)
  const existing = store.shoppingList[key]
  const label = labelFor(product)
  const nextQty = Math.max(0, (existing?.qty ?? 0) + delta)
  if (nextQty === 0 && !existing) return
  if (nextQty === 0) {
    delete store.shoppingList[key]
  } else {
    store.shoppingList[key] = {
      label,
      qty: nextQty,
      category: product.category,
      addedAt: existing?.addedAt ?? new Date().toISOString(),
    }
  }
  markPathDirty('shopping-list.json')
}

function labelFor(product: CatalogEntry): string {
  return product.category || product.name || '(unnamed)'
}

function rekeyShoppingForBarcode(
  barcode: string,
  oldCategory: string | null,
  newCategory: string | null,
  product: CatalogEntry,
): void {
  const oldKey = shoppingKey(oldCategory, barcode)
  const newKey = shoppingKey(newCategory, barcode)
  if (oldKey === newKey) return
  const existing = store.shoppingList[oldKey]
  if (!existing) return
  delete store.shoppingList[oldKey]
  const merged = store.shoppingList[newKey]
  const label = labelFor(product)
  store.shoppingList[newKey] = {
    label,
    category: newCategory,
    qty: (merged?.qty ?? 0) + existing.qty,
    addedAt: merged?.addedAt ?? existing.addedAt,
  }
  markPathDirty('shopping-list.json')
}

function relabelShoppingForBarcode(barcode: string, product: CatalogEntry): void {
  const key = shoppingKey(product.category, barcode)
  const existing = store.shoppingList[key]
  if (!existing) return
  const label = labelFor(product)
  if (existing.label !== label) {
    store.shoppingList[key] = { ...existing, label }
    markPathDirty('shopping-list.json')
  }
}

export function deleteCatalogEntry(barcode: string): void {
  const existing = store.catalog[barcode]
  if (!existing) return
  delete store.catalog[barcode]
  markPathDirty('catalog.json')
  if (store.stock[barcode]) {
    delete store.stock[barcode]
    markPathDirty('stock.json')
  }
  const bcKey = `bc:${barcode}`
  if (store.shoppingList[bcKey]) {
    delete store.shoppingList[bcKey]
    markPathDirty('shopping-list.json')
  }
  scheduleSync()
}

export function manualAdjustStock(barcode: string, delta: number): void {
  const item = store.stock[barcode]
  if (!item) return
  adjustStock(barcode, delta, item.name, item.brand)
  scheduleSync()
}

export function removeShoppingKey(key: string): void {
  const item = store.shoppingList[key]
  if (!item) return
  delete store.shoppingList[key]
  markPathDirty('shopping-list.json')
  scheduleSync()
}
