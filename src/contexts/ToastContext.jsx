import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)
  const dismiss = useCallback(id => setToasts(items => items.filter(item => item.id !== id)), [])
  const push = useCallback(({ message, tone = 'info', duration = 5000 }) => {
    const id = ++nextId.current
    setToasts(items => [...items, { id, message, tone }])
    if (duration) window.setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])
  const value = useMemo(() => ({ toasts, push, dismiss }), [dismiss, push, toasts])
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used inside ToastProvider')
  return value
}
