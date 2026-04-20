import type { CatalogEntry } from '../types'

interface OffResponse {
  status: number
  product?: {
    product_name?: string
    product_name_en?: string
    generic_name?: string
    brands?: string
  }
}

export async function fetchProduct(barcode: string): Promise<CatalogEntry | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_en,generic_name,brands`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = (await res.json()) as OffResponse
    if (data.status !== 1 || !data.product) return null
    const name = data.product.product_name || data.product.product_name_en || data.product.generic_name || ''
    const brand = (data.product.brands || '').split(',')[0]?.trim() || ''
    if (!name) return null
    return { name, brand, source: 'off', cachedAt: new Date().toISOString() }
  } catch {
    return null
  }
}
