import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Fonts are bundled with the app (no Google Fonts request needed). Latin subsets only.
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-700.css'
import '@fontsource/caveat/latin-700.css'
import './styles.css'

// The built page already holds the landing page as plain HTML (scripts/prerender.mjs), plus the content it was made
// from. When both are there, React reuses that HTML (hydrates); in `npm run dev` there is neither, so it draws the page.
const root = document.getElementById('root')
const snapshot = document.getElementById('zap-content')
const hydrate = Boolean(snapshot && root.hasChildNodes())
const path = location.pathname.replace(/\/+$/, '') || '/'

async function start() {
  // Built page: the text comes from the snapshot. `npm run dev`: load the built-in text now (kept out of the public bundle).
  const initialContent = hydrate ? JSON.parse(snapshot.textContent) : (await import('./content/landing-content.json')).default
  const app = (
    <React.StrictMode>
      <App initialContent={initialContent} path={path} />
    </React.StrictMode>
  )
  if (hydrate) ReactDOM.hydrateRoot(root, app)
  else ReactDOM.createRoot(root).render(app)
}
start()
