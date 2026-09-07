import { Link, useLocation } from 'react-router-dom'
import StatusBadge from './ui/StatusBadge'

export default function DVDCard({ dvd = {} }) {
  const location = useLocation()
  const isAvailable = !dvd?.checkedOutBy
  const magicians = Array.isArray(dvd?.magician) ? dvd.magician : [dvd?.magician].filter(Boolean)
  const types = Array.isArray(dvd?.magicType)
    ? dvd.magicType
    : typeof dvd?.magicType === 'string'
      ? dvd.magicType.split(';').map(t => t.trim()).filter(Boolean)
      : []

  return (
    <Link
      to={`/dvd/${dvd.id}`}
      state={{ from: `${location.pathname}${location.search}` }}
      className="card group block"
      style={{ textDecoration: 'none' }}
    >
      {/* Art Deco left border accent — indicates availability */}
      <div style={{ display: 'flex', height: '100%' }}>
        <div style={{
          width: '3px',
          backgroundColor: isAvailable ? 'var(--available)' : 'var(--gold)',
          flexShrink: 0,
          opacity: isAvailable ? 0.75 : 0.5,
          transition: 'opacity 0.25s',
        }} />

        <div style={{ padding: '1.25rem 1.25rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Title */}
          <h3 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--text)',
            lineHeight: 1.35,
            marginBottom: '0.375rem',
            transition: 'color 0.2s',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
            className="group-hover:text-gold-400"
          >
            {dvd?.title || 'Untitled DVD'}
          </h3>

          {/* Magician */}
          <p style={{
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '0.72rem',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            marginBottom: '0.875rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {magicians.join(', ') || '—'}
          </p>

          {/* Type tags */}
          {types.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.875rem' }}>
              {types.slice(0, 2).map(t => (
                <span key={t} className="badge-type">{t}</span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
          }}>
            <StatusBadge status={isAvailable ? 'available' : 'out'} />
            {(dvd.producer || dvd.year) && (
              <span style={{
                fontFamily: "'Josefin Sans', sans-serif",
                fontSize: '0.62rem',
                letterSpacing: '0.08em',
                color: 'var(--text-dim)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '8rem',
              }}>
                {dvd.producer || dvd.year}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
