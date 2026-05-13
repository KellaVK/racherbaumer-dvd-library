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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function register(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName })
    // Create user doc in Firestore
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email,
      displayName,
      role: 'pending', // Admin must approve new users
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

  // Holds the unsubscribe fn for the profile listener so we can clean it up
  // when the auth user changes.
  const profileUnsubRef = useRef(null)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up the previous profile listener whenever auth state changes
      if (profileUnsubRef.current) {
        profileUnsubRef.current()
        profileUnsubRef.current = null
      }

      setUser(firebaseUser)

      if (firebaseUser) {
        // Live listener — updates role in real-time when admin approves/changes user
        profileUnsubRef.current = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (snap) => {
            setUserProfile(snap.exists() ? snap.data() : null)
            setLoading(false)
          },
          () => setLoading(false) // on error, still stop loading
        )
      } else {
        setUserProfile(null)
        setLoading(false)
      }
    })

    return () => {
      unsubAuth()
      if (profileUnsubRef.current) profileUnsubRef.current()
    }
  }, [])

  // Keep fetchUserProfile for any call-sites that still use it directly
  function fetchUserProfile() {
    // No-op — profile is now kept live by onSnapshot above
  }

  const isAdmin = userProfile?.role === 'admin'
  const isApproved = userProfile?.role === 'admin' || userProfile?.role === 'approved'

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
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
