let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
    return ctx
  } catch {
    return null
  }
}

export async function prepareAudio(): Promise<void> {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') {
    try { await c.resume() } catch { /* no-op */ }
  }
}

export function playBeep(): void {
  const c = getCtx()
  if (!c || c.state !== 'running') return
  try {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    const t = c.currentTime
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.2, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
    osc.connect(gain).connect(c.destination)
    osc.start(t)
    osc.stop(t + 0.15)
  } catch {
    /* no-op */
  }
}
