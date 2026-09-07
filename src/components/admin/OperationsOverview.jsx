export default function OperationsOverview({ pendingCheckouts, queuedCheckouts, activeCheckouts, pendingUsers, summaryFailures, onNavigate }) {
  const items = [
    { label: 'Checkout requests', value: pendingCheckouts.length, detail: 'Ready for an admin decision', tab: 'checkouts' },
    { label: 'Waiting users', value: pendingUsers.length, detail: 'Accounts awaiting approval', tab: 'users' },
    { label: 'Currently out', value: activeCheckouts.length, detail: `${queuedCheckouts.length} queued behind borrowed titles`, tab: 'checkouts' },
    { label: 'Summary attention', value: summaryFailures.length, detail: 'Failed or lacking enough metadata', tab: 'dvds' },
  ]
  return <div>
    <div className="operations-grid">
      {items.map(item => <button key={item.label} className="operation-card" onClick={() => onNavigate(item.tab)}>
        <span className="operation-number">{item.value}</span>
        <strong>{item.label}</strong>
        <small>{item.detail}</small>
      </button>)}
    </div>
    {!pendingCheckouts.length && !pendingUsers.length && <div className="admin-empty"><span>◆</span><h2>You’re caught up.</h2><p>There are no checkout or user approvals waiting.</p></div>}
  </div>
}
