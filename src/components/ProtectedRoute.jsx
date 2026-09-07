import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children }) {
  const { user, isApproved, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ maxWidth: '40rem', margin: '6rem auto', textAlign: 'center' }}>
        <p style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
          Verifying account…
        </p>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (!isApproved) return <Navigate to="/pending" replace />
  return children
}

export function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ maxWidth: '40rem', margin: '6rem auto', textAlign: 'center' }}>
        <p style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
          Verifying administrative access…
        </p>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}
