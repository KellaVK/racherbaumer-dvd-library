import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase/config'
import { normalizeDVD } from '../utils/dvd'

export default function useAdminData() {
  const [checkouts, setCheckouts] = useState([])
  const [users, setUsers] = useState([])
  const [dvds, setDvds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ready = 0
    const complete = () => { ready += 1; if (ready === 3) setLoading(false) }
    const fail = failure => { setError(failure.message || 'Admin data could not be loaded.'); setLoading(false) }
    const unsubs = [
      onSnapshot(query(collection(db, 'checkouts'), orderBy('requestedAt', 'desc')), snap => { setCheckouts(snap.docs.map(item => ({ id: item.id, ...item.data() }))); complete() }, fail),
      onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), snap => { setUsers(snap.docs.map(item => ({ id: item.id, ...item.data() }))); complete() }, fail),
      onSnapshot(query(collection(db, 'dvds'), orderBy('title')), snap => { setDvds(snap.docs.map(item => normalizeDVD({ id: item.id, ...item.data() }))); complete() }, fail),
    ]
    return () => unsubs.forEach(unsubscribe => unsubscribe())
  }, [])

  const derived = useMemo(() => ({
    pendingCheckouts: checkouts.filter(item => item.status === 'pending'),
    queuedCheckouts: checkouts.filter(item => item.status === 'queued'),
    activeCheckouts: checkouts.filter(item => item.status === 'active'),
    pendingUsers: users.filter(item => item.role === 'pending'),
    summaryFailures: dvds.filter(item => item.aiSummaryStatus === 'failed' || item.aiSummaryStatus === 'insufficient'),
  }), [checkouts, dvds, users])

  return { checkouts, users, dvds, loading, error, ...derived }
}
