export type ScanMode = 'stockUp' | 'useUp'

export interface StockItem {
  name: string
  brand: string
  qty: number
  lastUpdated: string
}

export interface ShoppingItem {
  name: string
  qty: number
  addedAt: string
}

export interface CatalogEntry {
  name: string
  brand: string
  source: 'off' | 'manual'
  cachedAt: string
}

export interface StockFile {
  version: 1
  items: Record<string, StockItem>
}

export interface ShoppingListFile {
  version: 1
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
