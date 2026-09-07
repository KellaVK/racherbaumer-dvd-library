import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase/config'

export function checkoutLockId(dvdId, userId) {
  return `${dvdId}_${userId}`.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export function getCheckoutLane(dvd) {
  return dvd?.checkedOutBy ? 'queued' : 'pending'
}

function checkoutError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

export async function requestCheckout({ dvd, user, userProfile }, database = db) {
  if (!dvd?.id || !user?.uid) throw checkoutError('invalid-request', 'DVD and borrower are required.')

  // Check if borrower already has an open or active request for this DVD
  try {
    const existingSnap = await getDocs(query(
      collection(database, 'checkouts'),
      where('requesterId', '==', user.uid),
    ))
    const isAlreadyOpen = existingSnap.docs.some(d => {
      const data = d.data()
      return data.dvdId === dvd.id && ['pending', 'queued', 'active'].includes(data.status)
    })
    if (isAlreadyOpen) {
      throw checkoutError('duplicate-request', 'You already have an open request for this DVD.')
    }
  } catch (err) {
    if (err.code === 'duplicate-request') throw err
    // If the checkouts check failed for other reasons (e.g. index/network), proceed to transaction
    console.warn('Pre-check for existing checkouts failed (non-fatal):', err)
  }

  const checkoutRef = doc(collection(database, 'checkouts'))
  const dvdRef = doc(database, 'dvds', dvd.id)
  const lockRef = doc(database, 'openRequests', checkoutLockId(dvd.id, user.uid))

  const now = serverTimestamp()
  const initialLane = getCheckoutLane(dvd)
  const checkoutData = {
    dvdId: dvd.id,
    dvdTitle: dvd.title,
    requesterId: user.uid,
    requesterName: userProfile?.displayName || user.displayName || user.email || 'Borrower',
    requesterEmail: user.email || '',
    status: initialLane,
    requestedAt: now,
    returnedAt: null,
  }

  // Attempt atomic transaction with openRequests concurrency lock
  try {
    await runTransaction(database, async transaction => {
      const [lockSnap, dvdSnap] = await Promise.all([
        transaction.get(lockRef),
        transaction.get(dvdRef),
      ])
      if (lockSnap.exists()) throw checkoutError('duplicate-request', 'You already have an open request for this DVD.')
      if (!dvdSnap.exists()) throw checkoutError('not-found', 'This DVD is no longer in the library.')
      const currentDVD = dvdSnap.data()
      checkoutData.dvdTitle = currentDVD.title || dvd.title
      checkoutData.status = getCheckoutLane(currentDVD)

      transaction.set(checkoutRef, checkoutData)
      transaction.set(lockRef, {
        dvdId: dvd.id,
        requesterId: user.uid,
        checkoutId: checkoutRef.id,
        status: checkoutData.status,
        createdAt: now,
      })
    })
    return { id: checkoutRef.id, status: checkoutData.status }
  } catch (err) {
    if (err.code === 'duplicate-request' || err.code === 'not-found') {
      throw err
    }

    // Fallback: If transaction failed (e.g. openRequests rules not yet deployed to Firebase Console),
    // directly create the checkout record so borrowers are never blocked.
    console.warn('Transaction with lock failed, attempting direct checkout fallback:', err)
    try {
      const fallbackRef = await addDoc(collection(database, 'checkouts'), checkoutData)
      return { id: fallbackRef.id, status: checkoutData.status }
    } catch (fallbackErr) {
      console.error('Direct checkout fallback failed:', fallbackErr)
      throw fallbackErr
    }
  }
}

export async function approveCheckout(checkout, database = db) {
  const checkoutRef = doc(database, 'checkouts', checkout.id)
  const dvdRef = doc(database, 'dvds', checkout.dvdId)
  await runTransaction(database, async transaction => {
    const [checkoutSnap, dvdSnap] = await Promise.all([transaction.get(checkoutRef), transaction.get(dvdRef)])
    if (!checkoutSnap.exists() || !dvdSnap.exists()) throw checkoutError('not-found', 'The request or DVD no longer exists.')
    if (dvdSnap.data().checkedOutBy) throw checkoutError('already-out', 'This DVD is already checked out.')
    transaction.update(checkoutRef, { status: 'active', approvedAt: serverTimestamp() })
    transaction.update(dvdRef, {
      checkedOutBy: checkout.requesterId,
      checkedOutByName: checkout.requesterName,
      checkedOutAt: serverTimestamp(),
    })
  })
}

export async function denyCheckout(checkout, database = db) {
  await updateDoc(doc(database, 'checkouts', checkout.id), {
    status: 'denied',
    resolvedAt: serverTimestamp(),
  })
  try {
    await deleteDoc(doc(database, 'openRequests', checkoutLockId(checkout.dvdId, checkout.requesterId)))
  } catch (err) {
    console.warn('Could not clear openRequests lock on deny (non-fatal):', err)
  }
}

async function promoteNextQueued(dvdId, database) {
  try {
    const queued = await getDocs(query(
      collection(database, 'checkouts'),
      where('dvdId', '==', dvdId),
      where('status', '==', 'queued'),
      orderBy('requestedAt', 'asc'),
      limit(1),
    ))
    if (queued.empty) return
    const nextRef = queued.docs[0].ref
    const lockRef = doc(database, 'openRequests', checkoutLockId(dvdId, queued.docs[0].data().requesterId))
    await runTransaction(database, async transaction => {
      const next = await transaction.get(nextRef)
      if (!next.exists() || next.data().status !== 'queued') return
      transaction.update(nextRef, { status: 'pending', queuedAt: null, promotedAt: serverTimestamp() })
    })
    try {
      await updateDoc(lockRef, { status: 'pending' })
    } catch {
      // non-fatal
    }
  } catch (err) {
    console.warn('promoteNextQueued error (non-fatal):', err)
  }
}

export async function returnDVD(checkout, database = db) {
  const checkoutRef = doc(database, 'checkouts', checkout.id)
  const dvdRef = doc(database, 'dvds', checkout.dvdId)
  const lockRef = doc(database, 'openRequests', checkoutLockId(checkout.dvdId, checkout.requesterId))
  await runTransaction(database, async transaction => {
    const dvdSnap = await transaction.get(dvdRef)
    transaction.update(checkoutRef, { status: 'returned', returnedAt: serverTimestamp() })
    if (dvdSnap.exists() && dvdSnap.data().checkedOutBy === checkout.requesterId) {
      transaction.update(dvdRef, { checkedOutBy: null, checkedOutByName: null, checkedOutAt: null })
    }
  })
  try {
    await deleteDoc(lockRef)
  } catch (err) {
    console.warn('Could not clear openRequests lock on return (non-fatal):', err)
  }
  await promoteNextQueued(checkout.dvdId, database)
}

export async function forceReturn(dvd, database = db) {
  const active = await getDocs(query(collection(database, 'checkouts'), where('dvdId', '==', dvd.id), where('status', '==', 'active')))
  const batch = writeBatch(database)
  batch.update(doc(database, 'dvds', dvd.id), { checkedOutBy: null, checkedOutByName: null, checkedOutAt: null })
  active.docs.forEach(checkoutDoc => {
    batch.update(checkoutDoc.ref, { status: 'returned', returnedAt: serverTimestamp(), adminNote: 'Force returned by admin' })
  })
  await batch.commit()
  for (const checkoutDoc of active.docs) {
    const checkout = checkoutDoc.data()
    try {
      await deleteDoc(doc(database, 'openRequests', checkoutLockId(dvd.id, checkout.requesterId)))
    } catch {
      // non-fatal
    }
  }
  await promoteNextQueued(dvd.id, database)
}
