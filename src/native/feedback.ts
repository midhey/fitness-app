import { createAudioPlayer, type AudioPlayer } from 'expo-audio'
import * as Haptics from 'expo-haptics'
import { getState } from '../store/store'

// Короткий синусоидальный WAV-сигнал, встроенный в bundle без сетевого доступа.
const BEEP = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YSADAAAAACcAhwDsABMBzQAPAP/+7v0//UX9Jv7F/8ABjAOUBG4E/QKFAJz9Dvug+db5yfsV/+sCQgYkCOwHhAVtAaz8hPgj9k32Hfn1/aADngiJC3sLUgjDAjL8W/ba8r7yMfZt/N8DkgqxDgcPWAt8BC/8nfTX7zvvFvOF+qcDFgyNEXwShA6OBqD8U/Mn7dfr3u9L+PwCJQ0NFMkVwxHsCIL9gfLZ6qbonOzO9eYBug0mFtoYAhWEC8v+KfL46LnlZOke82wA1g3OF58bLhhIDnIASPKL5x/jSeZN8Jz+fA3+GAoeNBsjEWgC3PKY5ufgXeNt7YP8sQyzGQ4gAh4DFKAE3PMi5hvfsuCR6jH6fgvrGaAhhiDUFggHP/Uo5sTdWN7O57j37wmoGbkisiKFGY4J+Pam5uncXdw15Sr1EAjwGFUjeCQCHB8M+fiV543cztrZ4pry8QXLF3IjziU5HqkOMfvt6K/cs9nJ4BvwpANDFhEjrCYdIBgRj/2i6k3dFNkV38DtOgFlFDciDCeeIVoTAACm7GLe9NjJ3Zvrxv5AEusg7CazIl4VcQLo7uPfVNnv3L3pXPzlDzcfTSZRIxMXzwRX8cfhMtqO3DXoD/pmDScdMiVzI2sYBwfh8/7jiNur3BDn8PfWCssaoyMXI1oZCAly9nvmTt1H3VjmEfZICDIYqCE8ItgZwQr4+Czpet9g3hXmgvTPBW8VTh/lIN4ZJAxg+/3r/uHy303mT/N9A5MSoxwZH2gZJA2Y/d3uzOT24QLnhPJkAbMPtxnhHHUYuA2O/7jx0udh5DLoKvKU/+IMnBZHGggX1w01AXz0/uom59rpRvIa/jIKZBNaFycVfw1+AhT3Pe436vPr2/IE/bUHIhApFNkSrQxgA3L5fPGE7XPu6vNZ/HsF6gzFECkQYwvRA4T7qPT58E/xbvUh/JMDzwlCDSYNpQnOAz39rveF9Hf0Yvdg/AsC4wazCd0JfAdUA5P+fPoU+Nz3vvkV/esANwQqBmAG8gRkAnv/A/2S+2z7dPxA/jsA2gG7AsECEgIBAfH/M//t/hT/ef/Z/w=='

let player: AudioPlayer | null = null
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
    } catch { /* устройство может быть в беззвучном режиме */ }
  }
}
