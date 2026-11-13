import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from '../lib/content.js'

// Shared admin plumbing: the Supabase client, formatting helpers, and the leads/payments store.
export const supabase = supabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

// ---------- labels ----------
export const STATUSES = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'demo', label: 'Demo booked' },
  { id: 'won', label: 'Customer' },
  { id: 'lost', label: 'Lost' },
]
export const statusLabel = (id) => STATUSES.find((s) => s.id === id)?.label ?? id
export const METHODS = { cash: 'Cash', bank: 'Bank transfer', jazzcash: 'JazzCash', easypaisa: 'Easypaisa', card: 'Card', other: 'Other' }
export const BILLING = { monthly: 'Monthly', yearly: 'Yearly', setup: 'Setup / one-time', other: 'Other' }

// ---------- formatting ----------
export const rs = (n) => `Rs ${Math.round(n ?? 0).toLocaleString('en-PK')}`
export const rsShort = (n) => (n >= 1e6 ? `Rs ${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e4 ? `Rs ${Math.round(n / 1e3)}k` : rs(n))
export const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(a / b < 0.1 ? 1 : 0)}%` : '–')

// Dates are plain YYYY-MM-DD strings in the shop's local time (Pakistan).
export const today = () => new Date().toLocaleDateString('en-CA')
export const toDay = (iso) => new Date(iso).toLocaleDateString('en-CA')
export const dateFmt = (d) => (d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '–')
export const addMonths = (d, n) => {
  const x = new Date(`${d}T00:00:00`)
  const day = x.getDate()
  x.setMonth(x.getMonth() + n)
  if (x.getDate() !== day) x.setDate(0) // 31 Jan + 1 month → 28/29 Feb, not 3 Mar
  return x.toLocaleDateString('en-CA')
}
export const daysUntil = (d) => Math.round((new Date(`${d}T00:00:00`) - new Date(`${today()}T00:00:00`)) / 864e5)
export const timeAgo = (iso) => {
  if (!iso) return ''
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  if (s < 86400 * 7) return `${Math.round(s / 86400)} d ago`
  return dateFmt(toDay(iso))
}

// Pakistani numbers → tel: and wa.me links (03XX… → 923XX…).
export const telLink = (phone) => `tel:${phone.replace(/[^\d+]/g, '')}`
export const waLink = (phone, text = '') => {
  let n = phone.replace(/\D/g, '')
  if (n.startsWith('0')) n = `92${n.slice(1)}`
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

// Download rows as a CSV file Excel opens correctly (BOM for Urdu/UTF-8).
export function downloadCsv(filename, columns, rows) {
  const cell = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [columns.map((c) => cell(c.label)), ...rows.map((r) => columns.map((c) => cell(c.get(r))))].map((r) => r.join(',')).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }))
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// ---------- customers (won leads + their payments) ----------
// Renewal state from the latest "paid until" date: overdue, due (within 7 days), active, or none.
export function customersOf(leads, payments) {
  const byLead = new Map()
  for (const p of payments) {
    const c = byLead.get(p.lead_id) ?? { total: 0, payments: [] }
    c.total += p.amount; c.payments.push(p)
    byLead.set(p.lead_id, c)
  }
  return leads
    .filter((l) => l.status === 'won' || byLead.has(l.id))
    .map((l) => {
      const c = byLead.get(l.id) ?? { total: 0, payments: [] }
      const last = [...c.payments].sort((a, b) => (b.paid_on > a.paid_on ? 1 : -1))[0]
      const paidUntil = c.payments.map((p) => p.paid_until).filter(Boolean).sort().at(-1) ?? null
      const left = paidUntil ? daysUntil(paidUntil) : null
      const state = left == null ? 'none' : left < 0 ? 'overdue' : left <= 7 ? 'due' : 'active'
      return { lead: l, total: c.total, count: c.payments.length, last, plan: last?.plan ?? l.plan, branches: last?.branches ?? l.branches, paidUntil, left, state }
    })
}

// ---------- store ----------
export const BizContext = createContext(null)
export const useBiz = () => useContext(BizContext)

// Loads all leads and payments once; every change updates Supabase, then the local copy.
export function useBizStore() {
  const [leads, setLeads] = useState(null)
  const [payments, setPayments] = useState(null)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    const [l, p] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(5000),
      supabase.from('payments').select('*').order('paid_on', { ascending: false }).order('created_at', { ascending: false }).limit(5000),
    ])
    const err = l.error ?? p.error
    if (err) { setError(err.message); return }
    setError(''); setLeads(l.data); setPayments(p.data)
  }, [])
  useEffect(() => { reload() }, [reload])

  const run = async (q) => { const { data, error } = await q; if (error) throw new Error(error.message); return data }

  const saveLead = async (lead) => {
    const { id, created_at, updated_at, ...fields } = lead
    if (id) {
      const row = await run(supabase.from('leads').update(fields).eq('id', id).select().single())
      setLeads((ls) => ls.map((l) => (l.id === id ? row : l)))
      return row
    }
    const row = await run(supabase.from('leads').insert(fields).select().single())
    setLeads((ls) => [row, ...ls])
    return row
  }
  const deleteLead = async (id) => {
    await run(supabase.from('leads').delete().eq('id', id))
    setLeads((ls) => ls.filter((l) => l.id !== id))
  }
  const savePayment = async (pay) => {
    const { id, created_at, ...fields } = pay
    const row = id
      ? await run(supabase.from('payments').update(fields).eq('id', id).select().single())
      : await run(supabase.from('payments').insert(fields).select().single())
    setPayments((ps) => [row, ...ps.filter((p) => p.id !== row.id)].sort((a, b) => (b.paid_on > a.paid_on ? 1 : b.paid_on < a.paid_on ? -1 : 0)))
    // Paying makes them a customer.
    const lead = leads.find((l) => l.id === row.lead_id)
    if (lead && lead.status !== 'won') await saveLead({ ...lead, status: 'won' })
    return row
  }
  const deletePayment = async (id) => {
    await run(supabase.from('payments').delete().eq('id', id))
    setPayments((ps) => ps.filter((p) => p.id !== id))
  }

  return { leads, payments, error, reload, saveLead, deleteLead, savePayment, deletePayment }
}

// Analytics summary from the admin_stats() SQL function (see supabase/schema.sql).
export function useStats(days) {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    setStats(null)
    supabase.rpc('admin_stats', { days }).then(({ data, error }) => {
      if (!live) return
      if (error) setError(error.message); else { setError(''); setStats(data) }
    })
    return () => { live = false }
  }, [days])
  return { stats, error }
}
