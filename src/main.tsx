import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DataProvider } from './data/store.tsx'
import './ui/useInstallPrompt'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <App />
    </DataProvider>
  </StrictMode>,
)

// Minimal pass-through service worker: makes the app installable, caches nothing.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch((err) => console.warn('Service worker no registrado', err))
  })
}

// After a deploy, an app left open still points at the previous build's chunk
// files, which no longer exist. Reload once to pick up the new version.
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('reloadedForChunks') ?? 0)
    if (Date.now() - last < 30_000) return
    sessionStorage.setItem('reloadedForChunks', String(Date.now()))
  } catch {
    /* storage unavailable: still reload */
  }
  event.preventDefault()
  window.location.reload()
})
