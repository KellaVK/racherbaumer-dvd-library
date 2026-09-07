import Dialog from './Dialog'

export default function ConfirmDialog({ open, title = 'Confirm action', message, confirmLabel = 'Confirm', danger = false, busy, onConfirm, onClose }) {
  return <Dialog open={open} title={title} onClose={onClose} size="small" footer={<>
    <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
    <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
  </>}>
    <p>{message}</p>
  </Dialog>
}
