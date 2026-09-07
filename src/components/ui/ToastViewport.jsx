import { useToast } from '../../contexts/ToastContext'

export default function ToastViewport() {
  const { toasts, dismiss } = useToast()
  return <div className="toast-viewport" aria-live="polite" aria-atomic="false">
    {toasts.map(toast => <div className={`toast toast-${toast.tone || 'info'}`} role="status" key={toast.id}>
      <span>{toast.message}</span>
      <button className="icon-button" aria-label="Dismiss message" onClick={() => dismiss(toast.id)}>×</button>
    </div>)}
  </div>
}
