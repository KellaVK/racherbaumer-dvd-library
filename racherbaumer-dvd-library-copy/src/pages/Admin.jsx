import { useState, useEffect, useMemo } from 'react'
import {
  collection, onSnapshot, query, orderBy, doc,
  updateDoc, getDocs, where, serverTimestamp, addDoc
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { Link } from 'react-router-dom'

const TABS = ['checkouts', 'users', 'dvds', 'stats']

export default function Admin() {
  const [tab, setTab] = useState('checkouts')
  const [checkouts, setCheckouts] = useState([])
  const [users, setUsers] = useState([])
  const [dvds, setDvds] = useState([])
  const [loading, setLoading] = useState(true)
  const [dvdSearch, setDvdSearch] = useState('')
  const [showAddDVD, setShowAddDVD] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedDVDHistory, setSelectedDVDHistory] = useState(null)

  // Live listeners for all three collections
  useEffect(() => {
    const unsubs = [
      onSnapshot(
        query(collection(db, 'checkouts'), orderBy('requestedAt', 'desc')),
        snap => setCheckouts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(
        query(collection(db, 'users'), orderBy('createdAt', 'desc')),
        snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(
        query(collection(db, 'dvds'), orderBy('title')),
        snap => {
          setDvds(snap.docs.map(d => ({ id: d.id, ...d.data() })))
          setLoading(false)
        }
      ),
    ]
    return () => unsubs.forEach(u => u())
  }, [])

  // ── Checkout actions ──────────────────────────────────────────────────────

  async function approveCheckout(checkout) {
    await updateDoc(doc(db, 'checkouts', checkout.id), {
      status: 'active',
      approvedAt: serverTimestamp(),
    })
    await updateDoc(doc(db, 'dvds', checkout.dvdId), {
      checkedOutBy: checkout.requesterId,
      checkedOutByName: checkout.requesterName,
      checkedOutAt: serverTimestamp(),
    })
  }

  async function denyCheckout(checkoutId) {
    await updateDoc(doc(db, 'checkouts', checkoutId), { status: 'denied' })
  }

  async function returnDVD(checkout) {
    await updateDoc(doc(db, 'checkouts', checkout.id), {
      status: 'returned',
      returnedAt: serverTimestamp(),
    })
    await updateDoc(doc(db, 'dvds', checkout.dvdId), {
      checkedOutBy: null,
      checkedOutByName: null,
      checkedOutAt: null,
    })
  }

  // Force-return: clears DVD status directly and closes any open checkout record
  async function forceReturn(dvd) {
    await updateDoc(doc(db, 'dvds', dvd.id), {
      checkedOutBy: null,
      checkedOutByName: null,
      checkedOutAt: null,
    })
    // Also close any lingering active checkout records for this DVD
    const q = query(
      collection(db, 'checkouts'),
      where('dvdId', '==', dvd.id),
      where('status', '==', 'active')
    )
    const snap = await getDocs(q)
    await Promise.all(
      snap.docs.map(d =>
        updateDoc(doc(db, 'checkouts', d.id), {
          status: 'returned',
          returnedAt: serverTimestamp(),
          adminNote: 'Force returned by admin',
        })
      )
    )
  }

  async function setUserRole(userId, role) {
    await updateDoc(doc(db, 'users', userId), { role })
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const pendingCheckouts = checkouts.filter(c => c.status === 'pending')
  const activeCheckouts  = checkouts.filter(c => c.status === 'active')
  const pendingUsers     = users.filter(u => u.role === 'pending')
  const filteredDvds     = dvds.filter(d =>
    dvdSearch ? d.title?.toLowerCase().includes(dvdSearch.toLowerCase()) : true
  )

  const stats = useMemo(() => {
    const dvdCounts = {}
    checkouts.forEach(c => {
      if (!dvdCounts[c.dvdId]) dvdCounts[c.dvdId] = { title: c.dvdTitle, count: 0 }
      dvdCounts[c.dvdId].count++
    })
    const userCounts = {}
    checkouts.forEach(c => {
      if (!userCounts[c.requesterId]) userCounts[c.requesterId] = { name: c.requesterName, count: 0 }
      userCounts[c.requesterId].count++
    })
    return {
      totalDVDs:     dvds.length,
      checkedOut:    dvds.filter(d => d.checkedOutBy).length,
      available:     dvds.filter(d => !d.checkedOutBy).length,
      totalUsers:    users.length,
      approvedUsers: users.filter(u => u.role === 'approved' || u.role === 'admin').length,
      pendingUsers:  pendingUsers.length,
      totalCheckouts: checkouts.length,
      topDVDs:  Object.values(dvdCounts).sort((a, b) => b.count - a.count).slice(0, 5),
      topUsers: Object.values(userCounts).sort((a, b) => b.count - a.count).slice(0, 5),
    }
  }, [checkouts, dvds, users, pendingUsers])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 page-enter">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-slate-100">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          {pendingCheckouts.length} pending requests · {pendingUsers.length} users awaiting approval
        </p>
      </div>

      {/* Alert badges */}
      {(pendingCheckouts.length > 0 || pendingUsers.length > 0) && (
        <div className="flex gap-3 mb-6">
          {pendingCheckouts.length > 0 && (
            <button onClick={() => setTab('checkouts')}
              className="badge-pending px-3 py-1 text-sm cursor-pointer hover:bg-blue-800/50 transition-colors">
              {pendingCheckouts.length} checkout request{pendingCheckouts.length !== 1 ? 's' : ''}
            </button>
          )}
          {pendingUsers.length > 0 && (
            <button onClick={() => setTab('users')}
              className="badge-checked-out px-3 py-1 text-sm cursor-pointer hover:bg-amber-800/50 transition-colors">
              {pendingUsers.length} user{pendingUsers.length !== 1 ? 's' : ''} awaiting approval
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800 mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors -mb-px border-b-2
              ${tab === t
                ? 'border-gold-500 text-gold-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
            {t}
            {t === 'checkouts' && pendingCheckouts.length > 0 && (
              <span className="ml-1.5 bg-blue-600 text-white text-xs px-1.5 rounded-full">
                {pendingCheckouts.length}
              </span>
            )}
            {t === 'users' && pendingUsers.length > 0 && (
              <span className="ml-1.5 bg-amber-600 text-white text-xs px-1.5 rounded-full">
                {pendingUsers.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── CHECKOUTS TAB ── */}
      {tab === 'checkouts' && (
        <div className="space-y-8">
          {pendingCheckouts.length > 0 && (
            <section>
              <h2 className="text-slate-300 font-medium mb-3">Pending Requests</h2>
              <div className="space-y-3">
                {pendingCheckouts.map(c => (
                  <CheckoutCard key={c.id} checkout={c}
                    actions={
                      <div className="flex gap-2">
                        <button onClick={() => approveCheckout(c)} className="btn-primary text-sm py-1.5 px-3">
                          Approve
                        </button>
                        <button onClick={() => denyCheckout(c.id)} className="btn-secondary text-sm py-1.5 px-3">
                          Deny
                        </button>
                      </div>
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {activeCheckouts.length > 0 && (
            <section>
              <h2 className="text-slate-300 font-medium mb-3">Currently Out ({activeCheckouts.length})</h2>
              <div className="space-y-3">
                {activeCheckouts.map(c => (
                  <CheckoutCard key={c.id} checkout={c}
                    actions={
                      <button onClick={() => returnDVD(c)} className="btn-secondary text-sm py-1.5 px-3">
                        Mark Returned
                      </button>
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {pendingCheckouts.length === 0 && activeCheckouts.length === 0 && (
            <EmptyState icon="📬" text="No active checkout requests." />
          )}
        </div>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div className="space-y-6">
          {/* Pending users — highlighted at top */}
          {pendingUsers.length > 0 && (
            <section>
              <h2 className="text-slate-300 font-medium mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse inline-block" />
                Awaiting Approval
              </h2>
              <div className="space-y-2">
                {pendingUsers.map(u => (
                  <UserRow key={u.id} user={u}
                    onSetRole={setUserRole}
                    onViewHistory={() => setSelectedUser(u)}
                    highlight
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            {pendingUsers.length > 0 && (
              <h2 className="text-slate-300 font-medium mb-3">All Users</h2>
            )}
            <div className="space-y-2">
              {users.map(u => (
                <UserRow key={u.id} user={u}
                  onSetRole={setUserRole}
                  onViewHistory={() => setSelectedUser(u)}
                />
              ))}
              {users.length === 0 && <EmptyState icon="👤" text="No registered users yet." />}
            </div>
          </section>
        </div>
      )}

      {/* ── DVDS TAB ── */}
      {tab === 'dvds' && (
        <div>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={dvdSearch}
              onChange={e => setDvdSearch(e.target.value)}
              placeholder="Search DVDs…"
              className="input text-sm"
            />
            <button onClick={() => setShowAddDVD(true)} className="btn-primary text-sm shrink-0">
              + Add DVD
            </button>
          </div>

          <div className="space-y-2">
            {filteredDvds.map(dvd => (
              <div key={dvd.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link to={`/dvd/${dvd.id}`}
                    className="text-slate-200 hover:text-gold-400 transition-colors font-medium truncate block">
                    {dvd.title}
                  </Link>
                  <p className="text-slate-500 text-sm truncate">
                    {Array.isArray(dvd.magician) ? dvd.magician.join(', ') : dvd.magician}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={dvd.checkedOutBy ? 'badge-checked-out' : 'badge-available'}>
                    {dvd.checkedOutBy ? dvd.checkedOutByName || 'Out' : 'In'}
                  </span>
                  <AdminDVDMenu
                    dvd={dvd}
                    onForceReturn={() => forceReturn(dvd)}
                    onViewHistory={() => setSelectedDVDHistory(dvd)}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-slate-600 text-xs mt-4 text-right">{filteredDvds.length} DVDs</p>
        </div>
      )}

      {/* ── STATS TAB ── */}
      {tab === 'stats' && <StatsTab stats={stats} />}

      {/* ── Modals ── */}
      {showAddDVD && <AddDVDModal onClose={() => setShowAddDVD(false)} />}

      {selectedUser && (
        <UserHistoryModal
          user={selectedUser}
          checkouts={checkouts.filter(c => c.requesterId === selectedUser.id)}
          onSetRole={setUserRole}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {selectedDVDHistory && (
        <DVDHistoryModal
          dvd={selectedDVDHistory}
          checkouts={checkouts.filter(c => c.dvdId === selectedDVDHistory.id)}
          onClose={() => setSelectedDVDHistory(null)}
        />
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function UserRow({ user, onSetRole, onViewHistory, highlight }) {
  return (
    <div className={`card p-4 flex items-center justify-between gap-4 ${highlight ? 'border-amber-700/40' : ''}`}>
      <div className="min-w-0">
        <p className="text-slate-200 font-medium">{user.displayName}</p>
        <p className="text-slate-500 text-sm">{user.email}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        <RoleBadge role={user.role} />
        {user.role === 'pending' && (
          <button
            onClick={() => onSetRole(user.id, 'approved')}
            className="btn-primary text-xs py-1 px-3"
          >
            Approve
          </button>
        )}
        <select
          value={user.role}
          onChange={e => onSetRole(user.id, e.target.value)}
          className="input !w-auto text-sm py-1.5 bg-slate-800"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="admin">Admin</option>
        </select>
        <button
          onClick={onViewHistory}
          className="btn-ghost text-xs py-1.5 px-2.5 text-slate-400 hover:text-slate-200 border border-slate-700"
        >
          History
        </button>
      </div>
    </div>
  )
}

function CheckoutCard({ checkout, actions }) {
  const date = checkout.requestedAt?.toDate?.()?.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  return (
    <div className="card p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-slate-200 font-medium truncate">{checkout.dvdTitle}</p>
        <p className="text-slate-500 text-sm">{checkout.requesterName} · {date}</p>
      </div>
      {actions}
    </div>
  )
}

function RoleBadge({ role }) {
  const styles = {
    admin:    'bg-gold-900/50 text-gold-400 border-gold-800',
    approved: 'bg-emerald-900/50 text-emerald-400 border-emerald-800',
    pending:  'bg-slate-800 text-slate-400 border-slate-700',
  }
  return (
    <span className={`badge border text-xs px-2 py-0.5 rounded-full ${styles[role] || styles.pending}`}>
      {role}
    </span>
  )
}

function StatusBadge({ status }) {
  const styles = {
    pending:  'bg-blue-900/50 text-blue-300',
    active:   'bg-emerald-900/50 text-emerald-300',
    returned: 'bg-slate-800 text-slate-400',
    denied:   'bg-red-900/40 text-red-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${styles[status] || 'bg-slate-800 text-slate-400'}`}>
      {status}
    </span>
  )
}

function AdminDVDMenu({ dvd, onForceReturn, onViewHistory }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="btn-ghost p-1.5 text-slate-500 hover:text-slate-300">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
            <Link to={`/dvd/${dvd.id}`}
              className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700"
              onClick={() => setOpen(false)}>
              View detail
            </Link>
            <button
              onClick={() => { onViewHistory(); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700">
              📋 Checkout history
            </button>
            {dvd.checkedOutBy && (
              <button
                onClick={() => {
                  if (window.confirm(`Force return "${dvd.title}"? This will mark it as available immediately.`)) {
                    onForceReturn()
                  }
                  setOpen(false)
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-amber-400 hover:bg-slate-700">
                ⚡ Force Return
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function EmptyState({ icon, text }) {
  return (
    <div className="text-center py-12">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-slate-500">{text}</p>
    </div>
  )
}

// ── Modals ────────────────────────────────────────────────────────────────────

function Modal({ children, onClose, wide }) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div
        className={`bg-slate-900 border border-slate-700 rounded-xl p-6 w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} relative`}
        onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 text-xl leading-none">
          ×
        </button>
        {children}
      </div>
    </div>
  )
}

function UserHistoryModal({ user, checkouts, onSetRole, onClose }) {
  const joined = user.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
  const activeCount   = checkouts.filter(c => c.status === 'active').length
  const returnedCount = checkouts.filter(c => c.status === 'returned').length

  return (
    <Modal onClose={onClose} wide>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5 pr-6">
        <div>
          <h2 className="text-xl font-serif text-slate-100">{user.displayName}</h2>
          <p className="text-slate-500 text-sm">{user.email}</p>
          {joined && <p className="text-slate-600 text-xs mt-0.5">Joined {joined}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RoleBadge role={user.role} />
          <select
            value={user.role}
            onChange={e => onSetRole(user.id, e.target.value)}
            className="input !w-auto text-sm py-1 bg-slate-800"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mb-5 text-center">
        <div className="flex-1 bg-slate-800/50 rounded-lg p-3">
          <p className="text-2xl font-serif text-slate-100">{checkouts.length}</p>
          <p className="text-slate-500 text-xs">Total Requests</p>
        </div>
        <div className="flex-1 bg-slate-800/50 rounded-lg p-3">
          <p className="text-2xl font-serif text-emerald-400">{activeCount}</p>
          <p className="text-slate-500 text-xs">Currently Out</p>
        </div>
        <div className="flex-1 bg-slate-800/50 rounded-lg p-3">
          <p className="text-2xl font-serif text-slate-300">{returnedCount}</p>
          <p className="text-slate-500 text-xs">Returned</p>
        </div>
      </div>

      {/* History list */}
      <div className="border-t border-slate-800 pt-4">
        <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Checkout History</h3>
        {checkouts.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-8">No checkouts yet.</p>
        ) : (
          <div className="space-y-0 max-h-72 overflow-y-auto -mx-1 px-1">
            {checkouts.map(c => {
              const reqDate = c.requestedAt?.toDate?.()?.toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })
              const retDate = c.returnedAt?.toDate?.()?.toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })
              return (
                <div key={c.id}
                  className="flex items-center justify-between py-2.5 border-b border-slate-800/60 last:border-0">
                  <div className="min-w-0 mr-3">
                    <p className="text-slate-300 text-sm font-medium truncate">{c.dvdTitle}</p>
                    <p className="text-slate-600 text-xs">
                      {reqDate}{retDate ? ` → ${retDate}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}

function DVDHistoryModal({ dvd, checkouts, onClose }) {
  const magicians = Array.isArray(dvd.magician) ? dvd.magician.join(', ') : dvd.magician
  const totalOut = checkouts.filter(c => c.status !== 'denied').length

  return (
    <Modal onClose={onClose} wide>
      {/* Header */}
      <div className="mb-5 pr-6">
        <h2 className="text-xl font-serif text-slate-100">{dvd.title}</h2>
        {magicians && <p className="text-gold-400 text-sm">{magicians}</p>}
        <div className="flex items-center gap-3 mt-2">
          <span className={dvd.checkedOutBy ? 'badge-checked-out' : 'badge-available'}>
            {dvd.checkedOutBy
              ? `Checked out · ${dvd.checkedOutByName || 'unknown'}`
              : 'Available'}
          </span>
          <span className="text-slate-600 text-xs">{totalOut} total checkout{totalOut !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* History list */}
      <div className="border-t border-slate-800 pt-4">
        <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Checkout History</h3>
        {checkouts.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-8">Never checked out.</p>
        ) : (
          <div className="space-y-0 max-h-72 overflow-y-auto -mx-1 px-1">
            {checkouts.map(c => {
              const reqDate = c.requestedAt?.toDate?.()?.toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })
              const retDate = c.returnedAt?.toDate?.()?.toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })
              return (
                <div key={c.id}
                  className="flex items-center justify-between py-2.5 border-b border-slate-800/60 last:border-0">
                  <div className="min-w-0 mr-3">
                    <p className="text-slate-300 text-sm font-medium truncate">{c.requesterName}</p>
                    <p className="text-slate-600 text-xs">
                      {reqDate}{retDate ? ` → ${retDate}` : ''}
                      {c.adminNote && <span className="text-amber-600 ml-1">({c.adminNote})</span>}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Stats Tab ─────────────────────────────────────────────────────────────────

function StatsTab({ stats }) {
  return (
    <div className="space-y-8">
      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Total DVDs"     value={stats.totalDVDs} />
        <StatCard label="Available"      value={stats.available}      color="emerald" />
        <StatCard label="Checked Out"    value={stats.checkedOut}     color="amber" />
        <StatCard label="Total Users"    value={stats.totalUsers} />
        <StatCard label="Approved"       value={stats.approvedUsers}  color="emerald" />
        <StatCard label="Pending Users"  value={stats.pendingUsers}   color={stats.pendingUsers > 0 ? 'amber' : null} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Top DVDs */}
        <div className="card p-5">
          <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-4">Most Requested DVDs</h3>
          {stats.topDVDs.length === 0 ? (
            <p className="text-slate-600 text-sm">No checkouts yet.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.topDVDs.map((dvd, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="text-slate-300 text-sm truncate">{dvd.title}</span>
                  <span className="text-gold-400 font-mono text-sm shrink-0">{dvd.count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Borrowers */}
        <div className="card p-5">
          <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-4">Most Active Borrowers</h3>
          {stats.topUsers.length === 0 ? (
            <p className="text-slate-600 text-sm">No checkouts yet.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.topUsers.map((u, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="text-slate-300 text-sm truncate">{u.name}</span>
                  <span className="text-gold-400 font-mono text-sm shrink-0">{u.count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-slate-600 text-xs text-center">
        {stats.totalCheckouts} total checkout request{stats.totalCheckouts !== 1 ? 's' : ''} all time
      </p>
    </div>
  )
}

function StatCard({ label, value, color }) {
  const textColor = color === 'emerald' ? 'text-emerald-400'
    : color === 'amber' ? 'text-amber-400'
    : 'text-slate-100'
  return (
    <div className="card p-4">
      <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-serif ${textColor}`}>{value}</p>
    </div>
  )
}

// ── Add DVD Modal ─────────────────────────────────────────────────────────────

function AddDVDModal({ onClose }) {
  const [form, setForm] = useState({
    title: '', magician: '', notes: '', magicType: '', producer: '', otherFeatures: '', year: '',
  })
  const [saving, setSaving] = useState(false)

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await addDoc(collection(db, 'dvds'), {
        title:         form.title.trim(),
        magician:      splitSemi(form.magician),
        notes:         form.notes.trim(),
        magicType:     splitSemi(form.magicType),
        producer:      form.producer.trim(),
        otherFeatures: splitSemi(form.otherFeatures),
        year:          form.year.trim(),
        checkedOutBy:       null,
        checkedOutByName:   null,
        checkedOutAt:       null,
        aiSummary:          '',
        vanishingIncUrl:    '',
        penguinUrl:         '',
        conjuringArchiveUrl: '',
        createdAt:      serverTimestamp(),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-serif text-slate-100 mb-5">Add New DVD</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Title *"                           value={form.title}         onChange={set('title')}         required />
        <Field label="Magician (separate multiples with ;)" value={form.magician}   onChange={set('magician')} />
        <Field label="Magic Type (separate with ;)"      value={form.magicType}     onChange={set('magicType')} />
        <Field label="Producer"                          value={form.producer}      onChange={set('producer')} />
        <Field label="Year Released"                     value={form.year}          onChange={set('year')} />
        <Field label="Notes / Contents" textarea         value={form.notes}         onChange={set('notes')} />
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving || !form.title} className="btn-primary flex-1">
            {saving ? 'Saving…' : 'Add DVD'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, value, onChange, required, textarea }) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1.5">{label}</label>
      {textarea
        ? <textarea value={value} onChange={onChange} rows={3} className="input resize-none w-full" />
        : <input type="text" value={value} onChange={onChange} required={required} className="input w-full" />
      }
    </div>
  )
}

function splitSemi(val) {
  return val.split(';').map(s => s.trim()).filter(Boolean)
}
