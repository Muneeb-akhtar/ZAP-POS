import React from 'react'
import ReactDOM from 'react-dom/client'
import AccountApp from './AccountApp.jsx'
import { isPhone } from './ownerData.js'
// Same fonts, tokens and form/table styles as the admin panel.
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/jetbrains-mono/latin-400.css'   // the phone console's figures (receipt font)
import '@fontsource/jetbrains-mono/latin-700.css'
import '../styles.css'
import '../admin/admin.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AccountApp />
  </React.StrictMode>
)

// Makes /account/ installable on phones only (manifest + public/account/sw.js, which keeps the app's own files).
// On a computer there is no manifest and no worker, so Chrome/Edge on Windows never show "Install app";
// a worker left from an earlier visit on a computer is removed.
if (isPhone()) {
  const link = Object.assign(document.createElement('link'), { rel: 'manifest', href: '/account/manifest.webmanifest' })
  document.head.appendChild(link)
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/account/sw.js', { scope: '/account/' }).catch(() => {}))
} else if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {})
}
