import { createContext, useContext, useEffect, useState } from 'react'
import Icon from '../components/Icons.jsx'
import { statusLabel } from './biz.js'

// Small building blocks shared by the admin pages.

// Page header: an icon tile, a big title (with the website's yellow squiggle), a small line under it, actions on the right.
export function PageBar({ title, sub, icon, children }) {
  return (
    <header className="adm-bar">
      <div className="adm-bar-head">
        {icon && <span className="adm-bar-ic"><Icon name={icon} size={20} /></span>}
        <div>
          <h1><span className="adm-title">{title}<svg viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true"><path d="M3 8 Q50 2 100 7 T197 5" pathLength="1" /></svg></span></h1>
          {sub && <p className="adm-status">{sub}</p>}
        </div>
      </div>
      {children && <div className="adm-bar-actions">{children}</div>}
    </header>
  )
}

// Under a table: how many rows, and that the data is live from Supabase.
export const TableFoot = ({ count, noun = 'entries' }) => (
  <div className="adm-table-foot"><span>Showing {count} {count === 1 ? noun.replace(/ies$/, 'y').replace(/s$/, '') : noun}</span><span className="adm-live">Live from Supabase <i /></span></div>
)

export const StatusPill = ({ status }) => <span className={`adm-pill s-${status}`}>{statusLabel(status)}</span>

export function Card({ title, action, children, className = '' }) {
  return (
    <section className={`adm-block ${className}`}>
      {(title || action) && <div className="adm-block-head"><h2>{title}</h2>{action}</div>}
      {children}
    </section>
  )
}

// Two-step delete: first click arms it, second click within 3 s does it.
export function ConfirmButton({ onConfirm, children = 'Delete', confirmText = 'Sure? Delete', className = '' }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t) }, [armed])
  return (
    <button type="button" className={`btn btn-sm ${armed ? 'adm-danger' : 'btn-quiet'} ${className}`} onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? confirmText : children}
    </button>
  )
}

// Modal sheet for forms (centered on desktop, bottom sheet on phones).
export function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="adm-sheet-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="adm-sheet-head">
          <h2>{title}</h2>
          <button type="button" className="adm-icon-btn plain" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// Toasts: notify('Saved') / notify('Couldn't save', 'error').
export const ToastContext = createContext(() => {})
export const useNotify = () => useContext(ToastContext)

export function Toasts({ items }) {
  return (
    <div className="adm-toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`adm-toast ${t.kind}`}><Icon name={t.kind === 'error' ? 'close' : 'check'} size={15} /> {t.text}</div>
      ))}
    </div>
  )
}

export function Field({ label, children, wide, hint }) {
  return (
    <label className={`adm-field ${wide ? 'wide' : ''}`}>
      <span className="adm-label">{label}</span>
      {children}
      {hint && <small className="adm-hint">{hint}</small>}
    </label>
  )
}
