import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import { normalizeList, validateDVDForm } from '../utils/dvd'

const TEXT_FIELDS = ['title', 'notes', 'producer', 'year', 'vanishingIncUrl', 'penguinUrl', 'conjuringArchiveUrl']

export function buildDVDPayload(form, { isNew = false, includeSummary = false } = {}) {
  const payload = {
    magician: normalizeList(form.magician),
    magicType: normalizeList(form.magicType),
    otherFeatures: normalizeList(form.otherFeatures),
    featured: form.featured === true,
  }
  TEXT_FIELDS.forEach(field => { payload[field] = String(form[field] ?? '').trim() })
  if (isNew) {
    Object.assign(payload, {
      checkedOutBy: null,
      checkedOutByName: null,
      checkedOutAt: null,
      aiSummary: '',
      aiSummaryStatus: 'generating',
      createdAt: serverTimestamp(),
    })
  } else if (includeSummary && typeof form.aiSummary === 'string') {
    payload.aiSummary = form.aiSummary.trim()
    if (payload.aiSummary && !form.aiSummaryStatus) {
      payload.aiSummaryStatus = 'complete'
    }
  }
  return payload
}

export async function requestDVDSummary(dvdId, { currentUser = auth.currentUser, database = db } = {}) {
  if (!currentUser) throw new Error('Sign in as an administrator to generate a summary.')
  const dvdRef = doc(database, 'dvds', dvdId)
  await updateDoc(dvdRef, { aiSummaryStatus: 'generating', aiSummaryUpdatedAt: serverTimestamp() })
  try {
    const token = await currentUser.getIdToken()
    const response = await fetch('/api/summarize-dvd', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ dvdId, uid: currentUser.uid }),
    })
    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      throw new Error(result.error || 'The summary service could not start.')
    }
    return true
  } catch (error) {
    await updateDoc(dvdRef, { aiSummaryStatus: 'failed', aiSummaryUpdatedAt: serverTimestamp() })
    throw error
  }
}

export async function createDVD(form, { currentUser = auth.currentUser, database = db } = {}) {
  const errors = validateDVDForm(form)
  if (Object.keys(errors).length) throw Object.assign(new Error('Review the highlighted DVD fields.'), { errors })
  const created = await addDoc(collection(database, 'dvds'), buildDVDPayload(form, { isNew: true }))
  try {
    await requestDVDSummary(created.id, { currentUser, database })
    return { id: created.id, summaryRequested: true }
  } catch (summaryError) {
    return { id: created.id, summaryRequested: false, summaryError }
  }
}

export async function updateDVD(dvdId, form, database = db) {
  const errors = validateDVDForm(form)
  if (Object.keys(errors).length) throw Object.assign(new Error('Review the highlighted DVD fields.'), { errors })
  await updateDoc(doc(database, 'dvds', dvdId), {
    ...buildDVDPayload(form, { includeSummary: true }),
    updatedAt: serverTimestamp(),
  })
}

export function removeDVD(dvdId, database = db) {
  return deleteDoc(doc(database, 'dvds', dvdId))
}
