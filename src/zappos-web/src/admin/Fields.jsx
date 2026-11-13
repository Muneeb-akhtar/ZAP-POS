import { createContext, useContext, useEffect, useRef, useState } from 'react'
import Icon, { iconNames } from '../components/Icons.jsx'
import { CHOICES, HINTS, humanize } from './sections.js'

// The whole content object, so special fields (e.g. comparison values) can read plan names.
export const RootContext = createContext(null)

// ---------- helpers ----------
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const LONG_KEYS = new Set(['text', 'description', 'a', 'about', 'note'])

// An empty item shaped like an existing one (used by "Add").
function blankLike(sample) {
  if (Array.isArray(sample)) return sample.length && Array.isArray(sample[0]) ? [] : sample.map(blankLike)
  if (isObj(sample)) return Object.fromEntries(Object.entries(sample).map(([k, v]) => [k, blankLike(v)]))
  if (typeof sample === 'number') return 0
  if (typeof sample === 'boolean') return false
  return ''
}

// First readable text in an item, used as its title when collapsed.
function summaryOf(v) {
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.map(summaryOf).filter(Boolean).join(' · ')
  if (isObj(v)) {
    for (const k of ['name', 'label', 'title', 'q', 'group', 'text', 'time', 'lead']) if (typeof v[k] === 'string' && v[k]) return v[k]
    for (const x of Object.values(v)) { const s = summaryOf(x); if (s) return s }
  }
  return ''
}

function AutoTextarea({ value, onChange, ...rest }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])
  return <textarea ref={ref} rows={2} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
}

function FieldShell({ label, hint, children, wide }) {
  return (
    <label className={`adm-field ${wide ? 'wide' : ''}`}>
      <span className="adm-label">{label}</span>
      {children}
      {hint && <span className="adm-hint">{hint}</span>}
    </label>
  )
}

// ---------- leaf editors ----------
function TextField({ name, value, onChange }) {
  const long = LONG_KEYS.has(name) || value.length > 70
  if (name === 'icon') {
    return (
      <FieldShell label="Icon" hint="Icon shown next to this item.">
        <span className="adm-icon-pick">
          <span className="adm-icon-prev"><Icon name={value} size={16} /></span>
          <select value={value} onChange={(e) => onChange(e.target.value)}>
            {!iconNames.includes(value) && <option value={value}>{value || '(none)'}</option>}
            {iconNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </span>
      </FieldShell>
    )
  }
  if (CHOICES[name]) {
    return (
      <FieldShell label={humanize(name)} hint={HINTS[name]}>
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {CHOICES[name].map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </FieldShell>
    )
  }
  return (
    <FieldShell label={humanize(name)} hint={HINTS[name]} wide={long}>
      {long ? <AutoTextarea value={value} onChange={onChange} /> : <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />}
    </FieldShell>
  )
}

function NumberField({ name, value, onChange }) {
  return (
    <FieldShell label={humanize(name)} hint={HINTS[name]}>
      <input
        type="number"
        inputMode="numeric"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    </FieldShell>
  )
}

function BoolField({ name, value, onChange }) {
  return (
    <label className="adm-field adm-switch-field">
      <span className="adm-label">{humanize(name)}</span>
      <button type="button" role="switch" aria-checked={value} className={`adm-switch ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
        <i />
      </button>
      {HINTS[name] && <span className="adm-hint">{HINTS[name]}</span>}
    </label>
  )
}

// Comparison table cell: Included / Not included / custom text, one per plan.
function CompareValues({ value, onChange }) {
  const root = useContext(RootContext)
  const plans = root?.pricing?.plans ?? []
  const set = (i, v) => onChange(value.map((x, j) => (j === i ? v : x)))
  return (
    <div className="adm-field wide">
      <span className="adm-label">Per plan</span>
      <div className="adm-cmp">
        {value.map((v, i) => {
          const mode = v === true ? 'yes' : v === false ? 'no' : 'text'
          return (
            <div className="adm-cmp-cell" key={i}>
              <small>{plans[i]?.name ?? `Plan ${i + 1}`}</small>
              <select value={mode} onChange={(e) => set(i, e.target.value === 'yes' ? true : e.target.value === 'no' ? false : '')}>
                <option value="yes">✓ Included</option>
                <option value="no">– Not included</option>
                <option value="text">Text…</option>
              </select>
              {mode === 'text' && <input type="text" value={v} placeholder="e.g. Unlimited" onChange={(e) => set(i, e.target.value)} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Receipt line: [mark, text], e.g. ["✓", "Daily cloud backup"]
function PairRow({ value, onChange }) {
  return (
    <div className="adm-pair">
      <input type="text" className="mark" value={value[0] ?? ''} onChange={(e) => onChange([e.target.value, value[1] ?? ''])} aria-label="Mark" />
      <input type="text" value={value[1] ?? ''} onChange={(e) => onChange([value[0] ?? '', e.target.value])} aria-label="Text" />
    </div>
  )
}

// ---------- lists ----------
function ItemActions({ index, count, onMove, onRemove }) {
  const [confirm, setConfirm] = useState(false)
  useEffect(() => { if (!confirm) return; const t = setTimeout(() => setConfirm(false), 2500); return () => clearTimeout(t) }, [confirm])
  return (
    <span className="adm-item-actions" onClick={(e) => e.stopPropagation()}>
      <button type="button" title="Move up" disabled={index === 0} onClick={() => onMove(index, -1)}><Icon name="chevD" size={15} className="flip" /></button>
      <button type="button" title="Move down" disabled={index === count - 1} onClick={() => onMove(index, 1)}><Icon name="chevD" size={15} /></button>
      {confirm
        ? <button type="button" className="danger confirm" onClick={() => onRemove(index)}>Delete?</button>
        : <button type="button" className="danger" title="Delete" onClick={() => setConfirm(true)}><Icon name="close" size={15} /></button>}
    </span>
  )
}

function ArrayField({ name, value, onChange, depth }) {
  const root = useContext(RootContext)
  const move = (i, d) => { const a = [...value]; [a[i], a[i + d]] = [a[i + d], a[i]]; onChange(a) }
  const remove = (i) => onChange(value.filter((_, j) => j !== i))
  const setAt = (i, v) => onChange(value.map((x, j) => (j === i ? v : x)))
  const add = (item) => onChange([...value, item])

  const primitives = value.every((v) => typeof v === 'string')
  const pairs = value.length > 0 && value.every((v) => Array.isArray(v))

  // Simple text list: one input per line
  if (primitives && name !== 'lines') {
    return (
      <div className="adm-field wide">
        <span className="adm-label">{humanize(name)} <em>{value.length}</em></span>
        <div className="adm-list">
          {value.map((v, i) => (
            <div className="adm-list-row" key={i}>
              <input type="text" value={v} onChange={(e) => setAt(i, e.target.value)} />
              <ItemActions index={i} count={value.length} onMove={move} onRemove={remove} />
            </div>
          ))}
        </div>
        <button type="button" className="adm-add" onClick={() => add('')}><Icon name="plus" size={14} /> Add</button>
      </div>
    )
  }

  // Receipt lines: [mark, text]
  if (pairs || name === 'lines') {
    return (
      <div className="adm-field wide">
        <span className="adm-label">{humanize(name)} <em>{value.length}</em></span>
        <span className="adm-hint">Left box: ✓, a number (1, 1–3, 4+) or ∞. Right box: the text.</span>
        <div className="adm-list">
          {value.map((v, i) => (
            <div className="adm-list-row" key={i}>
              <PairRow value={v} onChange={(nv) => setAt(i, nv)} />
              <ItemActions index={i} count={value.length} onMove={move} onRemove={remove} />
            </div>
          ))}
        </div>
        <button type="button" className="adm-add" onClick={() => add(['✓', ''])}><Icon name="plus" size={14} /> Add line</button>
      </div>
    )
  }

  // Objects: collapsible cards
  return (
    <div className="adm-field wide">
      <span className="adm-label">{humanize(name)} <em>{value.length}</em></span>
      <div className="adm-cards">
        {value.map((item, i) => (
          <ItemCard key={i} index={i} count={value.length} item={item} onMove={move} onRemove={remove} onChange={(v) => setAt(i, v)} depth={depth} />
        ))}
        {value.length === 0 && <p className="adm-empty">Nothing here yet.</p>}
      </div>
      {name === 'compare' ? (
        <div className="adm-add-row">
          <button type="button" className="adm-add" onClick={() => add({ group: '' })}><Icon name="plus" size={14} /> Add group heading</button>
          <button type="button" className="adm-add" onClick={() => add({ label: '', values: (root?.pricing?.plans ?? []).map(() => false) })}><Icon name="plus" size={14} /> Add feature row</button>
        </div>
      ) : (
        <button type="button" className="adm-add" onClick={() => add(value.length ? blankLike(value.find((x) => isObj(x)) ?? value[0]) : { text: '' })}>
          <Icon name="plus" size={14} /> Add {name === 'reviews' ? 'review' : name === 'items' ? 'item' : 'one'}
        </button>
      )}
    </div>
  )
}

function ItemCard({ index, count, item, onMove, onRemove, onChange, depth }) {
  const [open, setOpen] = useState(false)
  const title = summaryOf(item) || `Item ${index + 1}`
  return (
    <div className={`adm-card ${open ? 'open' : ''}`}>
      <div className="adm-card-head" role="button" tabIndex={0} onClick={() => setOpen(!open)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen(!open))}>
        <span className="adm-card-num">{index + 1}</span>
        <span className="adm-card-title">{isObj(item) && 'group' in item && !('label' in item) ? <b>{title}</b> : title}</span>
        <ItemActions index={index} count={count} onMove={onMove} onRemove={onRemove} />
        <Icon name="chevD" size={16} className="adm-chev" />
      </div>
      {open && <div className="adm-card-body"><Value name="" value={item} onChange={onChange} depth={depth + 1} /></div>}
    </div>
  )
}

// ---------- object / dispatcher ----------
function ObjectFields({ value, onChange, depth }) {
  return (
    <div className="adm-grid">
      {Object.entries(value).filter(([k]) => !k.startsWith('_')).map(([k, v]) => (
        <Value key={k} name={k} value={v} depth={depth} onChange={(nv) => onChange({ ...value, [k]: nv })} />
      ))}
    </div>
  )
}

export function Value({ name, value, onChange, depth = 0 }) {
  if (name === 'values' && Array.isArray(value)) return <CompareValues value={value} onChange={onChange} />
  if (Array.isArray(value)) return <ArrayField name={name} value={value} onChange={onChange} depth={depth} />
  if (isObj(value)) {
    if (!name) return <ObjectFields value={value} onChange={onChange} depth={depth} />
    return (
      <fieldset className="adm-group">
        <legend>{humanize(name)}</legend>
        <ObjectFields value={value} onChange={onChange} depth={depth + 1} />
      </fieldset>
    )
  }
  if (typeof value === 'boolean') return <BoolField name={name} value={value} onChange={onChange} />
  if (typeof value === 'number' || value === null || ['monthly', 'annual', 'stock'].includes(name)) return <NumberField name={name} value={value} onChange={onChange} />
  return <TextField name={name} value={String(value ?? '')} onChange={onChange} />
}
