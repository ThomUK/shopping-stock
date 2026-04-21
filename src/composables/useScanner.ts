import { onBeforeUnmount, ref, shallowRef } from 'vue'
import { startScanner } from '../services/scanner'
import { prepareAudio } from '../services/audio'

export function useScanner() {
  const error = ref<string | null>(null)
  const running = ref(false)
  const torchOn = ref(false)
  const supportsTorch = ref(false)
  const cooldown = ref(false)
  const handle = shallowRef<Awaited<ReturnType<typeof startScanner>> | null>(null)

  async function start(video: HTMLVideoElement, onDetect: (code: string) => void) {
    error.value = null
    void prepareAudio()
    try {
      const h = await startScanner(video, onDetect, (active) => { cooldown.value = active })
      handle.value = h
      supportsTorch.value = h.supportsTorch()
      running.value = true
    } catch (err) {
      error.value = (err as Error).message || 'Camera unavailable'
      running.value = false
    }
  }

  function stop() {
    if (!handle.value) return
    handle.value.stop()
    handle.value = null
    running.value = false
    torchOn.value = false
    cooldown.value = false
  }

  async function toggleTorch() {
    if (!handle.value) return
    const next = !torchOn.value
    const ok = await handle.value.setTorch(next)
    if (ok) torchOn.value = next
  }

  onBeforeUnmount(stop)

  return { start, stop, toggleTorch, running, torchOn, supportsTorch, cooldown, error }
}
