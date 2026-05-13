import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

export default function Navbar() {
  const { user, userProfile, isAdmin, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const isActive = path => location.pathname === path

  const navLink = (to, label) => (
    <Link
      to={to}
      onClick={() => setMenuOpen(false)}
      style={{
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: '0.7rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        fontWeight: 400,
        color: isActive(to) ? 'var(--gold)' : 'var(--text-muted)',
        textDecoration: 'none',
        padding: '0.25rem 0',
        borderBottom: isActive(to) ? '1px solid var(--gold)' : '1px solid transparent',
        transition: 'color 0.2s, border-color 0.2s',
      }}
      onMouseEnter={e => { if (!isActive(to)) e.target.style.color = 'var(--text)' }}
      onMouseLeave={e => { if (!isActive(to)) e.target.style.color = 'var(--text-muted)' }}
    >
      {label}
    </Link>
  )

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'var(--ink)',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Thin gold accent line at very top */}
      <div style={{ height: '1px', backgroundColor: 'var(--gold)', opacity: 0.4 }} />

      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4rem' }}>

          {/* Wordmark */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.1rem',
              fontWeight: 500,
              color: 'var(--text)',
              letterSpacing: '0.03em',
              lineHeight: 1,
            }}>
              Racherbaumer
            </span>
            <span style={{
              fontFamily: "'Josefin Sans', sans-serif",
              fontSize: '0.6rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              fontWeight: 300,
            }}>
              Magic DVD Library
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-8">
            {navLink('/', 'Browse')}
            {user && navLink('/profile', 'My Checkouts')}
            {isAdmin && navLink('/admin', 'Admin')}

            <div style={{ width: '1px', height: '1rem', backgroundColor: 'var(--border)' }} />

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <span style={{
                  fontFamily: "'Josefin Sans', sans-serif",
                  fontSize: '0.7rem',
                  letterSpacing: '0.1em',
                  color: 'var(--text-dim)',
                }}>
                  {userProfile?.displayName || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-secondary"
                  style={{ padding: '0.35rem 1rem', fontSize: '0.65rem' }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-primary" style={{ padding: '0.4rem 1.25rem', fontSize: '0.65rem' }}>
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden btn-ghost"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ padding: '0.5rem' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '18px' }}>
              <span style={{
                display: 'block', height: '1px',
                backgroundColor: menuOpen ? 'var(--gold)' : 'var(--text-muted)',
                transform: menuOpen ? 'translateY(5px) rotate(45deg)' : 'none',
                transition: 'all 0.2s',
              }} />
              <span style={{
                display: 'block', height: '1px',
                backgroundColor: 'var(--text-muted)',
                opacity: menuOpen ? 0 : 1,
                transition: 'all 0.2s',
              }} />
              <span style={{
                display: 'block', height: '1px',
                backgroundColor: menuOpen ? 'var(--gold)' : 'var(--text-muted)',
                transform: menuOpen ? 'translateY(-5px) rotate(-45deg)' : 'none',
                transition: 'all 0.2s',
              }} />
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '1rem',
            paddingBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            {navLink('/', 'Browse')}
            {user && navLink('/profile', 'My Checkouts')}
            {isAdmin && navLink('/admin', 'Admin')}
            <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '0.25rem 0' }} />
            {user ? (
              <button
                onClick={() => { setMenuOpen(false); handleLogout() }}
                style={{
                  fontFamily: "'Josefin Sans', sans-serif",
                  fontSize: '0.7rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: '0.25rem 0',
                }}
              >
                Sign Out
              </button>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-primary"
                style={{ width: 'fit-content', fontSize: '0.65rem' }}>
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
