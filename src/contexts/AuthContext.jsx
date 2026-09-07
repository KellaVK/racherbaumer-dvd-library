import { createContext, useContext, useEffect, useState, useRef } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

// Known admin accounts and environment-configured admin emails
const KNOWN_ADMINS = [
  'kruebbe527@gmail.com',
  'kellakruebbe@gmail.com',
  ...(import.meta.env.VITE_ADMIN_EMAILS || '').split(','),
]
export const ADMIN_EMAILS = new Set(
  KNOWN_ADMINS.map(e => e.trim().toLowerCase()).filter(Boolean)
)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function register(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName })
    const isConfiguredAdmin = ADMIN_EMAILS.has(email.toLowerCase())
    // Create user doc in Firestore
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email,
      displayName,
      role: isConfiguredAdmin ? 'admin' : 'pending',
      createdAt: serverTimestamp(),
    })
    return cred
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
  }

  function logout() {
    return signOut(auth)
  }

  // Holds the unsubscribe fn for the profile listener
  const profileUnsubRef = useRef(null)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up previous profile listener
      if (profileUnsubRef.current) {
        profileUnsubRef.current()
        profileUnsubRef.current = null
      }

      setUser(firebaseUser)

      if (firebaseUser) {
        const isConfiguredAdmin = !!firebaseUser.email && ADMIN_EMAILS.has(firebaseUser.email.toLowerCase())

        // Live listener — updates role in real-time
        profileUnsubRef.current = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data()
              // If user is a configured admin but Firestore doc isn't marked admin, self-heal
              if (isConfiguredAdmin && data.role !== 'admin') {
                setDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' }, { merge: true }).catch(() => {})
                setUserProfile({ ...data, role: 'admin' })
              } else {
                setUserProfile(data)
              }
            } else {
              // Create user doc in Firestore if missing
              const fallback = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || '',
                role: isConfiguredAdmin ? 'admin' : 'pending',
                createdAt: serverTimestamp(),
              }
              setDoc(doc(db, 'users', firebaseUser.uid), fallback, { merge: true }).catch(err => {
                console.warn('Could not auto-create profile doc in Firestore:', err)
              })
              setUserProfile(fallback)
            }
            setLoading(false)
          },
          (err) => {
            console.error('Firestore profile listener error:', err)
            if (isConfiguredAdmin) {
              setUserProfile({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || '',
                role: 'admin',
              })
            }
            setLoading(false)
          }
        )
      } else {
        setUserProfile(null)
        setLoading(false)
      }
    })

    // Safety timeout: never let auth check block the application indefinitely
    const timeout = setTimeout(() => setLoading(false), 3000)

    return () => {
      clearTimeout(timeout)
      unsubAuth()
      if (profileUnsubRef.current) profileUnsubRef.current()
    }
  }, [])

  function fetchUserProfile() {}

  const isConfiguredAdmin = !!user?.email && ADMIN_EMAILS.has(user.email.toLowerCase())
  const isAdmin = userProfile?.role === 'admin' || isConfiguredAdmin
  const isApproved = isAdmin || userProfile?.role === 'approved'

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      isAdmin,
      isApproved,
      loading,
      register,
      login,
      logout,
      fetchUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
