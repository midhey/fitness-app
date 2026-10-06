import { useSyncExternalStore } from 'react'

let current: string | null = null
const ls = new Set<() => void>()

export function toast(text: string) {
  current = text
  for (const l of ls) l()
}

export function clearToast() {
  current = null
  for (const l of ls) l()
}

export function useToast() {
  return useSyncExternalStore(
    (l) => {
      ls.add(l)
      return () => ls.delete(l)
    },
    () => current,
  )
}
