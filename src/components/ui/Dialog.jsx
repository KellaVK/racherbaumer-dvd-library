import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Dialog({ open, title, onClose, dirty = false, size = 'large', children, footer }) {
  const titleId = useId()
  const panelRef = useRef(null)
  const priorFocus = useRef(null)
  const dirtyRef = useRef(dirty)
  const closeRef = useRef(onClose)
  dirtyRef.current = dirty
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    priorFocus.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const first = panel?.querySelector('.dialog-body input:not([disabled]), .dialog-body select:not([disabled]), .dialog-body textarea:not([disabled]), .dialog-body button:not([disabled]), .dialog-body [href]')
      || panel?.querySelector(FOCUSABLE)
    first?.focus()

    const requestClose = () => {
      if (dirtyRef.current && !window.confirm('Discard your unsaved changes?')) return
      closeRef.current()
    }
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const focusable = [...panel.querySelectorAll(FOCUSABLE)]
      if (!focusable.length) return
      const firstItem = focusable[0]
      const lastItem = focusable.at(-1)
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      priorFocus.current?.focus()
    }
  }, [open])

  if (!open) return null
  const requestClose = () => {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return
    onClose()
  }

  return createPortal(
    <div className="dialog-backdrop" onMouseDown={event => event.target === event.currentTarget && requestClose()}>
      <section
        ref={panelRef}
        className={`dialog-shell dialog-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="dialog-header">
          <div>
            <span className="eyebrow">Library record</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button type="button" className="icon-button" aria-label={`Close ${title}`} onClick={requestClose}>×</button>
        </header>
        <div className="dialog-body">{children}</div>
        {footer && <footer className="dialog-footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  )
}
