import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Pending() {
  const { user, userProfile, isApproved, logout } = useAuth()
  const navigate = useNavigate()

  // Auto-redirect when admin approves (profile listener is live)
  useEffect(() => {
    document.title = 'Access Pending — Jon Racherbaumer Magic DVD Library'
    if (isApproved) navigate('/', { replace: true })
  }, [isApproved, navigate])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 1.5rem',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '28rem' }}>

        {/* Art Deco ornament */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginBottom: '2rem' }}>
          <div style={{ width: '1px', height: '2rem', backgroundColor: 'var(--gold)', opacity: 0.3 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '20px', height: '1px', backgroundColor: 'var(--gold)', opacity: 0.4 }} />
            <div style={{ width: '5px', height: '5px', backgroundColor: 'var(--gold)', transform: 'rotate(45deg)', opacity: 0.7 }} />
            <div style={{ width: '20px', height: '1px', backgroundColor: 'var(--gold)', opacity: 0.4 }} />
          </div>
          <div style={{ width: '1px', height: '2rem', backgroundColor: 'var(--gold)', opacity: 0.3 }} />
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.85rem',
          fontWeight: 500,
          color: 'var(--text)',
          marginBottom: '0.5rem',
        }}>
          Membership Pending
        </h1>

        <p style={{
          fontFamily: "'Josefin Sans', sans-serif",
          fontSize: '0.65rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          marginBottom: '1.75rem',
        }}>
          Awaiting Librarian Approval
        </p>

        <p style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: '0.9rem',
          lineHeight: 1.7,
          color: 'var(--text-muted)',
          marginBottom: '2rem',
        }}>
          Thank you for joining, <strong style={{ color: 'var(--text)' }}>{userProfile?.displayName || user?.displayName || user?.email}</strong>.
          Your lending account is currently under review by the library administrator.
          You are welcome to browse the full collection in the meantime — this page will automatically activate once approved.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/" className="btn-primary">
            Browse the Library
          </Link>
          <button onClick={logout} className="btn-secondary">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
