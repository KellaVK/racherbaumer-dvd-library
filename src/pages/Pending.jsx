import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Pending() {
  const { user, userProfile, isApproved, logout } = useAuth()
  const navigate = useNavigate()

  // Auto-redirect when admin approves (profile listener is now live)
  useEffect(() => {
    if (isApproved) navigate('/', { replace: true })
  }, [isApproved, navigate])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '26rem' }}>

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
          fontSize: '1.75rem',
          fontWeight: 500,
          color: 'var(--text)',
          marginBottom: '0.5rem',
        }}>
          Access Pending
        </h1>

        <p style={{
          fontFamily: "'Josefin Sans', sans-serif",
          fontSize: '0.65rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          marginBottom: '1.75rem',
        }}>
          Under Review
        </p>

        <p style={{
          fontFamily: "'Josefin Sans', sans-serif",
          fontSize: '0.8rem',
          lineHeight: 1.8,
          letterSpacing: '0.03em',
          color: 'var(--text-muted)',
          marginBottom: '2rem',
        }}>
          Thank you for registering,{' '}
          <span style={{ color: 'var(--text)' }}>{user?.displayName}</span>.
          Your account is awaiting admin approval.
          You'll be able to browse and check out DVDs once activated —
          this page will update automatically.
        </p>

        <button onClick={logout} className="btn-secondary">
          Sign Out
        </button>
      </div>
    </div>
  )
}
