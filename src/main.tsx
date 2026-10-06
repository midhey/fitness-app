import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { Gallery } from './dev/Gallery'

const gallery = import.meta.env.DEV && new URLSearchParams(location.search).has('gallery')

createRoot(document.getElementById('root')!).render(<StrictMode>{gallery ? <Gallery /> : <App />}</StrictMode>)

// Офлайн-работа после первой загрузки (только в собранной версии)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined)
  })
}
