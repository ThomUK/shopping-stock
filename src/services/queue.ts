import { openDB, type IDBPDatabase } from 'idb'
import type { DataPath } from '../types'

interface Schema {
  snapshots: { key: DataPath; value: { path: DataPath; json: string; sha: string | null; dirty: boolean; updatedAt: string } }
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null

function db() {
  if (!dbPromise) {
    dbPromise = openDB<Schema>('shopping-stock', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('snapshots')) {
          db.createObjectStore('snapshots', { keyPath: 'path' })
        }
      },
    })
  }
  return dbPromise
}

export async function saveSnapshot(path: DataPath, json: string, sha: string | null, dirty: boolean): Promise<void> {
  const d = await db()
  await d.put('snapshots', { path, json, sha, dirty, updatedAt: new Date().toISOString() })
}

export async function loadSnapshot(path: DataPath): Promise<{ json: string; sha: string | null; dirty: boolean } | null> {
  const d = await db()
  const row = await d.get('snapshots', path)
  if (!row) return null
  return { json: row.json, sha: row.sha, dirty: row.dirty }
}

export async function markDirty(path: DataPath): Promise<void> {
  const d = await db()
  const row = await d.get('snapshots', path)
  if (!row) return
  row.dirty = true
  await d.put('snapshots', row)
}

export async function dirtyCount(): Promise<number> {
  const d = await db()
  const all = await d.getAll('snapshots')
  return all.filter((r) => r.dirty).length
}
