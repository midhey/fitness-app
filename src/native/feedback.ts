import { useEffect } from 'react'
import { createAudioPlayer, type AudioPlayer } from 'expo-audio'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import * as Haptics from 'expo-haptics'
import { getState } from '../store/store'

// Короткий синусоидальный сигнал 50 мс; файл в bundle, сеть не нужна.
const BEEP = require('../../assets/beep.wav')

let player: AudioPlayer | null = null

/** Сигнал таймера: вибрация и звук по настройкам */
export function signal(kind: 'tick' | 'phase' | 'done') {
  const { sound, vibration } = getState().settings
  if (vibration) {
    if (kind === 'done') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    else Haptics.impactAsync(kind === 'phase' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light)
  }
  if (sound) {
    try {
      player ??= createAudioPlayer(BEEP)
      player.seekTo(0)
      player.play()
    } catch {
      /* устройство может быть в беззвучном режиме */
    }
  }
}

/** Лёгкий отклик на нажатие */
export function tap() {
  if (getState().settings.vibration) Haptics.selectionAsync()
}

/** Отклик на успешное действие */
export function success() {
  if (getState().settings.vibration) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
}

let awakeSeq = 0

/** Не давать экрану гаснуть, пока enabled. Ошибки блокировки (web, быстрый выход с экрана) не роняют приложение. */
export function useScreenAwake(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const tag = `homefit-${++awakeSeq}`
    activateKeepAwakeAsync(tag).catch(() => {})
    return () => {
      deactivateKeepAwake(tag).catch(() => {})
    }
  }, [enabled])
}
