export interface AdminSessionUser {
  name: string
  role: 'admin' | 'staff'
  email: string
  loginTime: string
}

const AUTH_STORAGE_KEY = 'fpUser'

function canUseStorage() {
  return typeof window !== 'undefined'
}

export function getStoredAdminUser(): AdminSessionUser | null {
  if (!canUseStorage()) return null

  try {
    const localValue = localStorage.getItem(AUTH_STORAGE_KEY)
    if (localValue) {
      return JSON.parse(localValue) as AdminSessionUser
    }

    const sessionValue = sessionStorage.getItem(AUTH_STORAGE_KEY)
    if (sessionValue) {
      return JSON.parse(sessionValue) as AdminSessionUser
    }
  } catch {
    return null
  }

  return null
}

export function setStoredAdminUser(user: AdminSessionUser | null) {
  if (!canUseStorage()) return

  if (!user) {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
    return
  }

  const serialized = JSON.stringify(user)
  localStorage.setItem(AUTH_STORAGE_KEY, serialized)
  sessionStorage.setItem(AUTH_STORAGE_KEY, serialized)
}

export function clearStoredAdminUser() {
  setStoredAdminUser(null)
}
