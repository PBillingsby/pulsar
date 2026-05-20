const SESSION_KEY = 'pulsar_session_id'
const SESSION_EXPIRY_KEY = 'pulsar_session_expiry'
const SESSION_DURATION_MS = 30 * 60 * 1000 // 30 minutes

export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getOrCreateSessionId(): string {
  const existing = localStorage.getItem(SESSION_KEY)
  const expiry = localStorage.getItem(SESSION_EXPIRY_KEY)

  if (existing && expiry && Date.now() < parseInt(expiry)) {
    // extend session on activity
    localStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_DURATION_MS))
    return existing
  }

  const newId = generateSessionId()
  localStorage.setItem(SESSION_KEY, newId)
  localStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_DURATION_MS))
  return newId
}