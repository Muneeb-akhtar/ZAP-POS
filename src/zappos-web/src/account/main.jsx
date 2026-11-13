import React from 'react'
import ReactDOM from 'react-dom/client'
import AccountApp from './AccountApp.jsx'
// Same fonts, tokens and form/table styles as the admin panel.
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '../styles.css'
import '../admin/admin.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AccountApp />
  </React.StrictMode>
)
