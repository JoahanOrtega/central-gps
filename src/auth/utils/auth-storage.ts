import type { AuthUser } from "../types/auth.types"

const TOKEN_KEY = "token"
const AUTH_USER_KEY = "authUser"

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

export const getStoredAuthUser = (): AuthUser | null => {
  const storedUser = localStorage.getItem(AUTH_USER_KEY)

  if (!storedUser) {
    return null
  }

  try {
    return JSON.parse(storedUser) as AuthUser
  } catch {
    return null
  }
}

export const saveAuthSession = (token: string, user: AuthUser): void => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export const clearAuthSession = (): void => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

export const hasActiveSession = (): boolean => {
  return Boolean(getStoredToken())
}