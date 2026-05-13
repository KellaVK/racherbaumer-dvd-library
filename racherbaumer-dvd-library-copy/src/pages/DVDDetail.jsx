import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'

export default function DVDDetail() {
  const { id } = useParams()
  const { user, userProfile, isApproved } = useAuth()
  const [dvd, setDvd] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkedOutUser, setCheckedOutUser] = useState(null)
  const [myActiveRequest, setMyActiveRequest] = useState(null)
  const [requesting, setRequesting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'dvds', id))
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() }
        setDvd(data)
        if (data.checkedOutBy) {
          const userSnap = await getDoc(doc(db, 'users', data.checkedOutBy))
          if (userSnap.exists()) setCheckedOutUser(userSnap.data())
        }
      }
      if (user) {
        const q = query(
          collection(db, 'checkouts'),
          where('dvdId', '==', id),
          where('requesterId', '==', user.uid),
          where('status', 'in', ['pending', 'active'])
        )
        const existing = await getDocs(q)
        if (!existing.empty) setMyActiveRequest(existing.docs[0].data())
      }
      setLoading(false)
    }
    load()
  }, [id, user])

  async function requestCheckout() {
    setRequesting(true)
    setError('')
    try {
      await addDoc(collection(db, 'checkouts'), {
        dvdId:          id,
        dvdTitle:       dvd.title,
        requesterId:    user.uid,
        requesterName:  userProfile?.displayName || user.email,
        requesterEmail: user.email,
        status:         'pending',
        requestedAt:    serverTimestamp(),
        returnedAt:     null,
      })
      setSuccess(true)
      setMyActiveRequest({ status: 'pending' })
    } catch {
      setError('Failed to submit request. Please try again.')
    } finally {
      setRequesting(false)
    }
  }

  if (loading) return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
      <span style={{ color: 'var(--text-dim)', fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.75rem', letterSpacing: '0.1em' }}>
        Loading…
      </span>
    </div>
  )

  if (!dvd) return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
      <div className="deco-divider"><span>◆</span></div>
      <p style={{ color: 'var(--text-muted)', fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.8rem' }}>DVD not found.</p>
      <Link to="/" className="btn-secondary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>← Back</Link>
    </div>
  )

  const isAvailable = !dvd.checkedOutBy
  const magicians = Array.isArray(dvd.magician) ? dvd.magician : [dvd.magician].filter(Boolean)
  const types     = Array.isArray(dvd.magicType)
    ? dvd.magicType
    : dvd.magicType?.split(';').map(t => t.trim()).filter(Boolean) || []
  const features  = Array.isArray(dvd.otherFeatures) ? dvd.otherFeatures : []

  return (
    <div className="page-enter" style={{ maxWidth: '48rem', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>

      {/* Back */}
      <Link to="/" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: '0.65rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-dim)',
        textDecoration: 'none',
        marginBottom: '2.5rem',
        transition: 'color 0.2s',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
      >
        ← Library
      </Link>

      {/* Title block */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(1.6rem, 4vw, 2.25rem)',
            fontWeight: 500,
            color: 'var(--text)',
            lineHeight: 1.2,
          }}>
            {dvd.title}
          </h1>
          <span className={isAvailable ? 'badge-available' : 'badge-checked-out'} style={{ marginTop: '0.5rem', flexShrink: 0 }}>
            {isAvailable ? 'Available' : 'Out'}
          </span>
        </div>

        {magicians.length > 0 && (
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: 'italic',
            fontSize: '1rem',
            color: 'var(--gold)',
          }}>
            {magicians.join(', ')}
          </p>
        )}
      </div>

      <div className="deco-rule" />

      {/* Meta grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem 2rem', marginBottom: '2rem' }}>
        {dvd.producer && (
          <div>
            <span className="label">Producer</span>
            <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.8rem', color: 'var(--text)' }}>
              {dvd.producer}
            </span>
          </div>
        )}
        {dvd.year && (
          <div>
            <span className="label">Year</span>
            <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.8rem', color: 'var(--text)' }}>
              {dvd.year}
            </span>
          </div>
        )}
        {types.length > 0 && (
          <div>
            <span className="label">Type</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {types.map(t => <span key={t} className="badge-type">{t}</span>)}
            </div>
          </div>
        )}
        {features.length > 0 && (
          <div>
            <span className="label">Also Featuring</span>
            <span style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {features.join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Vendor links */}
      {(dvd.vanishingIncUrl || dvd.penguinUrl || dvd.conjuringArchiveUrl) && (
        <div style={{ marginBottom: '2rem' }}>
          <span className="label">Find Online</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {dvd.vanishingIncUrl && (
              <a href={dvd.vanishingIncUrl} target="_blank" rel="noopener noreferrer"
                className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.3rem 0.75rem' }}>
                Vanishing Inc ↗
              </a>
            )}
            {dvd.penguinUrl && (
              <a href={dvd.penguinUrl} target="_blank" rel="noopener noreferrer"
                className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.3rem 0.75rem' }}>
                Penguin Magic ↗
              </a>
            )}
            {dvd.conjuringArchiveUrl && (
              <a href={dvd.conjuringArchiveUrl} target="_blank" rel="noopener noreferrer"
                className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.3rem 0.75rem' }}>
                Conjuring Archive ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* Collapsible: Contents / Notes */}
      {dvd.notes && (
        <details style={{ marginBottom: '1rem' }}>
          <summary>Contents</summary>
          <div style={{
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '0.82rem',
            lineHeight: 1.75,
            color: 'var(--text-muted)',
            borderLeft: '2px solid var(--border)',
            paddingLeft: '1rem',
          }}>
            {dvd.notes}
          </div>
        </details>
      )}

      {/* Collapsible: AI Summary */}
      {dvd.aiSummary && (
        <details style={{ marginBottom: '1.5rem' }}>
          <summary>AI Summary</summary>
          <div style={{
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '0.82rem',
            lineHeight: 1.75,
            color: 'var(--text-muted)',
            borderLeft: '2px solid var(--gold-dim, #8f6e35)',
            paddingLeft: '1rem',
          }}>
            {dvd.aiSummary}
          </div>
        </details>
      )}

      <div className="deco-rule" style={{ margin: '2rem 0' }} />

      {/* Checked out notice */}
      {!isAvailable && checkedOutUser && (
        <div style={{
          border: '1px solid var(--border)',
          borderLeft: '2px solid var(--gold)',
          padding: '0.875rem 1rem',
          marginBottom: '1.5rem',
          fontFamily: "'Josefin Sans', sans-serif",
          fontSize: '0.75rem',
          letterSpacing: '0.04em',
          color: 'var(--text-muted)',
        }}>
          Currently with <strong style={{ color: 'var(--text)' }}>{checkedOutUser.displayName}</strong>
        </div>
      )}

      {/* Checkout action */}
      <div style={{ textAlign: 'center' }}>
        {!user ? (
          <>
            <p style={{ color: 'var(--text-dim)', fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.75rem', marginBottom: '1rem', letterSpacing: '0.04em' }}>
              Sign in to request this DVD
            </p>
            <Link to="/login" className="btn-primary">Sign In</Link>
          </>
        ) : !isApproved ? (
          <p style={{ color: 'var(--text-dim)', fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.75rem', letterSpacing: '0.05em' }}>
            Your account is pending approval.
          </p>
        ) : success || myActiveRequest ? (
          <div>
            <span className={myActiveRequest?.status === 'active' ? 'badge-available' : 'badge-pending'}
              style={{ fontSize: '0.7rem', padding: '0.4rem 1.25rem' }}>
              {myActiveRequest?.status === 'active' ? 'Checked Out' : 'Request Pending'}
            </span>
            <p style={{ color: 'var(--text-dim)', fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.7rem', marginTop: '0.75rem', letterSpacing: '0.04em' }}>
              {myActiveRequest?.status === 'active'
                ? 'You currently have this DVD.'
                : 'Admin will review your request shortly.'}
            </p>
          </div>
        ) : (
          <>
            {error && (
              <p style={{ color: '#e05555', fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                {error}
              </p>
            )}
            <button
              onClick={requestCheckout}
              disabled={requesting || !isAvailable}
              className={isAvailable ? 'btn-primary' : 'btn-secondary'}
              style={{ opacity: isAvailable ? 1 : 0.4, cursor: isAvailable ? 'pointer' : 'not-allowed' }}
            >
              {isAvailable
                ? requesting ? 'Submitting…' : 'Request Checkout'
                : 'Currently Unavailable'}
            </button>
            {isAvailable && (
              <p style={{ color: 'var(--text-dim)', fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.65rem', marginTop: '0.75rem', letterSpacing: '0.05em' }}>
                Admin will approve and arrange shipping or pickup.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
