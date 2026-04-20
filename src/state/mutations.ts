import { store } from './store'
import { fetchProduct } from '../services/openfoodfacts'
import { markPathDirty, scheduleSync } from '../services/sync'
import type { CatalogEntry, ScanMode, StockItem, ShoppingItem } from '../types'

interface ScanOutcome {
  barcode: string
  mode: ScanMode
  product: CatalogEntry | null
  needsManualEntry: boolean
}

export async function resolveProduct(barcode: string): Promise<CatalogEntry | null> {
  const cached = store.catalog[barcode]
  if (cached) return cached
  const fromOff = await fetchProduct(barcode)
  if (fromOff) {
    store.catalog[barcode] = fromOff
    markPathDirty('catalog.json')
    scheduleSync()
    return fromOff
  }
  return null
}

export function saveManualProduct(barcode: string, name: string, brand: string): CatalogEntry {
  const entry: CatalogEntry = { name: name.trim(), brand: brand.trim(), source: 'manual', cachedAt: new Date().toISOString() }
  store.catalog[barcode] = entry
  markPathDirty('catalog.json')
  scheduleSync()
  return entry
}

export async function applyScan(barcode: string, mode: ScanMode): Promise<ScanOutcome> {
  const product = await resolveProduct(barcode)
  if (!product) {
    store.lastScan = { barcode, mode, at: Date.now() }
    return { barcode, mode, product: null, needsManualEntry: true }
  }
  applyResolvedScan(barcode, mode, product)
  return { barcode, mode, product, needsManualEntry: false }
}

export function completeManualScan(barcode: string, mode: ScanMode, name: string, brand: string): ScanOutcome {
  const product = saveManualProduct(barcode, name, brand)
  applyResolvedScan(barcode, mode, product)
  return { barcode, mode, product, needsManualEntry: false }
}

function applyResolvedScan(barcode: string, mode: ScanMode, product: CatalogEntry): void {
  if (mode === 'stockUp') {
    adjustStock(barcode, +1, product.name, product.brand)
    adjustShopping(barcode, -1, product.name)
  } else {
    adjustStock(barcode, -1, product.name, product.brand)
    adjustShopping(barcode, +1, product.name)
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

function adjustShopping(barcode: string, delta: number, name: string): void {
  const existing: ShoppingItem | undefined = store.shoppingList[barcode]
  const nextQty = Math.max(0, (existing?.qty ?? 0) + delta)
  if (nextQty === 0 && !existing) return
  if (nextQty === 0) {
    delete store.shoppingList[barcode]
  } else {
    store.shoppingList[barcode] = {
      name,
      qty: nextQty,
      addedAt: existing?.addedAt ?? new Date().toISOString(),
    }
  }
  markPathDirty('shopping-list.json')
}

export function manualAdjustStock(barcode: string, delta: number): void {
  const item = store.stock[barcode]
  if (!item) return
  adjustStock(barcode, delta, item.name, item.brand)
  scheduleSync()
}

export function removeFromShopping(barcode: string): void {
  const item = store.shoppingList[barcode]
  if (!item) return
  adjustShopping(barcode, -item.qty, item.name)
  scheduleSync()
}
