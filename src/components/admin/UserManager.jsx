import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { setUserRole } from '../../services/users'
import { formatFirestoreDate } from '../../utils/date'
import StatusBadge from '../ui/StatusBadge'

export default function UserManager({ users }) {
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState('')
  const { user: actor } = useAuth()
  const { push } = useToast()
  const filtered = useMemo(() => users.filter(user => `${user.displayName} ${user.email}`.toLowerCase().includes(search.toLowerCase())), [search, users])
  async function change(user, role) {
    setBusy(user.id)
    try { await setUserRole({ actorId: actor.uid, user, role }); push({ tone: 'success', message: `${user.displayName || user.email} is now ${role}.` }) }
    catch (error) { push({ tone: 'danger', message: error.message }) }
    finally { setBusy('') }
  }
  return <div>
    <label className="sr-only" htmlFor="user-search">Search users</label>
    <input id="user-search" className="input admin-search" placeholder="Search by name or email…" value={search} onChange={event => setSearch(event.target.value)} />
    <div className="admin-list">
      {filtered.map(person => <article className={`admin-row ${person.role === 'pending' ? 'needs-attention' : ''}`} key={person.id}>
        <div className="admin-row-main"><strong>{person.displayName || 'Unnamed user'}</strong><small>{person.email} · Joined {formatFirestoreDate(person.createdAt)}</small></div>
        <StatusBadge status={person.role}>{person.role}</StatusBadge>
        <div className="row-actions">
          {person.role === 'pending' && <button className="btn-primary compact" disabled={!!busy} onClick={() => change(person, 'approved')}>Approve</button>}
          <label className="sr-only" htmlFor={`role-${person.id}`}>Role for {person.displayName || person.email}</label>
          <select id={`role-${person.id}`} className="input role-select" disabled={busy === person.id || (person.id === actor.uid && person.role === 'admin')} value={person.role} onChange={event => change(person, event.target.value)}>
            <option value="pending">Pending</option><option value="approved">Approved</option><option value="admin">Admin</option>
          </select>
        </div>
      </article>)}
      {!filtered.length && <p className="admin-empty">No users match that search.</p>}
    </div>
  </div>
}
