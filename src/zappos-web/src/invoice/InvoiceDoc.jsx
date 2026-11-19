import Icon from '../components/Icons.jsx'

// The invoice as the client sees it (the private link page) and as you see it in the admin (Bills → view). It is a
// document: it stays paper-white in dark mode, like receipts, and is the only thing printed (Download PDF = print to PDF).
// `inv` has the shape invoice_view() returns (supabase/schema.sql §19); `t` is the "invoice" text in landing-content.json.
export const invoiceNo = (inv) => `${inv.kind === 'estimate' ? 'EST' : 'INV'}-${inv.no}`
export const fill = (s, vars) => String(s ?? '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
export const rupees = (n) => `Rs ${Math.round(n ?? 0).toLocaleString('en-PK')}`
export const day = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

// Lines, subtotal, discount, tax and total, the same sums as the database's bill_total(). An old one-line bill has no items:
// it shows as one line with its amount.
export function totals(inv) {
  const items = inv.items?.length ? inv.items : [{ desc: inv.title, qty: 1, price: inv.amount }]
  const sub = items.reduce((s, l) => s + Number(l.qty) * Number(l.price), 0)
  const discount = inv.items?.length ? Number(inv.discount || 0) : 0
  const taxPct = inv.items?.length ? Number(inv.tax_pct || 0) : 0
  const tax = Math.round((sub - discount) * taxPct / 100)
  return { items, sub, discount, taxPct, tax, total: inv.items?.length ? Math.round((sub - discount) * (1 + taxPct / 100)) : inv.amount }
}

export function invoiceState(inv, t) {
  const today = new Date().toLocaleDateString('en-CA')
  if (inv.status === 'paid') return { id: 'paid', text: t.statusPaid }
  if (inv.kind === 'estimate') return { id: 'estimate', text: fill(t.statusEstimate, { date: day(inv.due_on) }) }
  if (inv.status === 'proof') return { id: 'proof', text: t.statusProof }
  if (inv.due_on < today) return { id: 'late', text: fill(t.statusLate, { date: day(inv.due_on) }) }
  return { id: 'open', text: fill(t.statusUnpaid, { date: day(inv.due_on) }) }
}

export default function InvoiceDoc({ inv, t }) {
  const from = inv.from ?? {}
  const c = inv.client ?? {}
  const sum = totals(inv)
  const state = invoiceState(inv, t)
  return (
    <article className="inv-doc">
      {state.id === 'paid' && <div className="inv-stamp" aria-hidden="true">{t.paidStamp}</div>}
      <header className="inv-head">
        <div className="inv-from">
          <span className="inv-logo"><Icon name="zap" size={22} /></span>
          <div>
            <b>{from.business || 'ZAP POS'}</b>
            <small>{[from.owner_name, from.address, from.phone, from.email].filter(Boolean).join(' · ')}</small>
          </div>
        </div>
        <div className="inv-title">
          <h1>{inv.kind === 'estimate' ? t.estimateTitle : t.title}</h1>
          <span className="inv-no">{invoiceNo(inv)}</span>
          <span className={`inv-state ${state.id}`}>{state.text}</span>
        </div>
      </header>

      <section className="inv-parties">
        <div>
          <small>{t.billTo}</small>
          <b>{c.shop || c.name}</b>
          <span>{[c.shop ? c.name : null, c.phone].filter(Boolean).join(' · ')}</span>
          {c.city && <span>{c.city}</span>}
        </div>
        <div className="inv-dates">
          <small>{t.issued}</small><b>{day(inv.issued_on)}</b>
          <small>{inv.kind === 'estimate' ? t.validUntil : t.due}</small><b>{day(inv.due_on)}</b>
        </div>
      </section>

      <table className="inv-lines">
        <thead><tr><th>{t.itemCol}</th><th className="c">{t.qtyCol}</th><th className="n">{t.priceCol}</th><th className="n">{t.amountCol}</th></tr></thead>
        <tbody>
          {sum.items.map((l, i) => (
            <tr key={i}>
              <td>{l.desc}{l.note && <small>{l.note}</small>}</td>
              <td className="c">{Number(l.qty).toLocaleString('en-PK')}</td>
              <td className="n">{Math.round(l.price).toLocaleString('en-PK')}</td>
              <td className="n">{Math.round(l.qty * l.price).toLocaleString('en-PK')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="inv-sums">
        <div><span>{t.subtotal}</span><span>{rupees(sum.sub)}</span></div>
        {sum.discount > 0 && <div><span>{t.discount}</span><span>– {rupees(sum.discount)}</span></div>}
        {sum.taxPct > 0 && <div><span>{t.tax} ({sum.taxPct}%)</span><span>{rupees(sum.tax)}</span></div>}
        <div className="inv-total"><span>{t.total}</span><span>{rupees(sum.total)}</span></div>
      </div>

      {inv.status === 'paid' && inv.paid_on && <p className="inv-paid">{fill(t.paidOn, { date: day(inv.paid_on) })}</p>}
      {from.pay_details && inv.status !== 'paid' && inv.kind !== 'estimate' && (
        <div className="inv-pay"><b>{t.howToPay}</b><span>{from.pay_details}</span></div>
      )}
      {(inv.note || from.note) && <p className="inv-note">{[inv.note, from.note].filter(Boolean).join('\n')}</p>}
    </article>
  )
}
