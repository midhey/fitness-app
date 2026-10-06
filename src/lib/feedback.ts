import { useEffect } from 'react'
import { getState } from '../store/store'

let ctx: AudioContext | null = null

/** Вызывать из обработчика нажатия — браузер разрешает звук только после жеста пользователя */
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AC) ctx = new AC()
    }
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

function tone(freq: number, start: number, dur: number) {
  if (!ctx) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'sine'
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, ctx.currentTime + start)
  g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur)
  o.connect(g).connect(ctx.destination)
  o.start(ctx.currentTime + start)
  o.stop(ctx.currentTime + start + dur + 0.05)
}

export type Signal = 'done' | 'tick' | 'phase'

export function signal(kind: Signal) {
  const { sound, vibration } = getState().settings
  if (sound && ctx) {
    try {
      if (kind === 'done') {
        tone(880, 0, 0.18)
        tone(1175, 0.22, 0.28)
      } else if (kind === 'phase') {
        tone(660, 0, 0.2)
      } else {
        tone(520, 0, 0.08)
      }
    } catch {
      /* звук недоступен */
    }
  }
  if (vibration && 'vibrate' in navigator) {
    try {
      navigator.vibrate(kind === 'done' ? [180, 90, 180] : kind === 'phase' ? 160 : 40)
    } catch {
      /* вибрация недоступна */
    }
  }
}

/** Не даёт экрану гаснуть во время тренировки/таймера (если браузер поддерживает) */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) void lock.release()
      } catch {
        lock = null
      }
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') void request()
    }
    void request()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      if (lock) void lock.release().catch(() => undefined)
    }
  }, [active])
}
