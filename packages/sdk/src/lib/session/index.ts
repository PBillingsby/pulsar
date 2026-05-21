const SESSION_KEY = 'pulsar_session_id'
const SESSION_EXPIRY_KEY = 'pulsar_session_expiry'
const SESSION_START_KEY = 'pulsar_session_start'
const SESSION_IGNORE_KEY = 'pulsar_ignore'
const SESSION_DURATION_MS = 30 * 60 * 1000

export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getOrCreateSessionId(): string {
  const existing = localStorage.getItem(SESSION_KEY)
  const expiry = localStorage.getItem(SESSION_EXPIRY_KEY)

  if (existing && expiry && Date.now() < parseInt(expiry)) {
    localStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_DURATION_MS))
    return existing
  }

  const newId = generateSessionId()
  localStorage.setItem(SESSION_KEY, newId)
  localStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_DURATION_MS))
  localStorage.setItem(SESSION_START_KEY, String(Date.now()))
  return newId
}

export function getSessionStart(): string {
  const start = localStorage.getItem(SESSION_START_KEY)
  return start ? new Date(parseInt(start)).toISOString() : new Date().toISOString()
}

export function setIgnoreFlag(): void {
  localStorage.setItem(SESSION_IGNORE_KEY, 'true')
}

export function isIgnored(): boolean {
  return localStorage.getItem(SESSION_IGNORE_KEY) === 'true'
}