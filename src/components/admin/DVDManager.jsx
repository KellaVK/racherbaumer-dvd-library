import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DVDDialog from '../dvds/DVDDialog'
import ConfirmDialog from '../ui/ConfirmDialog'
import StatusBadge from '../ui/StatusBadge'
import { forceReturn } from '../../services/checkouts'
import { removeDVD, requestDVDSummary } from '../../services/dvds'
import { displayValue, filterDVDs } from '../../utils/dvd'
import { useToast } from '../../contexts/ToastContext'

export default function DVDManager({ dvds, checkouts }) {
  const [search, setSearch] = useState('')
  const [availability, setAvailability] = useState('all')
  const [summary, setSummary] = useState('all')
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState('')
  const { push } = useToast()
  const results = useMemo(() => filterDVDs(dvds, { query: search, availability, summary }), [availability, dvds, search, summary])

  async function mutate(id, success, action) {
    setBusy(id)
    try { await action(); push({ tone: 'success', message: success }) }
    catch (error) { push({ tone: 'danger', message: error.message || 'The DVD could not be updated.' }) }
    finally { setBusy('') }
  }
  return <div>
    <div className="admin-toolbar">
      <label className="sr-only" htmlFor="dvd-search">Search DVDs</label>
      <input id="dvd-search" className="input" placeholder="Search titles, performers, notes…" value={search} onChange={event => setSearch(event.target.value)} />
      <select aria-label="Availability" className="input" value={availability} onChange={event => setAvailability(event.target.value)}><option value="all">Any availability</option><option value="available">Available</option><option value="out">Checked out</option></select>
      <select aria-label="Summary status" className="input" value={summary} onChange={event => setSummary(event.target.value)}><option value="all">Any summary status</option><option value="complete">Summary ready</option><option value="generating">Generating</option><option value="failed">Failed</option><option value="insufficient">Needs details</option><option value="not_requested">Not summarized</option></select>
      <button className="btn-primary" onClick={() => setAdding(true)}>Add DVD</button>
    </div>
    <p className="result-count">Showing {results.length} of {dvds.length} DVDs</p>
    <div className="admin-list">
      {results.map(dvd => <article className="admin-row dvd-admin-row" key={dvd.id}>
        <div className="admin-row-main"><Link to={`/dvd/${dvd.id}`}>{dvd.title}</Link><small>{displayValue(dvd.magician)} · {displayValue(dvd.magicType)}</small></div>
        <StatusBadge status={dvd.checkedOutBy ? 'out' : 'available'} />
        <StatusBadge status={dvd.aiSummaryStatus} />
        <div className="row-actions">
          <button className="btn-secondary compact" onClick={() => setEditing(dvd)}>Edit</button>
          {!['complete', 'generating'].includes(dvd.aiSummaryStatus) && <button className="btn-secondary compact" disabled={!!busy} onClick={() => mutate(dvd.id, `Requesting summary for “${dvd.title}”.`, () => requestDVDSummary(dvd.id))}>{busy === dvd.id ? 'Starting…' : dvd.aiSummaryStatus === 'not_requested' ? 'Generate summary' : 'Retry summary'}</button>}
          {dvd.checkedOutBy && <button className="btn-secondary compact" disabled={!!busy} onClick={() => mutate(dvd.id, `Returned “${dvd.title}”.`, () => forceReturn(dvd))}>Force return</button>}
          <details className="admin-history"><summary>History</summary><div className="history-popover">
            {checkouts.filter(item => item.dvdId === dvd.id).map(item => <p key={item.id}><strong>{item.requesterName}</strong><span>{item.status}</span></p>)}
            {!checkouts.some(item => item.dvdId === dvd.id) && <p>No checkout history.</p>}
          </div></details>
          <button className="btn-ghost danger-link" onClick={() => setDeleting(dvd)}>Delete</button>
        </div>
      </article>)}
    </div>
    <DVDDialog open={adding} dvds={dvds} onClose={() => setAdding(false)} />
    <DVDDialog open={!!editing} dvd={editing} dvds={dvds} onClose={() => setEditing(null)} />
    <ConfirmDialog open={!!deleting} title="Delete DVD?" danger confirmLabel="Delete permanently" busy={busy === deleting?.id} message={deleting ? `“${deleting.title}” will be removed. Checkout history is preserved, but this cannot be undone.` : ''} onClose={() => setDeleting(null)} onConfirm={() => mutate(deleting.id, `Deleted “${deleting.title}”.`, async () => { await removeDVD(deleting.id); setDeleting(null) })} />
  </div>
}
