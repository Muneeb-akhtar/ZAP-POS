import React from 'react'
import ReactDOM from 'react-dom/client'
import InvoicePage from './InvoicePage.jsx'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '../styles.css'
import './invoice.css'
import './page.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <InvoicePage />
  </React.StrictMode>
)
