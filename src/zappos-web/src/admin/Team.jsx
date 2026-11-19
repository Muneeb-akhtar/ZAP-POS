import { useEffect, useState } from 'react'
import Icon from '../components/Icons.jsx'
import { supabase, timeAgo } from './biz.js'
import { Card, ConfirmButton, PageBar, TableFoot, useNotify } from './ui.jsx'

// Team page: who can sign in to this admin. Add someone by the email of an account that already exists (they sign up
// on the website's /account/ page first, or you add them in Supabase → Authentication). You can't remove yourself,
// so there is always at least one admin. The rules live in the database (admin_team, add_admin, remove_admin).
export default function Team() {
  const notify = useNotify()
  const [team, setTeam] = useState(null)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => supabase.rpc('admin_team').then(({ data, error }) => { if (error) notify(error.message, 'error'); else setTeam(data ?? []) })
  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { data, error } = await supabase.rpc('add_admin', { p_email: email })
    setBusy(false)
    if (error) { notify(error.message, 'error'); return }
    if (data === 'no_account') { notify('No account has that email yet. Ask them to sign up first, then add them.', 'error'); return }
    notify(data === 'already' ? 'They are already an admin.' : 'Added. They can sign in to the admin now.')
    setEmail(''); load()
  }
  const remove = async (m) => {
    const { data, error } = await supabase.rpc('remove_admin', { p_user: m.user_id })
    if (error) notify(error.message, 'error'); else if (data === 'self') notify("You can't remove yourself.", 'error'); else { notify(`${m.email} can no longer sign in to the admin.`); load() }
  }

  return (
    <>
      <PageBar icon="users" title="Team" sub="Who can sign in to this admin" />
      <div className="adm-panel wide">
        <Card title="Add a team member">
          <form className="adm-inline-form" onSubmit={add}>
            <input type="email" required placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
            <button className="btn btn-primary btn-sm" disabled={busy}><Icon name="plus" size={14} /> {busy ? 'Adding…' : 'Add admin'}</button>
          </form>
          <p className="adm-hint adm-note">They need an account with this email first (website → Account → Sign up). Admins see all leads, payments, bills and keys.</p>
        </Card>
        {!team ? <div className="adm-skel short" /> : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Member</th><th>Role</th><th>Added</th><th>Last sign-in</th><th className="adm-th-actions">Actions</th></tr></thead>
              <tbody>
                {team.map((m) => (
                  <tr key={m.user_id}>
                    <td data-label="Member" className="lead-cell"><span className="adm-member"><span className="adm-me-badge">{m.email[0]?.toUpperCase()}</span><b>{m.email}</b></span></td>
                    <td data-label="Role"><span className={`adm-bill ${m.me ? 'paid' : 'open'}`}>{m.me ? 'You' : 'Admin'}</span></td>
                    <td data-label="Added">{timeAgo(m.added_at)}</td>
                    <td data-label="Last sign-in">{m.last_sign_in ? timeAgo(m.last_sign_in) : 'Never'}</td>
                    <td className="adm-td-actions">{!m.me && <ConfirmButton onConfirm={() => remove(m)} confirmText="Sure? Remove">Remove</ConfirmButton>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TableFoot count={team.length} noun="members" />
          </div>
        )}
      </div>
    </>
  )
}
