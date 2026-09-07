import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import AppErrorBoundary from './components/AppErrorBoundary'
import { ToastProvider } from './contexts/ToastContext'
import ToastViewport from './components/ui/ToastViewport'

// Code-split heavier and secondary routes to reduce initial landing bundle size
const Login = lazy(() => import('./pages/Login'))
const DVDDetail = lazy(() => import('./pages/DVDDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const Admin = lazy(() => import('./pages/Admin'))
const Pending = lazy(() => import('./pages/Pending'))
const NotFound = lazy(() => import('./pages/NotFound'))

function RouteFallback() {
  return (
    <div style={{ maxWidth: '40rem', margin: '6rem auto', textAlign: 'center' }}>
      <span style={{
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: '0.72rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: 'var(--text-dim)',
      }}>
        Loading record…
      </span>
    </div>
  )
}

export default function App() {
  return (
    <AppErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Suspense fallback={<RouteFallback />}>
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
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </main>
              <footer style={{
                borderTop: '1px solid var(--border)',
                padding: '2.5rem 1rem',
                textAlign: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)', maxWidth: '4rem' }} />
                  <span style={{ color: 'var(--gold)', fontSize: '0.55rem' }}>◆</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)', maxWidth: '4rem' }} />
                </div>
                <p style={{
                  fontFamily: "'Josefin Sans', sans-serif",
                  fontSize: '0.65rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--text-dim)',
                }}>
                  The Jon Racherbaumer Magic DVD Library
                </p>
              </footer>
            </div>
          </BrowserRouter>
        </AuthProvider>
        <ToastViewport />
      </ToastProvider>
    </AppErrorBoundary>
  )
}
