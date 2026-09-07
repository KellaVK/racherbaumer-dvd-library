const LABELS = {
  available: 'Available', out: 'Checked out', pending: 'Pending', queued: 'Queued',
  approved: 'Approved', complete: 'Summary ready', generating: 'Summarizing',
  insufficient: 'Needs more details', failed: 'Summary failed', not_requested: 'Not summarized',
}

export default function StatusBadge({ status, children }) {
  return <span className={`status-badge status-${status}`}>{children || LABELS[status] || status}</span>
}
