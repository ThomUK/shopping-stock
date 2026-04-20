import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { hydrateFromStorage, hydrateFromRepo } from './services/sync'
import './styles.css'

const app = createApp(App)
app.use(router)
app.mount('#app')

void (async () => {
  await hydrateFromStorage()
  await hydrateFromRepo()
})()

if (import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  }).catch(() => {})
}
