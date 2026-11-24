import { useEffect, useState } from 'react'
import Icon from '../components/Icons.jsx'

// "Put ZAP POS on your phone" card for the owner console. Android/Chrome gives us an install prompt (button);
// iPhone Safari has none, so we show how to use Share → Add to Home Screen. Hidden once installed or dismissed.
const KEY = 'zap-install-dismissed'
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent)
const dismissed = () => { try { return localStorage.getItem(KEY) === '1' } catch { return false } }

export default function InstallHint({ o }) {
  const [prompt, setPrompt] = useState(null)
  const [hidden, setHidden] = useState(() => dismissed() || standalone())
  useEffect(() => {
    const on = (e) => { e.preventDefault(); setPrompt(e) }
    const done = () => setHidden(true)
    window.addEventListener('beforeinstallprompt', on)
    window.addEventListener('appinstalled', done)
    return () => { window.removeEventListener('beforeinstallprompt', on); window.removeEventListener('appinstalled', done) }
  }, [])
  const ios = isIos()
  if (hidden || (!prompt && !ios)) return null
  const dismiss = () => { try { localStorage.setItem(KEY, '1') } catch { /* private mode: just hide for now */ } setHidden(true) }
  const install = async () => { prompt.prompt(); await prompt.userChoice; setPrompt(null); setHidden(true) }
  return (
    <div className="own-install" role="region" aria-label={o.installTitle}>
      <span className="own-install-icon"><Icon name="zap" size={18} /></span>
      <span className="own-install-text"><b>{o.installTitle}</b><span>{prompt ? o.installText : o.installIos}</span></span>
      {prompt && <button className="btn btn-primary btn-sm" onClick={install}><Icon name="download" size={14} /> {o.installButton}</button>}
      <button className="btn btn-quiet btn-sm" onClick={dismiss}>{o.installDismiss}</button>
    </div>
  )
}
