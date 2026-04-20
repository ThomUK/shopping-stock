<script setup lang="ts">
import { ref } from 'vue'
import { loadAuth, saveAuth, clearAuth, validateAuth } from '../services/auth'
import { hydrateFromRepo } from '../services/sync'
import { clearCache } from '../services/github'
import type { AuthConfig } from '../types'

const existing = loadAuth()
const owner = ref(existing?.owner ?? '')
const repo = ref(existing?.repo ?? '')
const branch = ref(existing?.branch ?? 'main')
const token = ref(existing?.token ?? '')
const status = ref<{ kind: 'idle' | 'busy' | 'ok' | 'error'; msg: string }>({ kind: 'idle', msg: '' })

async function connect() {
  if (!owner.value || !repo.value || !token.value) {
    status.value = { kind: 'error', msg: 'Owner, repo, and PAT are all required.' }
    return
  }
  status.value = { kind: 'busy', msg: 'Checking…' }
  const auth: AuthConfig = { owner: owner.value.trim(), repo: repo.value.trim(), branch: branch.value.trim() || 'main', token: token.value.trim() }
  const result = await validateAuth(auth)
  if (!result.ok) {
    status.value = { kind: 'error', msg: result.error }
    return
  }
  saveAuth(auth)
  clearCache()
  await hydrateFromRepo()
  status.value = { kind: 'ok', msg: 'Connected. Existing data loaded from the repo.' }
}

function disconnect() {
  if (!confirm('Disconnect? Local data stays in the browser; the PAT is cleared.')) return
  clearAuth()
  clearCache()
  status.value = { kind: 'ok', msg: 'Disconnected.' }
  token.value = ''
}
</script>

<template>
  <section class="card col">
    <h1>Data repo</h1>
    <p class="muted">
      Your stock, shopping list, and product catalog are committed as JSON files to a private GitHub repo you own.
      You create a fine-grained Personal Access Token with
      <strong>Contents: read and write</strong> scoped to just that repo, and paste it below.
      The token is stored only in this browser's local storage.
    </p>
    <div>
      <label for="owner">GitHub owner (user or org)</label>
      <input id="owner" v-model="owner" type="text" autocomplete="off" />
    </div>
    <div>
      <label for="repo">Private data repo name</label>
      <input id="repo" v-model="repo" type="text" autocomplete="off" />
    </div>
    <div>
      <label for="branch">Branch</label>
      <input id="branch" v-model="branch" type="text" autocomplete="off" />
    </div>
    <div>
      <label for="token">Fine-grained PAT</label>
      <input id="token" v-model="token" type="password" autocomplete="off" placeholder="github_pat_…" />
    </div>
    <div class="row">
      <button class="primary" :disabled="status.kind === 'busy'" @click="connect">
        {{ existing ? 'Update connection' : 'Connect' }}
      </button>
      <button v-if="existing" class="danger" @click="disconnect">Disconnect</button>
    </div>
    <p v-if="status.kind === 'error'" class="error">{{ status.msg }}</p>
    <p v-else-if="status.kind === 'ok'" class="success">{{ status.msg }}</p>
    <p v-else-if="status.kind === 'busy'" class="muted">{{ status.msg }}</p>
  </section>

  <section class="card col">
    <h2>How to create the PAT</h2>
    <ol class="muted">
      <li>On GitHub, open Settings → Developer settings → Personal access tokens → Fine-grained tokens.</li>
      <li>Choose the single repository you want to use for data. Create it (private) if it doesn't exist yet.</li>
      <li>Under Repository permissions, set <strong>Contents</strong> to <em>Read and write</em>.</li>
      <li>Set a reasonable expiry. Paste the generated token above and press Connect.</li>
    </ol>
  </section>
</template>
