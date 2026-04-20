import { store } from '../state/store'
import type { CatalogFile, DataPath, ShoppingListFile, StockFile } from '../types'
import { loadAuth } from './auth'
import { enqueueWrite, hydrateFromRemote, writeFileWithRetry } from './github'
import { dirtyCount, loadSnapshot, saveSnapshot } from './queue'

const BATCH_MS = 1500
const dirty = new Set<DataPath>()
let timer: number | null = null

export function markPathDirty(path: DataPath): void {
  dirty.add(path)
  void persistSnapshot(path, true)
  void updatePending()
}

export function scheduleSync(): void {
  if (!loadAuth()) return
  if (dirty.size === 0) return
  if (timer !== null) return
  timer = window.setTimeout(flush, BATCH_MS)
}

async function flush(): Promise<void> {
  timer = null
  if (!navigator.onLine) {
    await updatePending()
    return
  }
  const paths = Array.from(dirty)
  store.syncing = true
  try {
    for (const path of paths) {
      await enqueueWrite(() => commitPath(path))
      dirty.delete(path)
      await persistSnapshot(path, false)
    }
  } catch (err) {
    console.warn('sync failed', err)
  } finally {
    store.syncing = false
    await updatePending()
  }
}

async function commitPath(path: DataPath): Promise<void> {
  const json = serialize(path)
  const msg = messageFor(path)
  await writeFileWithRetry(path, () => json, msg)
}

function serialize(path: DataPath): string {
  if (path === 'stock.json') {
    const payload: StockFile = { version: 1, items: { ...store.stock } }
    return JSON.stringify(payload, null, 2) + '\n'
  }
  if (path === 'shopping-list.json') {
    const payload: ShoppingListFile = { version: 1, items: { ...store.shoppingList } }
    return JSON.stringify(payload, null, 2) + '\n'
  }
  const payload: CatalogFile = { version: 1, products: { ...store.catalog } }
  return JSON.stringify(payload, null, 2) + '\n'
}

async function persistSnapshot(path: DataPath, isDirty: boolean): Promise<void> {
  const snap = await loadSnapshot(path)
  const json = serialize(path)
  await saveSnapshot(path, json, snap?.sha ?? null, isDirty)
}

function messageFor(path: DataPath): string {
  const last = store.lastScan
  const mode = last ? (last.mode === 'stockUp' ? 'stock-up' : 'use-up') : 'update'
  const bc = last ? ` ${last.barcode}` : ''
  return `${mode} ${path}${bc}`
}

async function updatePending(): Promise<void> {
  store.pendingCount = await dirtyCount()
}

export async function hydrateFromStorage(): Promise<void> {
  for (const path of ['stock.json', 'shopping-list.json', 'catalog.json'] as DataPath[]) {
    const snap = await loadSnapshot(path)
    if (snap) {
      applyJsonToStore(path, snap.json)
      if (snap.dirty) dirty.add(path)
    }
  }
  await updatePending()
  if (dirty.size > 0) scheduleSync()
}

export async function hydrateFromRepo(): Promise<void> {
  if (!loadAuth()) return
  for (const path of ['stock.json', 'shopping-list.json', 'catalog.json'] as DataPath[]) {
    try {
      const json = await hydrateFromRemote(path)
      if (json) {
        applyJsonToStore(path, json)
        await persistSnapshot(path, false)
      }
    } catch (err) {
      console.warn(`hydrate ${path} failed`, err)
    }
  }
}

function applyJsonToStore(path: DataPath, json: string): void {
  try {
    const parsed = JSON.parse(json)
    if (path === 'stock.json' && parsed.items) store.stock = parsed.items
    else if (path === 'shopping-list.json' && parsed.items) store.shoppingList = parsed.items
    else if (path === 'catalog.json' && parsed.products) store.catalog = parsed.products
  } catch (err) {
    console.warn(`parse ${path} failed`, err)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (dirty.size > 0) scheduleSync()
  })
}
