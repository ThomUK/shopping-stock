type OnDetect = (barcode: string) => void

interface ScannerHandle {
  stop: () => void
  setTorch: (on: boolean) => Promise<boolean>
  supportsTorch: () => boolean
}

const DUPLICATE_WINDOW_MS = 2500

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

export async function startScanner(video: HTMLVideoElement, onDetect: OnDetect): Promise<ScannerHandle> {
  const stream = await getStream()
  video.srcObject = stream
  video.setAttribute('playsinline', 'true')
  video.muted = true
  await video.play()
  const track = stream.getVideoTracks()[0]
  const torch = attachTorch(track)

  let lastCode = ''
  let lastTs = 0
  let stopped = false
  const fire = (code: string) => {
    const now = Date.now()
    if (code === lastCode && now - lastTs < DUPLICATE_WINDOW_MS) return
    lastCode = code
    lastTs = now
    if (navigator.vibrate) navigator.vibrate(50)
    onDetect(code)
  }

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
          if (hits.length > 0 && hits[0].rawValue) fire(hits[0].rawValue)
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
      if (result) fire(result.getText())
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
