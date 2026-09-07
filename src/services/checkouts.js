import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
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
  const legacy = await getDocs(query(
    collection(database, 'checkouts'),
    where('dvdId', '==', dvd.id),
    where('requesterId', '==', user.uid),
    where('status', 'in', ['pending', 'queued', 'active']),
    limit(1),
  ))
  if (!legacy.empty) throw checkoutError('duplicate-request', 'You already have an open request for this DVD.')

  const checkoutRef = doc(collection(database, 'checkouts'))
  const dvdRef = doc(database, 'dvds', dvd.id)
  const lockRef = doc(database, 'openRequests', checkoutLockId(dvd.id, user.uid))
  await runTransaction(database, async transaction => {
    const [lockSnap, dvdSnap] = await Promise.all([transaction.get(lockRef), transaction.get(dvdRef)])
    if (lockSnap.exists()) throw checkoutError('duplicate-request', 'You already have an open request for this DVD.')
    if (!dvdSnap.exists()) throw checkoutError('not-found', 'This DVD is no longer in the library.')
    const currentDVD = dvdSnap.data()
    const status = getCheckoutLane(currentDVD)
    const now = serverTimestamp()
    transaction.set(checkoutRef, {
      dvdId: dvd.id,
      dvdTitle: currentDVD.title || dvd.title,
      requesterId: user.uid,
      requesterName: userProfile?.displayName || user.displayName || user.email,
      requesterEmail: user.email || '',
      status,
      requestedAt: now,
      returnedAt: null,
    })
    transaction.set(lockRef, { dvdId: dvd.id, requesterId: user.uid, checkoutId: checkoutRef.id, status, createdAt: now })
  })
  return { id: checkoutRef.id, status: getCheckoutLane(dvd) }
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
  const batch = writeBatch(database)
  batch.update(doc(database, 'checkouts', checkout.id), { status: 'denied', resolvedAt: serverTimestamp() })
  batch.delete(doc(database, 'openRequests', checkoutLockId(checkout.dvdId, checkout.requesterId)))
  await batch.commit()
}

async function promoteNextQueued(dvdId, database) {
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
    transaction.update(lockRef, { status: 'pending' })
  })
}

export async function returnDVD(checkout, database = db) {
  const checkoutRef = doc(database, 'checkouts', checkout.id)
  const dvdRef = doc(database, 'dvds', checkout.dvdId)
  const lockRef = doc(database, 'openRequests', checkoutLockId(checkout.dvdId, checkout.requesterId))
  await runTransaction(database, async transaction => {
    const dvdSnap = await transaction.get(dvdRef)
    transaction.update(checkoutRef, { status: 'returned', returnedAt: serverTimestamp() })
    transaction.delete(lockRef)
    if (dvdSnap.exists() && dvdSnap.data().checkedOutBy === checkout.requesterId) {
      transaction.update(dvdRef, { checkedOutBy: null, checkedOutByName: null, checkedOutAt: null })
    }
  })
  await promoteNextQueued(checkout.dvdId, database)
}

export async function forceReturn(dvd, database = db) {
  const active = await getDocs(query(collection(database, 'checkouts'), where('dvdId', '==', dvd.id), where('status', '==', 'active')))
  const batch = writeBatch(database)
  batch.update(doc(database, 'dvds', dvd.id), { checkedOutBy: null, checkedOutByName: null, checkedOutAt: null })
  active.docs.forEach(checkoutDoc => {
    const checkout = checkoutDoc.data()
    batch.update(checkoutDoc.ref, { status: 'returned', returnedAt: serverTimestamp(), adminNote: 'Force returned by admin' })
    batch.delete(doc(database, 'openRequests', checkoutLockId(dvd.id, checkout.requesterId)))
  })
  await batch.commit()
  await promoteNextQueued(dvd.id, database)
}
