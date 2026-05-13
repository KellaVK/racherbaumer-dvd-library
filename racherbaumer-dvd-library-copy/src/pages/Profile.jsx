import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'

export default function Profile() {
  const { user, userProfile } = useAuth()
  const [checkouts, setCheckouts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    // Simple equality query — no composite index needed.
    // Sort newest-first client-side so this works before indexes are deployed.
    const q = query(
      collection(db, 'checkouts'),
      where('requesterId', '==', user.uid)
    )
    return onSnapshot(q, snap => {
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.requestedAt?.toMillis?.() ?? 0
          const tb = b.requestedAt?.toMillis?.() ?? 0
          return tb - ta
        })
      setCheckouts(docs)
      setLoading(false)
    }, err => {
      console.error('Checkouts query failed:', err)
      setLoading(false)
    })
  }, [user])

  const active  = checkouts.filter(c => c.status === 'active')
  const pending = checkouts.filter(c => c.status === 'pending')
  const history = checkouts.filter(c => c.status === 'returned' || c.status === 'denied')

  return (
    <div className="page-enter" style={{ maxWidth: '40rem', margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>

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
          {userProfile?.displayName}
        </h1>
        <p style={{
          fontFamily: "'Josefin Sans', sans-serif",
          fontSize: '0.7rem',
          letterSpacing: '0.06em',
          color: 'var(--text-dim)',
        }}>
          {user?.email}
        </p>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        borderTop: '1px solid var(--border)',
        borderLeft: '1px solid var(--border)',
        marginBottom: '2.5rem',
      }}>
        {[
          { label: 'Active',   value: active.length,  color: 'var(--text)' },
          { label: 'Pending',  value: pending.length, color: 'var(--text-muted)' },
          { label: 'Returned', value: history.filter(c => c.status === 'returned').length, color: 'var(--text-dim)' },
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '1.25rem',
            textAlign: 'center',
            borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
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
        <Section title="Currently Checked Out">
          {active.map(c => (
            <CheckoutRow key={c.id} checkout={c} status="active" />
          ))}
        </Section>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <Section title="Pending Requests">
          {pending.map(c => (
            <CheckoutRow key={c.id} checkout={c} status="pending" />
          ))}
        </Section>
      )}

      {/* History — collapsible */}
      {history.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <details>
            <summary style={{ marginBottom: '1rem' }}>
              History ({history.length})
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: 'var(--border-subtle)' }}>
              {history.map(c => (
                <CheckoutRow key={c.id} checkout={c} status={c.status} />
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

function CheckoutRow({ checkout, status }) {
  const date = checkout.requestedAt?.toDate?.()?.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  const statusLabel = { active: 'Active', pending: 'Pending', returned: 'Returned', denied: 'Denied' }[status] || status
  const statusStyle = {
    active:   { color: 'var(--text)',     border: '1px solid var(--border)' },
    pending:  { color: 'var(--text-muted)', border: '1px solid var(--border)', fontStyle: 'italic' },
    returned: { color: 'var(--text-dim)', border: '1px solid var(--border-subtle)' },
    denied:   { color: '#7a3030',         border: '1px solid #3a1818' },
  }[status] || {}

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      padding: '0.875rem 1rem',
      backgroundColor: 'var(--surface)',
    }}>
      <div style={{ minWidth: 0 }}>
        <Link to={`/dvd/${checkout.dvdId}`} style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '0.9rem',
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
        {date && (
          <p style={{
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '0.65rem',
            letterSpacing: '0.05em',
            color: 'var(--text-dim)',
            marginTop: '0.125rem',
          }}>
            Requested {date}
          </p>
        )}
      </div>
      <span style={{
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: '0.6rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        padding: '0.25rem 0.6rem',
        flexShrink: 0,
        ...statusStyle,
      }}>
        {statusLabel}
      </span>
    </div>
  )
}
