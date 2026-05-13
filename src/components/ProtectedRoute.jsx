import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children }) {
  const { user, isApproved } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isApproved) return <Navigate to="/pending" replace />
  return children
}

export function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}
