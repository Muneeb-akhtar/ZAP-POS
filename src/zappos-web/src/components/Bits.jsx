import Icon from './Icons.jsx'

// Small shared pieces used across sections.

export const Kicker = ({ children, icon = 'zap', light = false }) => (
  <span className={`kicker ${light ? 'light' : ''}`}><Icon name={icon} size={13} />{children}</span>
)

// Handwritten note with a hand-drawn arrow. dir: which way the arrow points.
export const Scribble = ({ children, dir = 'left', className = '' }) => (
  <span className={`scribble ${dir} ${className}`}>
    {dir === 'left' && <Arrow />}
    <span>{children}</span>
    {dir !== 'left' && <Arrow flip />}
  </span>
)

const Arrow = ({ flip = false }) => (
  <svg className={`arrow ${flip ? 'flip' : ''}`} width="46" height="30" viewBox="0 0 46 30" fill="none" aria-hidden="true">
    <path d="M44 6C32 2 14 4 5 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M3 13 5 23l9-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// Hand-drawn yellow underline that "draws" itself (used under the hero headline).
export const Squiggle = () => (
  <svg className="squiggle" viewBox="0 0 300 18" preserveAspectRatio="none" aria-hidden="true">
    <path d="M3 12C40 4 70 15 110 9s80-6 120-1 50 4 67 0" />
  </svg>
)

export const Stars = ({ size = 14 }) => (
  <span className="stars">{[...Array(5)].map((_, i) => <Icon key={i} name="star" size={size} fill />)}</span>
)

// Deterministic fake barcode generated from a string.
export const Barcode = ({ seed = 'ZAP' }) => {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const bars = []
  let x = 0
  for (let i = 0; x < 200; i++) {
    h = (h * 1103515245 + 12345) >>> 0
    const w = 1 + (h % 3)
    if (i % 2 === 0) bars.push(<rect key={i} x={x} y="0" width={w} height="34" />)
    x += w + 1
  }
  return <svg className="barcode" viewBox="0 0 200 34" preserveAspectRatio="none" aria-hidden="true">{bars}</svg>
}

export const formatRs = (n) => `Rs. ${n.toLocaleString('en-PK')}`
