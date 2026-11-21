import { useEffect, useRef, useState } from 'react'
import Icon from './Icons.jsx'

// A Download button that answers the tap at once. The file comes from GitHub, which first sends the browser on to its
// download server; that takes a few seconds and the page looks frozen meanwhile. So after a tap the button says
// "Starting download…", then "Downloading…", then goes back to normal (the browser's own download box takes over).
// A web page is never told when a browser really starts a download, so the second step comes as soon as the browser
// reacts (the page loses focus when its download box or save window opens) or after 5 seconds, whichever is first.
// Nor is it told when the download finishes, is cancelled or paused, so the button goes back to normal as soon as the
// person comes back to the page (focus, a tap or a key press, after a short grace) and at the latest after 25 seconds.
export default function DownloadLink({ href, className, startText = 'Starting download…', doneText = 'Downloading…', children }) {
  const [step, setStep] = useState('idle') // idle → starting → downloading → idle
  const timers = useRef([])
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => clear, [])
  useEffect(() => {
    if (step !== 'starting') return undefined
    const go = () => setStep('downloading')
    const onHide = () => { if (document.visibilityState === 'hidden') go() }
    window.addEventListener('blur', go)
    document.addEventListener('visibilitychange', onHide)
    return () => { window.removeEventListener('blur', go); document.removeEventListener('visibilitychange', onHide) }
  }, [step])
  useEffect(() => {
    if (step !== 'downloading') return undefined
    let armed = false
    const grace = setTimeout(() => { armed = true }, 1500) // the focus change that opened the download box must not count
    const back = () => { if (armed) { clear(); setStep('idle') } }
    const onShow = () => { if (document.visibilityState === 'visible') back() }
    window.addEventListener('focus', back)
    document.addEventListener('visibilitychange', onShow)
    document.addEventListener('pointerdown', back)
    document.addEventListener('keydown', back)
    return () => {
      clearTimeout(grace)
      window.removeEventListener('focus', back)
      document.removeEventListener('visibilitychange', onShow)
      document.removeEventListener('pointerdown', back)
      document.removeEventListener('keydown', back)
    }
  }, [step])
  const start = () => {
    clear()
    setStep('starting')
    timers.current = [setTimeout(() => setStep((s) => (s === 'starting' ? 'downloading' : s)), 5000), setTimeout(() => setStep('idle'), 25000)]
  }
  return (
    <a href={href} data-track="download" className={className} onClick={start} aria-busy={step !== 'idle'}>
      {step === 'starting' && <><span className="dl-spin" aria-hidden="true" /> {startText}</>}
      {step === 'downloading' && <><Icon name="download" size={15} /> {doneText}</>}
      {step === 'idle' && children}
    </a>
  )
}
