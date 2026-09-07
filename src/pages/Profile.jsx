import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import StatusBadge from '../components/ui/StatusBadge'
import { formatFirestoreDate } from '../utils/date'

export default function Profile() {
  const { user, userProfile } = useAuth()
  const [checkouts, setCheckouts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    document.title = 'My Account — Jon Racherbaumer Magic DVD Library'
    const timeout = setTimeout(() => setLoading(false), 3000)
    const q = query(
      collection(db, 'checkouts'),
      where('requesterId', '==', user.uid)
    )
    const unsub = onSnapshot(q, snap => {
      clearTimeout(timeout)
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.requestedAt?.toMillis?.() ?? (a.requestedAt instanceof Date ? a.requestedAt.getTime() : 0)
          const tb = b.requestedAt?.toMillis?.() ?? (b.requestedAt instanceof Date ? b.requestedAt.getTime() : 0)
          return tb - ta
        })
      setCheckouts(docs)
      setLoading(false)
    }, err => {
      clearTimeout(timeout)
      console.error('Checkouts query failed:', err)
      setLoading(false)
    })
    return () => {
      clearTimeout(timeout)
      unsub()
    }
  }, [user])

  const active  = checkouts.filter(c => c.status === 'active')
  const pending = checkouts.filter(c => c.status === 'pending')
  const queued  = checkouts.filter(c => c.status === 'queued')
  const history = checkouts.filter(c => c.status === 'returned' || c.status === 'denied')

  return (
    <div className="page-enter" style={{ maxWidth: '44rem', margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{
          fontFamily: "'Josefin Sans', sans-serif",
          fontSize: '0.65rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          marginBottom: '0.5rem',
        }}>
          My Account
        </p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.75rem',
          fontWeight: 500,
          color: 'var(--text)',
          marginBottom: '0.25rem',
        }}>
          {userProfile?.displayName || user?.displayName || 'Library Member'}
        </h1>
        <p style={{
          fontFamily: "'Josefin Sans', sans-serif",
          fontSize: '0.75rem',
          letterSpacing: '0.06em',
          color: 'var(--text-dim)',
        }}>
          {user?.email} · <span style={{ textTransform: 'capitalize' }}>{userProfile?.role || 'Member'}</span>
        </p>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        borderTop: '1px solid var(--border)',
        borderLeft: '1px solid var(--border)',
        marginBottom: '2.5rem',
      }}>
        {[
          { label: 'Active',   value: active.length,  color: 'var(--text)' },
          { label: 'Pending',  value: pending.length, color: 'var(--gold)' },
          { label: 'Waitlist', value: queued.length,  color: 'var(--warning)' },
          { label: 'Returned', value: history.filter(c => c.status === 'returned').length, color: 'var(--text-dim)' },
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '1.25rem 0.5rem',
            textAlign: 'center',
            borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
          }}>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.75rem',
              color: stat.color,
              lineHeight: 1,
              marginBottom: '0.375rem',
            }}>
              {stat.value}
            </div>
            <div style={{
              fontFamily: "'Josefin Sans', sans-serif",
              fontSize: '0.6rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Active checkouts */}
      {active.length > 0 && (
        <Section title="Currently Borrowed">
          {active.map(c => (
            <CheckoutRow key={c.id} checkout={c} />
          ))}
        </Section>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <Section title="Pending Approval">
          {pending.map(c => (
            <CheckoutRow key={c.id} checkout={c} />
          ))}
        </Section>
      )}

      {/* Queued / Waitlist */}
      {queued.length > 0 && (
        <Section title="Waitlist / In Queue">
          {queued.map(c => (
            <CheckoutRow key={c.id} checkout={c} note="Queued for next availability" />
          ))}
        </Section>
      )}

      {/* History — collapsible */}
      {history.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <details open={active.length === 0 && pending.length === 0 && queued.length === 0}>
            <summary style={{ marginBottom: '1rem' }}>
              Past Checkouts ({history.length})
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: 'var(--border-subtle)' }}>
              {history.map(c => (
                <CheckoutRow key={c.id} checkout={c} />
              ))}
            </div>
          </details>
        </div>
      )}

      {!loading && checkouts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="deco-divider"><span>◆</span></div>
          <p style={{
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '0.8rem',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            marginBottom: '1.5rem',
          }}>
            No checkout history yet.
          </p>
          <Link to="/" className="btn-primary">Browse the Library</Link>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 className="section-heading">{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: 'var(--border-subtle)' }}>
        {children}
      </div>
    </div>
  )
}

function CheckoutRow({ checkout, note }) {
  const date = formatFirestoreDate(checkout.requestedAt)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      padding: '0.875rem 1rem',
      backgroundColor: 'var(--surface)',
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <Link to={`/dvd/${checkout.dvdId}`} style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '0.95rem',
          color: 'var(--text)',
          textDecoration: 'none',
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          transition: 'color 0.2s',
        }}
          onMouseEnter={e => e.target.style.color = 'var(--gold)'}
          onMouseLeave={e => e.target.style.color = 'var(--text)'}
        >
          {checkout.dvdTitle}
        </Link>
        <p style={{
          fontFamily: "'Josefin Sans', sans-serif",
          fontSize: '0.68rem',
          letterSpacing: '0.04em',
          color: 'var(--text-dim)',
          marginTop: '0.15rem',
        }}>
          Requested {date} {note ? `· ${note}` : ''}
        </p>
      </div>
      <StatusBadge status={checkout.status} />
    </div>
  )
}
