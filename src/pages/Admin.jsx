import { useState } from 'react'
import useAdminData from '../hooks/useAdminData'
import Notice from '../components/ui/Notice'
import OperationsOverview from '../components/admin/OperationsOverview'
import CheckoutManager from '../components/admin/CheckoutManager'
import UserManager from '../components/admin/UserManager'
import DVDManager from '../components/admin/DVDManager'
import StatsPanel from '../components/admin/StatsPanel'

const TABS = [
  ['overview', 'Operations'], ['checkouts', 'Checkouts'], ['users', 'Users'], ['dvds', 'DVDs'], ['stats', 'Insights'],
]

export default function Admin() {
  const [tab, setTab] = useState('overview')
  const data = useAdminData()
  if (data.loading) return <div className="page-status">Loading administration…</div>
  return <div className="admin-page page-enter">
    <header className="admin-header">
      <div><p className="eyebrow">Collection desk</p><h1>Library administration</h1><p>Approve members, manage circulation, and maintain the catalog.</p></div>
      <div className="admin-alert-count"><strong>{data.pendingCheckouts.length + data.pendingUsers.length}</strong><span>items waiting</span></div>
    </header>
    {data.error && <Notice tone="danger" title="Some admin data could not be loaded">{data.error}</Notice>}
    <nav className="admin-tabs" aria-label="Administration sections">
      {TABS.map(([id, label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}{id === 'checkouts' && data.pendingCheckouts.length > 0 && <span>{data.pendingCheckouts.length}</span>}{id === 'users' && data.pendingUsers.length > 0 && <span>{data.pendingUsers.length}</span>}</button>)}
    </nav>
    {tab === 'overview' && <OperationsOverview {...data} onNavigate={setTab} />}
    {tab === 'checkouts' && <CheckoutManager pending={data.pendingCheckouts} active={data.activeCheckouts} queued={data.queuedCheckouts} />}
    {tab === 'users' && <UserManager users={data.users} />}
    {tab === 'dvds' && <DVDManager dvds={data.dvds} checkouts={data.checkouts} />}
    {tab === 'stats' && <StatsPanel dvds={data.dvds} users={data.users} checkouts={data.checkouts} />}
  </div>
}
