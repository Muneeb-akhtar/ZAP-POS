import Icon from './Icons.jsx'

// Round WhatsApp button fixed to the bottom-right corner; it stays in view while the page scrolls.
// On mouse devices it grows to show its label on hover. Hidden until a real WhatsApp link is set (not "#").
export default function WhatsAppFloat({ data, links }) {
  if (!data.label || !links.whatsapp || links.whatsapp === '#') return null
  return (
    <a className="wa-float" href={links.whatsapp} target="_blank" rel="noopener noreferrer" data-track="whatsapp" aria-label={data.label}>
      <Icon name="whatsapp" size={30} fill />
      <span className="wa-float-label">{data.label}</span>
    </a>
  )
}
