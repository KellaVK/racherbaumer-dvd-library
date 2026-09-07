import { useState } from 'react'
import { Link } from 'react-router-dom'
import { approveCheckout, denyCheckout, returnDVD } from '../../services/checkouts'
import { formatFirestoreDate } from '../../utils/date'
import { useToast } from '../../contexts/ToastContext'
import StatusBadge from '../ui/StatusBadge'

export default function CheckoutManager({ pending = [], active = [], queued = [] }) {
  const [busy, setBusy] = useState('')
  const { push } = useToast()
  async function act(key, label, action) {
    setBusy(key)
    try { await action(); push({ tone: 'success', message: label }) }
    catch (error) { push({ tone: 'danger', message: error.message || 'The checkout could not be updated.' }) }
    finally { setBusy('') }
  }
  const groups = [
    { title: 'Pending decisions', items: pending, status: 'pending' },
    { title: 'Currently checked out', items: active, status: 'active' },
    { title: 'Waiting list', items: queued, status: 'queued' },
  ]
  return <div className="admin-groups">
    {groups.map(group => <section key={group.title}>
      <h2 className="section-heading">{group.title} <span>{group.items.length}</span></h2>
      {!group.items.length ? <p className="muted-copy">Nothing in this group.</p> : <div className="admin-list">
        {group.items.map(checkout => <article className="admin-row" key={checkout.id}>
          <div className="admin-row-main">
            <Link to={`/dvd/${checkout.dvdId}`}>{checkout.dvdTitle}</Link>
            <small>{checkout.requesterName} · {formatFirestoreDate(checkout.requestedAt)}</small>
          </div>
          <StatusBadge status={group.status} />
          <div className="row-actions">
            {group.status === 'pending' && <>
              <button className="btn-primary compact" disabled={!!busy} onClick={() => act(checkout.id, `Approved “${checkout.dvdTitle}”.`, () => approveCheckout(checkout))}>{busy === checkout.id ? 'Working…' : 'Approve'}</button>
              <button className="btn-secondary compact" disabled={!!busy} onClick={() => act(checkout.id, `Denied the request for “${checkout.dvdTitle}”.`, () => denyCheckout(checkout))}>Deny</button>
            </>}
            {group.status === 'active' && <button className="btn-secondary compact" disabled={!!busy} onClick={() => act(checkout.id, `Marked “${checkout.dvdTitle}” returned.`, () => returnDVD(checkout))}>{busy === checkout.id ? 'Working…' : 'Mark returned'}</button>}
          </div>
        </article>)}
      </div>}
    </section>)}
  </div>
}
