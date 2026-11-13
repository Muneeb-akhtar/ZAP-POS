import { useMemo, useState } from 'react'
import { pct, statusLabel, toDay, useBiz, useStats } from './biz.js'
import { BarList, Bars, Funnel, Stat } from './Charts.jsx'
import { Card, PageBar } from './ui.jsx'

const CLICK_LABELS = {
  demo: 'Book a demo', whatsapp: 'WhatsApp', download: 'Download for Windows', portal: 'Portal login',
  android: 'Google Play', ios: 'App Store', email: 'Email',
}
const DEVICE_LABELS = { mobile: 'Mobile', desktop: 'Desktop', tablet: 'Tablet' }

export const dailySeries = (stats, key) => (stats?.daily ?? []).map((d) => ({
  key: d.date,
  label: new Date(`${d.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
  short: new Date(`${d.date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  value: d[key],
}))

// Why stats might be missing, in plain words.
export function StatsError({ error }) {
  return <p className="adm-intro warn">Couldn't load visitor stats ({error}). Run the latest <code>supabase/schema.sql</code> in Supabase → SQL Editor.</p>
}

const countBy = (rows, key, fallback = 'Not given') => {
  const m = new Map()
  for (const r of rows) { const k = (r[key] ?? '').toString().trim() || fallback; m.set(k, (m.get(k) ?? 0) + 1) }
  return [...m].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8)
}

export default function Analytics() {
  const [days, setDays] = useState(30)
  const { stats, error } = useStats(days)
  const { leads, payments } = useBiz()
  const t = stats?.totals

  // Leads that arrived in this range, and how far they got.
  const since = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - (days - 1)); return d.toLocaleDateString('en-CA') }, [days])
  const rangeLeads = leads.filter((l) => toDay(l.created_at) >= since)
  const paidIds = new Set(payments.map((p) => p.lead_id))
  const won = rangeLeads.filter((l) => l.status === 'won')
  const paid = rangeLeads.filter((l) => paidIds.has(l.id))

  return (
    <>
      <PageBar title="Analytics" sub="Visitors, clicks and where your leads come from. Anonymous: no cookies, no personal data.">
        <div className="adm-range" role="group" aria-label="Date range">
          {[7, 30, 90].map((d) => <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{d} days</button>)}
        </div>
      </PageBar>

      <div className="adm-panel wide">
        {error && <StatsError error={error} />}
        <div className="adm-stats">
          <Stat icon="users" label="Visitors" value={t ? t.visitors.toLocaleString('en-PK') : '…'} cur={t?.visitors} prev={t?.prevVisitors} sub={`vs previous ${days} days`} />
          <Stat icon="monitor" label="Page visits" value={t ? t.visits.toLocaleString('en-PK') : '…'} cur={t?.visits} prev={t?.prevVisits} sub="incl. repeat visits" />
          <Stat icon="mail" label="Demo requests" value={t ? t.leads : '…'} cur={t?.leads} prev={t?.prevLeads} sub="leads in this range" />
          <Stat icon="chart" label="Conversion" value={t ? pct(t.leads, t.visitors) : '…'} sub="visitors who sent a request" />
        </div>

        <div className="adm-two">
          <Card title="Visitors per day" className="span2">
            {stats ? <Bars data={dailySeries(stats, 'visitors')} name="visitors" /> : <div className="adm-skel" />}
          </Card>
          <Card title="Journey: from visit to payment" className="span2">
            {t ? (
              <Funnel steps={[
                { label: 'Visited the site', value: t.visitors, hint: 'unique visitors' },
                { label: 'Saw the pricing', value: t.sawPricing, hint: 'scrolled to the price receipts' },
                { label: 'Clicked to contact or download', value: t.clickedCta, hint: 'demo, WhatsApp or download' },
                { label: 'Sent a demo request', value: rangeLeads.length, hint: 'leads received' },
                { label: 'Became customers', value: won.length, hint: 'marked Customer' },
                { label: 'Paid', value: paid.length, hint: 'with at least one payment' },
              ]} />
            ) : <div className="adm-skel" />}
          </Card>
          <Card title="Demo requests per day" className="span2">
            {stats ? <Bars data={dailySeries(stats, 'leads')} name="requests" height={120} /> : <div className="adm-skel short" />}
          </Card>
          <Card title="Button clicks">
            <BarList items={Object.entries(stats?.clicks ?? {}).map(([k, v]) => ({ label: CLICK_LABELS[k] ?? k, value: v })).sort((a, b) => b.value - a.value)} empty="No clicks yet." />
          </Card>
          <Card title="Devices">
            <BarList items={Object.entries(stats?.devices ?? {}).map(([k, v]) => ({ label: DEVICE_LABELS[k] ?? k, value: v })).sort((a, b) => b.value - a.value)} empty="No visits yet." />
          </Card>
          <Card title="Where visitors come from">
            <BarList items={(stats?.referrers ?? []).map((r) => ({ label: r.name, value: r.n }))} empty="No visits yet." />
          </Card>
          <Card title="Ad campaigns (utm tags)">
            <BarList items={(stats?.campaigns ?? []).map((r) => ({ label: r.name, value: r.n }))} empty="No campaign visits. Add ?utm_source=facebook&utm_campaign=eid to links in your ads to track them." />
          </Card>
          <Card title="Leads by plan"><BarList items={countBy(rangeLeads, 'plan', 'Not sure')} empty="No leads in this range." /></Card>
          <Card title="Leads by city"><BarList items={countBy(rangeLeads, 'city')} empty="No leads in this range." /></Card>
          <Card title="Leads by source"><BarList items={countBy(rangeLeads, 'source')} empty="No leads in this range." /></Card>
          <Card title="Lead outcomes"><BarList items={countBy(rangeLeads, 'status').map((s) => ({ ...s, label: statusLabel(s.label) }))} empty="No leads in this range." /></Card>
        </div>
        <p className="adm-muted adm-note">Your own visits from this browser aren't counted. Visits from bots and browsers with "Do Not Track" are skipped.</p>
      </div>
    </>
  )
}
