import { useState, useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { requestCheckout } from '../services/checkouts'
import { normalizeDVD, displayValue } from '../utils/dvd'
import StatusBadge from '../components/ui/StatusBadge'

export default function DVDDetail() {
  const { id } = useParams()
  const location = useLocation()
  const { user, userProfile, isApproved } = useAuth()
  const [dvd, setDvd] = useState(null)
  const [loading, setLoading] = useState(true)
  const [myActiveRequest, setMyActiveRequest] = useState(null)
  const [requesting, setRequesting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Live DVD listener so changes in availability or AI summary reflect in real-time
  useEffect(() => {
    if (!id) return
    const unsub = onSnapshot(doc(db, 'dvds', id), snap => {
      if (snap.exists()) {
        const normalized = normalizeDVD({ id: snap.id, ...snap.data() })
        setDvd(normalized)
        document.title = `${normalized.title} — Jon Racherbaumer Magic DVD Library`
      } else {
        setDvd(null)
      }
      setLoading(false)
    }, err => {
      console.error('Failed to load DVD:', err)
      setLoading(false)
    })

    return () => unsub()
  }, [id])

  // Check if current user has an active, pending, or queued request
  useEffect(() => {
    if (!id || !user) {
      setMyActiveRequest(null)
      return
    }
    async function checkMyRequest() {
      try {
        const q = query(
          collection(db, 'checkouts'),
          where('requesterId', '==', user.uid),
        )
        const snap = await getDocs(q)
        const active = snap.docs
          .map(d => d.data())
          .find(d => d.dvdId === id && ['pending', 'queued', 'active'].includes(d.status))
        setMyActiveRequest(active || null)
      } catch (err) {
        console.error('Error fetching user request for DVD:', err)
      }
    }
    checkMyRequest()
  }, [id, user, success])

  async function handleRequest() {
    if (!dvd || !user) return
    setRequesting(true)
    setError('')
    try {
      const result = await requestCheckout({ dvd, user, userProfile })
      setSuccess(true)
      setMyActiveRequest({ status: result.status })
    } catch (err) {
      console.error('Checkout request failed:', err)
      if (err.code === 'duplicate-request') {
        setError('You already have an open request or are in the queue for this DVD.')
      } else {
        setError(err.message || 'Failed to submit request. Please try again.')
      }
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <span style={{ color: 'var(--text-dim)', fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.75rem', letterSpacing: '0.1em' }}>
          Loading…
        </span>
      </div>
    )
  }

  if (!dvd) {
    return (
      <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div className="deco-divider"><span>◆</span></div>
        <p style={{ color: 'var(--text-muted)', fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.8rem' }}>DVD not found.</p>
        <Link to="/" className="btn-secondary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>← Back to Library</Link>
      </div>
    )
  }

  const isAvailable = !dvd.checkedOutBy
  const magicians = dvd.magician || []
  const types = dvd.magicType || []
  const features = dvd.otherFeatures || []

  // Preserve any search state passed in navigation or return to catalog root
  const backTo = location.state?.from || '/'

  return (
    <div className="page-enter" style={{ maxWidth: '48rem', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>

      {/* Back button */}
      <Link
        to={backTo}
        style={{
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
          <StatusBadge status={isAvailable ? 'available' : 'out'} />
        </div>

        {magicians.length > 0 && (
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: 'italic',
            fontSize: '1.1rem',
            color: 'var(--gold)',
            marginTop: '0.25rem',
          }}>
            {magicians.join(', ')}
          </p>
        )}
      </div>

      <div className="deco-rule" />

      {/* Meta grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem 2rem', marginBottom: '2rem' }}>
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
        <details style={{ marginBottom: '1.25rem' }} open>
          <summary>Contents &amp; Notes</summary>
          <div style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: '0.85rem',
            lineHeight: 1.7,
            color: 'var(--text-muted)',
            borderLeft: '2px solid var(--border)',
            paddingLeft: '1rem',
            whiteSpace: 'pre-line',
          }}>
            {dvd.notes}
          </div>
        </details>
      )}

      {/* Collapsible: AI Summary */}
      {dvd.aiSummary && (
        <details style={{ marginBottom: '1.5rem' }} open>
          <summary>AI Summary</summary>
          <div style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: '0.85rem',
            lineHeight: 1.7,
            color: 'var(--text)',
            borderLeft: '2px solid var(--gold-dim)',
            paddingLeft: '1rem',
            backgroundColor: 'var(--surface)',
            padding: '1rem',
          }}>
            <p style={{ margin: 0 }}>{dvd.aiSummary}</p>
          </div>
        </details>
      )}

      <div className="deco-rule" style={{ margin: '2rem 0' }} />

      {/* Checked out notice */}
      {!isAvailable && (
        <div style={{
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--gold)',
          padding: '0.875rem 1rem',
          marginBottom: '1.5rem',
          backgroundColor: 'var(--surface)',
          fontFamily: "'Josefin Sans', sans-serif",
          fontSize: '0.75rem',
          letterSpacing: '0.04em',
          color: 'var(--text-muted)',
        }}>
          Currently checked out{dvd.checkedOutByName ? <> to <strong style={{ color: 'var(--text)' }}>{dvd.checkedOutByName}</strong></> : ''}. You can join the waiting list below.
        </div>
      )}

      {/* Checkout action */}
      <div style={{ textAlign: 'center' }}>
        {!user ? (
          <>
            <p style={{ color: 'var(--text-dim)', fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.75rem', marginBottom: '1rem', letterSpacing: '0.04em' }}>
              Sign in to request or join the waitlist for this DVD
            </p>
            <Link to="/login" className="btn-primary">Sign In</Link>
          </>
        ) : !isApproved ? (
          <div className="notice" style={{ maxWidth: '24rem', margin: '0 auto', textAlign: 'left' }}>
            <strong>Account Pending Approval</strong>
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>Your account is under admin review. Once activated, you can borrow and reserve DVDs.</p>
          </div>
        ) : myActiveRequest ? (
          <div>
            <span
              className={
                myActiveRequest.status === 'active'
                  ? 'badge-available'
                  : myActiveRequest.status === 'queued'
                  ? 'badge-pending'
                  : 'badge-checked-out'
              }
              style={{ fontSize: '0.7rem', padding: '0.4rem 1.25rem', display: 'inline-block' }}
            >
              {myActiveRequest.status === 'active'
                ? 'Currently Checked Out to You'
                : myActiveRequest.status === 'queued'
                ? 'You are on the Waitlist'
                : 'Borrow Request Pending'}
            </span>
            <p style={{ color: 'var(--text-dim)', fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.72rem', marginTop: '0.75rem', letterSpacing: '0.04em' }}>
              {myActiveRequest.status === 'active'
                ? 'You currently have this DVD.'
                : myActiveRequest.status === 'queued'
                ? 'You are queued for this DVD. When the current borrower returns it, your request will be promoted.'
                : 'An administrator will review your checkout request shortly.'}
            </p>
          </div>
        ) : (
          <>
            {error && (
              <p style={{ color: 'var(--danger)', fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                {error}
              </p>
            )}
            <button
              onClick={handleRequest}
              disabled={requesting}
              className="btn-primary"
              style={{ minWidth: '12rem' }}
            >
              {requesting
                ? 'Submitting…'
                : isAvailable
                ? 'Request Checkout'
                : 'Join Waitlist Queue'}
            </button>
            <p style={{ color: 'var(--text-dim)', fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.65rem', marginTop: '0.75rem', letterSpacing: '0.05em' }}>
              {isAvailable
                ? 'Admin will approve and arrange shipping or pickup.'
                : 'You will be placed in order of request.'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
