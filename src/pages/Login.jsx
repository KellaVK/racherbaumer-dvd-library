import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [isReset, setIsReset] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = isRegister
      ? 'Request Membership — Jon Racherbaumer Magic DVD Library'
      : isReset
      ? 'Reset Password — Jon Racherbaumer Magic DVD Library'
      : 'Sign In — Jon Racherbaumer Magic DVD Library'
  }, [isRegister, isReset])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResetMessage('')
    setLoading(true)
    try {
      if (isReset) {
        if (!form.email) {
          setError('Please enter your email address to reset your password.')
          setLoading(false)
          return
        }
        await sendPasswordResetEmail(auth, form.email)
        setResetMessage(`A password reset link has been sent to ${form.email}.`)
      } else if (isRegister) {
        await register(form.email, form.password, form.name)
        navigate('/pending')
      } else {
        await login(form.email, form.password)
        navigate('/')
      }
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  function friendlyError(code) {
    return {
      'auth/invalid-credential':   'Invalid email or password.',
      'auth/user-not-found':       'No account found with this email.',
      'auth/wrong-password':       'Incorrect password.',
      'auth/email-already-in-use': 'That email is already registered.',
      'auth/weak-password':        'Password must be at least 6 characters.',
      'auth/invalid-email':        'Please enter a valid email address.',
    }[code] || 'Something went wrong. Please try again.'
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3.5rem 1rem 5rem',
    }}>
      <div style={{ width: '100%', maxWidth: '24rem' }}>

        {/* Ornament header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '1px', height: '2rem', backgroundColor: 'var(--gold)', opacity: 0.5 }} />
            <div style={{
              width: '6px', height: '6px',
              backgroundColor: 'var(--gold)',
              transform: 'rotate(45deg)',
            }} />
            <div style={{ width: '1px', height: '0.5rem', backgroundColor: 'var(--gold)', opacity: 0.5 }} />
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.65rem',
            fontWeight: 500,
            color: 'var(--text)',
            marginBottom: '0.375rem',
          }}>
            Racherbaumer
          </h1>
          <p style={{
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '0.62rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            fontWeight: 400,
          }}>
            Magic DVD Library
          </p>
        </div>

        {/* Form card */}
        <div style={{
          border: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          padding: '2rem',
        }}>
          <h2 style={{
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '0.72rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: '1.75rem',
            fontWeight: 600,
          }}>
            {isReset ? 'Reset Password' : isRegister ? 'Request Access' : 'Sign In'}
          </h2>

          {error && (
            <div style={{
              border: '1px solid #4a2020',
              backgroundColor: '#1a0a0a',
              color: 'var(--danger)',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontFamily: "'Josefin Sans', sans-serif",
              fontSize: '0.75rem',
              letterSpacing: '0.03em',
            }}>
              {error}
            </div>
          )}

          {resetMessage && (
            <div style={{
              border: '1px solid var(--gold-dim)',
              backgroundColor: 'var(--surface-2)',
              color: 'var(--available)',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontFamily: "'Josefin Sans', sans-serif",
              fontSize: '0.75rem',
              letterSpacing: '0.03em',
            }}>
              {resetMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {isRegister && (
              <div>
                <label htmlFor="auth-name" className="label">Full Name</label>
                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  autoComplete="name"
                  className="input"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="label">Email Address</label>
              <input
                id="auth-email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                className="input"
              />
            </div>

            {!isReset && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="auth-password" className="label">Password</label>
                  {!isRegister && (
                    <button
                      type="button"
                      onClick={() => { setIsReset(true); setError(''); setResetMessage('') }}
                      style={{
                        color: 'var(--gold)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        padding: 0,
                        marginBottom: '0.5rem',
                        fontFamily: "'Josefin Sans', sans-serif",
                        letterSpacing: '0.05em',
                      }}
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  className="input"
                />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}>
              {loading ? 'Please wait…' : isReset ? 'Send Reset Link' : isRegister ? 'Request Access' : 'Sign In'}
            </button>
          </form>

          <div style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '0.72rem',
            letterSpacing: '0.04em',
            color: 'var(--text-dim)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}>
            {isReset ? (
              <button
                type="button"
                onClick={() => { setIsReset(false); setError(''); setResetMessage('') }}
                style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem' }}>
                ← Back to Sign In
              </button>
            ) : isRegister ? (
              <div>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setIsReset(false); setError('') }}
                  style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem' }}>
                  Sign in
                </button>
              </div>
            ) : (
              <div>
                New to the library?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setIsReset(false); setError('') }}
                  style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem' }}>
                  Request access
                </button>
              </div>
            )}
          </div>
        </div>

        {isRegister && (
          <p style={{
            textAlign: 'center',
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '0.68rem',
            letterSpacing: '0.05em',
            color: 'var(--text-dim)',
            marginTop: '1rem',
            lineHeight: 1.6,
          }}>
            Lending access requires administrator verification.
          </p>
        )}
      </div>
    </div>
  )
}
