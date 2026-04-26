const ACCESS_TOKEN_KEY  = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_EMAIL_KEY    = 'userEmail'
const AUTHENTICATED_KEY = 'isAuthenticated'
const EXPIRES_AT_KEY    = 'expiresAt'

export const session = {
  setAuth(email: string, accessToken: string, refreshToken: string, expiresIn = 900) {
    localStorage.setItem(AUTHENTICATED_KEY, 'true')
    localStorage.setItem(USER_EMAIL_KEY, email)
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    // Store absolute expiry timestamp (ms), refresh 60s before expiry
    localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + (expiresIn - 60) * 1000))
  },

  clearAuth() {
    localStorage.removeItem(AUTHENTICATED_KEY)
    localStorage.removeItem(USER_EMAIL_KEY)
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(EXPIRES_AT_KEY)
  },

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  getUserEmail(): string | null {
    return localStorage.getItem(USER_EMAIL_KEY)
  },

  isTokenExpiringSoon(): boolean {
    const expiresAt = localStorage.getItem(EXPIRES_AT_KEY)
    if (!expiresAt) return false
    return Date.now() >= parseInt(expiresAt)
  },
}
