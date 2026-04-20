import type { AuthConfig } from '../types'

const KEY = 'shopping-stock.auth'

export function loadAuth(): AuthConfig | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthConfig>
    if (!parsed.owner || !parsed.repo || !parsed.token) return null
    return {
      owner: parsed.owner,
      repo: parsed.repo,
      token: parsed.token,
      branch: parsed.branch || 'main',
    }
  } catch {
    return null
  }
}

export function saveAuth(auth: AuthConfig): void {
  localStorage.setItem(KEY, JSON.stringify(auth))
}

export function clearAuth(): void {
  localStorage.removeItem(KEY)
}

export async function validateAuth(auth: AuthConfig): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`https://api.github.com/repos/${auth.owner}/${auth.repo}`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    if (res.status === 401) return { ok: false, error: 'Token rejected (401). Check the PAT value and expiry.' }
    if (res.status === 403) return { ok: false, error: 'Forbidden (403). Token lacks Contents: read/write on this repo.' }
    if (res.status === 404) return { ok: false, error: 'Repo not found (404). Check owner/repo and that the PAT grants access.' }
    if (!res.ok) return { ok: false, error: `GitHub returned ${res.status}.` }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: `Network error: ${(err as Error).message}` }
  }
}
