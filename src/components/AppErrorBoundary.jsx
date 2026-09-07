import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  state = { error: null, errorInfo: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('AppErrorBoundary caught an uncaught runtime error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.error) {
      return (
        <main className="error-boundary" style={{ maxWidth: '40rem', margin: '5rem auto', padding: '2rem', textAlign: 'center' }}>
          <p className="eyebrow" style={{ color: 'var(--gold)', letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '0.75rem' }}>
            Something went wrong
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', margin: '0.75rem 0' }}>
            The library hit an unexpected error.
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Your data was not changed. Reload the page to try again.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Reload library
            </button>
            <button className="btn-secondary" onClick={() => { window.location.href = '/' }}>
              Return to Catalog
            </button>
          </div>
          {this.state.error && (
            <details style={{ textAlign: 'left', marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-dim)', border: '1px solid var(--border)', padding: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontFamily: "'Josefin Sans', sans-serif", color: 'var(--text-muted)' }}>
                Technical Error Details
              </summary>
              <pre style={{ marginTop: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--danger, #f87171)' }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </main>
      )
    }
    return this.props.children
  }
}
