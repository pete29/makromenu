import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// Registers the hook that puts new data in the shared plan; must load before anything is written.
import './data/household'
import { migrateLegacyDatabase } from './data/migrateLegacy'

// Ask the browser not to evict the plan and recipes when storage runs low or the app sits unused.
navigator.storage?.persist?.().catch(() => {})

// Data from the version before cloud sync is moved over before the first render.
migrateLegacyDatabase()
  .catch((err) => console.error('Migrating the old database failed', err))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
