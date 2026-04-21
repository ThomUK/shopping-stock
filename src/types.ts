export type ScanMode = 'stockUp' | 'useUp'

export interface StockItem {
  name: string
  brand: string
  qty: number
  lastUpdated: string
}

export interface ShoppingItem {
  label: string
  qty: number
  addedAt: string
  category: string | null
}

export interface CatalogEntry {
  name: string
  brand: string
  category: string | null
  source: 'off' | 'manual'
  cachedAt: string
}

export interface StockFile {
  version: 1
  items: Record<string, StockItem>
}

export interface ShoppingListFile {
  version: 2
  items: Record<string, ShoppingItem>
}

export interface CatalogFile {
  version: 1
  products: Record<string, CatalogEntry>
}

export interface AuthConfig {
  owner: string
  repo: string
  token: string
  branch: string
}

export type DataPath = 'stock.json' | 'shopping-list.json' | 'catalog.json'

export const UNCATEGORIZED = 'Uncategorized'

export function shoppingKey(category: string | null | undefined, barcode: string): string {
  return category ? `cat:${category}` : `bc:${barcode}`
}
