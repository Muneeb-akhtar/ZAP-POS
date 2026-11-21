import { useEffect, useRef, useState } from 'react'

// A Download button that answers the tap at once. The file comes from GitHub, which first sends the browser on to its
// download server; that takes a few seconds and the page looks frozen meanwhile. So after a tap the button says it is
// starting, then goes back to normal (the browser's own download box takes over).
export default function DownloadLink({ href, className, busyText = 'Starting download…', children }) {
  const [busy, setBusy] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const start = () => {
    setBusy(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setBusy(false), 12000)
  }
  return (
    <a href={href} data-track="download" className={className} onClick={start} aria-busy={busy}>
      {busy ? <><span className="dl-spin" aria-hidden="true" /> {busyText}</> : children}
    </a>
  )
}
