import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

const ROLES = new Set(['pending', 'approved', 'admin'])

export function assertRoleChange({ actorId, userId, currentRole, nextRole }) {
  if (!ROLES.has(nextRole)) throw new Error('Unsupported user role.')
  if (actorId === userId && currentRole === 'admin' && nextRole !== 'admin') {
    throw new Error('You cannot remove your own admin access.')
  }
  return true
}

export async function setUserRole({ actorId, user, role }, database = db) {
  assertRoleChange({ actorId, userId: user.id, currentRole: user.role, nextRole: role })
  await updateDoc(doc(database, 'users', user.id), { role, roleUpdatedAt: serverTimestamp(), roleUpdatedBy: actorId })
}
