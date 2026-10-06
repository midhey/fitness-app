import { useEffect, useRef, useSyncExternalStore } from 'react'

/**
 * Хеш-маршрутизация + интеграция с системной кнопкой «Назад» Android:
 * каждая открытая шторка добавляет запись в history и закрывается по «Назад».
 * Записи шторок безымянные — считаем только их количество.
 */

export type Route = 'home' | 'plan' | 'posture' | 'progress' | 'workout' | 'cardio' | 'posture-session'

const ROUTES: Route[] = ['home', 'plan', 'posture', 'progress', 'workout', 'cardio', 'posture-session']

function read(): Route {
  const h = location.hash.replace(/^#\/?/, '').split('?')[0]
  return (ROUTES as string[]).includes(h) ? (h as Route) : 'home'
}

const listeners = new Set<() => void>()
function emit() {
  for (const l of listeners) l()
}
window.addEventListener('hashchange', emit)

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, read, read)
}

// ---------- шторки ----------

interface Entry {
  close: () => void
  handled: boolean
}

const stack: Entry[] = []
let pendingBack = 0
let suppress = 0
let afterBack: (() => void)[] = []

function flush() {
  if (pendingBack <= 0) return
  const n = pendingBack
  pendingBack = 0
  suppress++
  history.go(-n)
}

window.addEventListener('popstate', () => {
  if (suppress > 0) {
    suppress--
    const cbs = afterBack
    afterBack = []
    for (const cb of cbs) cb()
    return
  }
  const top = stack.pop()
  if (top) {
    top.handled = true
    top.close()
  }
})

export function useBackClose(open: boolean, onClose: () => void) {
  const ref = useRef(onClose)
  ref.current = onClose
  useEffect(() => {
    if (!open) return
    history.pushState({ sheet: true }, '')
    const entry: Entry = { close: () => ref.current(), handled: false }
    stack.push(entry)
    return () => {
      const i = stack.indexOf(entry)
      if (i >= 0) stack.splice(i, 1)
      if (!entry.handled) {
        entry.handled = true
        pendingBack++
        queueMicrotask(flush)
      }
    }
  }, [open])
}

// ---------- переходы ----------

/** Сначала убирает из history записи открытых шторок, затем выполняет переход */
function afterSheets(fn: () => void) {
  const open = stack.length + pendingBack
  if (open > 0) {
    for (const e of stack) e.handled = true
    stack.length = 0
    pendingBack = 0
    suppress++
    afterBack.push(fn)
    history.go(-open)
    return
  }
  fn()
}

/** Записи, добавленные самим приложением, помечаются { app: true } — по ним можно вернуться назад */
export function navigate(to: Route, opts: { replace?: boolean } = {}) {
  const hash = to === 'home' ? '#/' : `#/${to}`
  afterSheets(() => {
    if (opts.replace) {
      history.replaceState({ app: !!(history.state && history.state.app) }, '', hash)
      emit()
    } else if (location.hash !== hash) {
      history.pushState({ app: true }, '', hash)
      emit()
    }
    window.scrollTo(0, 0)
  })
}

/** Стрелка «назад» в полноэкранных режимах: вернуться туда, откуда пришли, или на запасной экран */
export function goBack(fallback: Route) {
  afterSheets(() => {
    if (history.state && history.state.app) history.back()
    else navigate(fallback, { replace: true })
  })
}
