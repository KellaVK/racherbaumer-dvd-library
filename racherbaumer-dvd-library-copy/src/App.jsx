import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import DVDDetail from './pages/DVDDetail'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import Pending from './pages/Pending'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dvd/:id" element={<DVDDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/pending" element={<Pending />} />
              <Route path="/profile" element={
                <ProtectedRoute><Profile /></ProtectedRoute>
              } />
              <Route path="/admin" element={
                <AdminRoute><Admin /></AdminRoute>
              } />
            </Routes>
          </main>
          <footer style={{
            borderTop: '1px solid var(--border)',
            padding: '2rem 1rem',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)', maxWidth: '4rem' }} />
              <span style={{ color: 'var(--gold)', fontSize: '0.5rem' }}>◆</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)', maxWidth: '4rem' }} />
            </div>
            <p style={{
              fontFamily: "'Josefin Sans', sans-serif",
              fontSize: '0.6rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
            }}>
              The Jon Racherbaumer Magic DVD Library
            </p>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
