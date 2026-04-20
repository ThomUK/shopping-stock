import { loadAuth } from './auth'
import { loadSnapshot, saveSnapshot } from './queue'
import type { AuthConfig, DataPath } from '../types'

interface FileState {
  sha: string | null
  json: string
}

const cache = new Map<DataPath, FileState>()
let chain: Promise<unknown> = Promise.resolve()

function updateLocalSha(path: DataPath, json: string, sha: string | null): Promise<void> {
  return saveSnapshot(path, json, sha, false)
}

function authOrThrow(): AuthConfig {
  const auth = loadAuth()
  if (!auth) throw new Error('Not configured. Open Settings to add a data-repo and PAT.')
  return auth
}

function api(auth: AuthConfig, path: string): string {
  return `https://api.github.com/repos/${auth.owner}/${auth.repo}/contents/${path}?ref=${encodeURIComponent(auth.branch)}`
}

function headers(auth: AuthConfig): HeadersInit {
  return {
    Authorization: `Bearer ${auth.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function b64encode(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
}

function b64decode(s: string): string {
  return decodeURIComponent(escape(atob(s.replace(/\n/g, ''))))
}

async function fetchFile(auth: AuthConfig, path: DataPath): Promise<FileState> {
  const res = await fetch(api(auth, path), { headers: headers(auth) })
  if (res.status === 404) return { sha: null, json: '' }
  if (!res.ok) throw new Error(`GitHub GET ${path} → ${res.status}`)
  const body = (await res.json()) as { sha: string; content: string; encoding: string }
  const json = body.encoding === 'base64' ? b64decode(body.content) : body.content
  return { sha: body.sha, json }
}

export async function readFile(path: DataPath): Promise<string | null> {
  if (cache.has(path)) return cache.get(path)!.json || null
  const snap = await loadSnapshot(path)
  if (snap) {
    cache.set(path, { sha: snap.sha, json: snap.json })
    return snap.json || null
  }
  try {
    const auth = authOrThrow()
    const state = await fetchFile(auth, path)
    cache.set(path, state)
    await updateLocalSha(path, state.json, state.sha)
    return state.json || null
  } catch {
    return null
  }
}

export async function hydrateFromRemote(path: DataPath): Promise<string | null> {
  const auth = authOrThrow()
  const state = await fetchFile(auth, path)
  cache.set(path, state)
  await updateLocalSha(path, state.json, state.sha)
  return state.json || null
}

export function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = chain.then(task, task)
  chain = next.catch(() => undefined)
  return next as Promise<T>
}

async function putFile(auth: AuthConfig, path: DataPath, json: string, sha: string | null, message: string): Promise<string> {
  const body: Record<string, unknown> = {
    message,
    content: b64encode(json),
    branch: auth.branch,
  }
  if (sha) body.sha = sha
  const res = await fetch(
    `https://api.github.com/repos/${auth.owner}/${auth.repo}/contents/${path}`,
    { method: 'PUT', headers: { ...headers(auth), 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )
  if (res.status === 409 || res.status === 422) {
    const fresh = await fetchFile(auth, path)
    throw Object.assign(new Error('sha-conflict'), { kind: 'sha-conflict', fresh })
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub PUT ${path} → ${res.status}: ${text}`)
  }
  const body2 = (await res.json()) as { content: { sha: string } }
  return body2.content.sha
}

export async function writeFileWithRetry(
  path: DataPath,
  buildJson: (current: string) => string,
  message: string,
): Promise<void> {
  const auth = authOrThrow()
  for (let attempt = 0; attempt < 2; attempt++) {
    let state = cache.get(path)
    if (!state) {
      state = await fetchFile(auth, path)
      cache.set(path, state)
    }
    const nextJson = buildJson(state.json)
    try {
      const newSha = await putFile(auth, path, nextJson, state.sha, message)
      cache.set(path, { sha: newSha, json: nextJson })
      await updateLocalSha(path, nextJson, newSha)
      return
    } catch (err) {
      const e = err as Error & { kind?: string; fresh?: FileState }
      if (e.kind === 'sha-conflict' && e.fresh) {
        cache.set(path, e.fresh)
        continue
      }
      throw err
    }
  }
  throw new Error(`Could not write ${path} after retry`)
}

export function clearCache(): void {
  cache.clear()
}
