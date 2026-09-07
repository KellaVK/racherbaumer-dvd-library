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
    let dvdsDone = false
    let usersDone = false
    let checkoutsDone = false

    const checkComplete = () => {
      if (dvdsDone && usersDone && checkoutsDone) {
        setLoading(false)
      }
    }

    // Safety timeout: never leave admin page in an infinite loading state
    const timeout = setTimeout(() => setLoading(false), 2500)

    const unsubDvds = onSnapshot(
      collection(db, 'dvds'),
      snap => {
        const list = snap.docs
          .map(item => normalizeDVD({ id: item.id, ...item.data() }))
          .sort((a, b) => String(a?.title || '').localeCompare(String(b?.title || '')))
        setDvds(list)
        dvdsDone = true
        checkComplete()
      },
      err => {
        console.error('Admin dvds listener error:', err)
        dvdsDone = true
        checkComplete()
      }
    )

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      snap => {
        const list = snap.docs
          .map(item => ({ id: item.id, ...item.data() }))
          .sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? (a.createdAt instanceof Date ? a.createdAt.getTime() : 0)
            const tb = b.createdAt?.toMillis?.() ?? (b.createdAt instanceof Date ? b.createdAt.getTime() : 0)
            return tb - ta
          })
        setUsers(list)
        usersDone = true
        checkComplete()
      },
      err => {
        console.error('Admin users listener error:', err)
        setError(prev => prev || err.message)
        usersDone = true
        checkComplete()
      }
    )

    const unsubCheckouts = onSnapshot(
      collection(db, 'checkouts'),
      snap => {
        const list = snap.docs
          .map(item => ({ id: item.id, ...item.data() }))
          .sort((a, b) => {
            const ta = a.requestedAt?.toMillis?.() ?? (a.requestedAt instanceof Date ? a.requestedAt.getTime() : 0)
            const tb = b.requestedAt?.toMillis?.() ?? (b.requestedAt instanceof Date ? b.requestedAt.getTime() : 0)
            return tb - ta
          })
        setCheckouts(list)
        checkoutsDone = true
        checkComplete()
      },
      err => {
        console.error('Admin checkouts listener error:', err)
        setError(prev => prev || err.message)
        checkoutsDone = true
        checkComplete()
      }
    )

    return () => {
      clearTimeout(timeout)
      unsubDvds()
      unsubUsers()
      unsubCheckouts()
    }
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
