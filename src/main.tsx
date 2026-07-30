import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Reload should always restart the wave/menu animation from the top —
// the browser's default scroll restoration re-applies the pre-reload
// scrollY before our onScroll-synced animations mount, which makes them
// resume mid-progress (or already-finished) instead of playing from
// their entrance state.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}
window.scrollTo(0, 0)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
