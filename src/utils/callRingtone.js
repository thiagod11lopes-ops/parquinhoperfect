/**
 * Toque de chamada para o app do responsável.
 * Em app nativo (Android/iOS), usa o toque padrão de telefone do aparelho.
 * No navegador, simula o toque de chamada com áudio + vibração no ritmo de telefone.
 */

let audioCtx = null
let ringTimer = null
let vibrateTimer = null
let activeNodes = []
let ringing = false

function getNativeBridge() {
  if (typeof window === 'undefined') return null
  // Capacitor / bridge futuro
  if (window.ParquinhoNative?.playPhoneRingtone) return window.ParquinhoNative
  if (window.Android?.playPhoneRingtone) return window.Android
  if (window.webkit?.messageHandlers?.playPhoneRingtone) {
    return {
      playPhoneRingtone: () => window.webkit.messageHandlers.playPhoneRingtone.postMessage({}),
      stopPhoneRingtone: () => window.webkit.messageHandlers.stopPhoneRingtone?.postMessage({}),
    }
  }
  return null
}

function ensureAudioCtx() {
  if (audioCtx) return audioCtx
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  audioCtx = new Ctx()
  return audioCtx
}

function stopOscillators() {
  activeNodes.forEach((node) => {
    try { node.stop?.() } catch { /* ignore */ }
    try { node.disconnect?.() } catch { /* ignore */ }
  })
  activeNodes = []
}

function playRingBurst(ctx, durationSec = 1.2) {
  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.setValueAtTime(0.0001, now)
  master.gain.exponentialRampToValueAtTime(0.22, now + 0.04)
  master.gain.setValueAtTime(0.22, now + durationSec - 0.08)
  master.gain.exponentialRampToValueAtTime(0.0001, now + durationSec)
  master.connect(ctx.destination)

  // Tom clássico de telefone (dois tons sobrepostos)
  const freqs = [440, 480]
  freqs.forEach((freq) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)
    osc.connect(master)
    osc.start(now)
    osc.stop(now + durationSec + 0.02)
    activeNodes.push(osc)
  })
  activeNodes.push(master)
}

function startWebRingtone() {
  const ctx = ensureAudioCtx()
  if (!ctx) return

  const startBurst = () => {
    if (!ringing) return
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    stopOscillators()
    playRingBurst(ctx, 1.2)
  }

  startBurst()
  // Cadência típica de chamada: toca ~1.2s, pausa ~2.8s
  ringTimer = window.setInterval(startBurst, 4000)
}

function startCallVibration() {
  if (!navigator.vibrate) return
  const pattern = [400, 200, 400, 200, 400, 2000]
  const pulse = () => {
    if (!ringing) return
    try { navigator.vibrate(pattern) } catch { /* ignore */ }
  }
  pulse()
  vibrateTimer = window.setInterval(pulse, 3600)
}

export function startCallRingtone() {
  stopCallRingtone()
  ringing = true

  const native = getNativeBridge()
  if (native?.playPhoneRingtone) {
    try {
      native.playPhoneRingtone()
      startCallVibration()
      return
    } catch { /* fallback web */ }
  }

  startWebRingtone()
  startCallVibration()
}

export function stopCallRingtone() {
  ringing = false

  if (ringTimer) {
    clearInterval(ringTimer)
    ringTimer = null
  }
  if (vibrateTimer) {
    clearInterval(vibrateTimer)
    vibrateTimer = null
  }

  stopOscillators()

  try { navigator.vibrate?.(0) } catch { /* ignore */ }

  const native = getNativeBridge()
  try { native?.stopPhoneRingtone?.() } catch { /* ignore */ }

  if (audioCtx && audioCtx.state !== 'closed') {
    // Mantém o contexto para a próxima chamada (resume mais rápido)
  }
}
