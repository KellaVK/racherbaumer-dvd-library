import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) { return { error } }

  render() {
    if (this.state.error) return <main className="error-boundary">
      <p className="eyebrow">Something went wrong</p>
      <h1>The library hit an unexpected error.</h1>
      <p>Your data was not changed. Reload the page to try again.</p>
      <button className="btn-primary" onClick={() => window.location.reload()}>Reload library</button>
    </main>
    return this.props.children
  }
}
