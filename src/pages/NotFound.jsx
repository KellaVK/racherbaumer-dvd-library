import { Link } from 'react-router-dom'
import { useEffect } from 'react'

export default function NotFound() {
  useEffect(() => {
    document.title = 'Page Not Found — Jon Racherbaumer Magic DVD Library'
  }, [])

  return (
    <div style={{
      maxWidth: '36rem',
      margin: '0 auto',
      padding: '6rem 1.5rem',
      textAlign: 'center',
    }}
      className="page-enter"
    >
      <div className="deco-divider"><span>◆</span></div>

      <p style={{
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: '0.7rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--gold)',
        marginBottom: '0.75rem',
      }}>
        404 · Archival Record Missing
      </p>

      <h1 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: '2rem',
        fontWeight: 500,
        color: 'var(--text)',
        marginBottom: '1rem',
      }}>
        This page could not be found
      </h1>

      <p style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: '0.9rem',
        lineHeight: 1.7,
        color: 'var(--text-muted)',
        marginBottom: '2rem',
      }}>
        The requested title, collection record, or shelf location may have moved or does not exist in the catalog.
      </p>

      <Link to="/" className="btn-primary">
        Return to the Library
      </Link>
    </div>
  )
}
