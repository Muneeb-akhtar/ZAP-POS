import React from 'react'
import ReactDOM from 'react-dom/client'
import AccountApp from './AccountApp.jsx'
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

// Makes /account/ installable on phones (public/account/sw.js; caches only the app's own files, never business data).
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/account/sw.js', { scope: '/account/' }).catch(() => {}))
