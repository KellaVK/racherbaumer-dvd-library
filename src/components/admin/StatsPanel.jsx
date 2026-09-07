export default function StatsPanel({ dvds, users, checkouts }) {
  const stats = [
    ['DVDs', dvds.length], ['Available', dvds.filter(item => !item.checkedOutBy).length],
    ['Checked out', dvds.filter(item => item.checkedOutBy).length], ['Members', users.filter(item => item.role !== 'pending').length],
    ['All requests', checkouts.length], ['Summaries ready', dvds.filter(item => item.aiSummaryStatus === 'complete').length],
  ]
  const ranks = values => Object.values(values).sort((a, b) => b.count - a.count).slice(0, 5)
  const topDVDs = ranks(checkouts.reduce((all, item) => ({ ...all, [item.dvdId]: { name: item.dvdTitle, count: (all[item.dvdId]?.count || 0) + 1 } }), {}))
  const topUsers = ranks(checkouts.reduce((all, item) => ({ ...all, [item.requesterId]: { name: item.requesterName, count: (all[item.requesterId]?.count || 0) + 1 } }), {}))
  return <div>
    <div className="stats-grid">{stats.map(([label, value]) => <div className="stat-panel" key={label}><span>{value}</span><small>{label}</small></div>)}</div>
    <div className="ranking-grid">
      {[['Most requested', topDVDs], ['Most active borrowers', topUsers]].map(([title, rows]) => <section className="card ranking" key={title}><h2>{title}</h2>{rows.map((row, index) => <p key={`${row.name}-${index}`}><span>{row.name}</span><strong>{row.count}</strong></p>)}{!rows.length && <small>No checkout activity yet.</small>}</section>)}
    </div>
  </div>
}
