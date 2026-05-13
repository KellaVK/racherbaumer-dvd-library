import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm]     = useState({ name: '', email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
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
      'auth/email-already-in-use': 'That email is already registered.',
      'auth/weak-password':        'Password must be at least 6 characters.',
      'auth/invalid-email':        'Please enter a valid email address.',
    }[code] || 'Something went wrong. Please try again.'
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '22rem' }}>

        {/* Ornament header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          {/* Art Deco geometric mark */}
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
            fontSize: '1.5rem',
            fontWeight: 500,
            color: 'var(--text)',
            marginBottom: '0.375rem',
          }}>
            Racherbaumer
          </h1>
          <p style={{
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '0.6rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            fontWeight: 300,
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
            fontSize: '0.7rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: '1.75rem',
            fontWeight: 400,
          }}>
            {isRegister ? 'Request Access' : 'Sign In'}
          </h2>

          {error && (
            <div style={{
              border: '1px solid #4a2020',
              backgroundColor: '#1a0a0a',
              color: '#e05555',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontFamily: "'Josefin Sans', sans-serif",
              fontSize: '0.72rem',
              letterSpacing: '0.03em',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {isRegister && (
              <div>
                <label className="label">Full Name</label>
                <input name="name" type="text" required value={form.name}
                  onChange={handleChange} placeholder="Your name" className="input" />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" required value={form.email}
                onChange={handleChange} placeholder="you@example.com" className="input" />
            </div>
            <div>
              <label className="label">Password</label>
              <input name="password" type="password" required value={form.password}
                onChange={handleChange} placeholder="••••••••" className="input" />
            </div>

            <button type="submit" disabled={loading} className="btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}>
              {loading ? 'Please wait…' : isRegister ? 'Request Access' : 'Sign In'}
            </button>
          </form>

          <div style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '0.7rem',
            letterSpacing: '0.04em',
            color: 'var(--text-dim)',
          }}>
            {isRegister ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setIsRegister(false); setError('') }}
                  style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}>
                  Sign in
                </button>
              </>
            ) : (
              <>
                New to the library?{' '}
                <button
                  onClick={() => { setIsRegister(true); setError('') }}
                  style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}>
                  Request access
                </button>
              </>
            )}
          </div>
        </div>

        {isRegister && (
          <p style={{
            textAlign: 'center',
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '0.65rem',
            letterSpacing: '0.05em',
            color: 'var(--text-dim)',
            marginTop: '1rem',
            lineHeight: 1.6,
          }}>
            Access requires admin approval.
          </p>
        )}
      </div>
    </div>
  )
}
