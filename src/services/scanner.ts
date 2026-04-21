import { playBeep } from './audio'

type OnDetect = (barcode: string) => void
type OnCooldownChange = (active: boolean) => void

interface ScannerHandle {
  stop: () => void
  setTorch: (on: boolean) => Promise<boolean>
  supportsTorch: () => boolean
}

export const CONFIRM_COUNT = 2
export const CONFIRM_WINDOW_MS = 500
export const COOLDOWN_MS = 3000

interface NativeBarcodeDetector {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string; format: string }>>
}
interface NativeBarcodeDetectorCtor {
  new (options?: { formats?: string[] }): NativeBarcodeDetector
  getSupportedFormats(): Promise<string[]>
}

declare global {
  interface Window {
    BarcodeDetector?: NativeBarcodeDetectorCtor
  }
}

async function getStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  })
}

function attachTorch(track: MediaStreamTrack): { supportsTorch: () => boolean; setTorch: (on: boolean) => Promise<boolean> } {
  const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean }
  const supported = Boolean(caps.torch)
  return {
    supportsTorch: () => supported,
    setTorch: async (on: boolean) => {
      if (!supported) return false
      try {
        await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] })
        return true
      } catch {
        return false
      }
    },
  }
}

interface Observer {
  observe: (code: string) => void
}

export function createObserver(onDetect: OnDetect, onCooldownChange: OnCooldownChange, clock: () => number = Date.now): Observer {
  let candidate = ''
  let count = 0
  let windowStart = 0
  let cooldownUntil = 0

  return {
    observe(code: string) {
      if (!code) return
      const now = clock()
      if (now < cooldownUntil) return
      if (code !== candidate || now - windowStart > CONFIRM_WINDOW_MS) {
        candidate = code
        count = 1
        windowStart = now
        return
      }
      count++
      if (count < CONFIRM_COUNT) return
      cooldownUntil = now + COOLDOWN_MS
      candidate = ''
      count = 0
      if (navigator.vibrate) navigator.vibrate(50)
      playBeep()
      onCooldownChange(true)
      onDetect(code)
      setTimeout(() => onCooldownChange(false), COOLDOWN_MS)
    },
  }
}

export async function startScanner(
  video: HTMLVideoElement,
  onDetect: OnDetect,
  onCooldownChange: OnCooldownChange = () => {},
): Promise<ScannerHandle> {
  const stream = await getStream()
  video.srcObject = stream
  video.setAttribute('playsinline', 'true')
  video.muted = true
  await video.play()
  const track = stream.getVideoTracks()[0]
  const torch = attachTorch(track)
  const { observe } = createObserver(onDetect, onCooldownChange)

  let stopped = false
  let cleanup: () => void = () => {}

  if (window.BarcodeDetector) {
    const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code']
    const supported = await window.BarcodeDetector.getSupportedFormats().catch(() => FORMATS)
    const formats = FORMATS.filter((f) => supported.includes(f))
    const detector = new window.BarcodeDetector({ formats })
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    const loop = async () => {
      if (stopped) return
      try {
        if (video.readyState >= 2 && video.videoWidth > 0) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0)
          const hits = await detector.detect(canvas)
          if (hits.length > 0 && hits[0].rawValue) observe(hits[0].rawValue)
        }
      } catch {
        // swallow per-frame errors
      }
      if (!stopped) requestAnimationFrame(loop)
    }
    loop()
    cleanup = () => { /* loop exits via `stopped` flag */ }
  } else {
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    const reader = new BrowserMultiFormatReader()
    const controls = await reader.decodeFromVideoElement(video, (result) => {
      if (result) observe(result.getText())
    })
    cleanup = () => controls.stop()
  }

  return {
    stop: () => {
      stopped = true
      cleanup()
      track.stop()
      stream.getTracks().forEach((t) => t.stop())
      video.srcObject = null
    },
    setTorch: torch.setTorch,
    supportsTorch: torch.supportsTorch,
  }
}
