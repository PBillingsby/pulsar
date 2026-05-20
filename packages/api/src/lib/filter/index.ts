import type { IncomingEvent } from '@/types/index'

const MAX_EVENTS_PER_BATCH = 100
const MAX_TIMESTAMP_DRIFT_MS = 24 * 60 * 60 * 1000

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname
    return (
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1' &&
      !hostname.startsWith('192.168.') &&
      !hostname.startsWith('10.') &&
      parsed.protocol.startsWith('http')
    )
  } catch {
    return false
  }
}

function isValidSessionId(sessionId: string): boolean {
  return (
    typeof sessionId === 'string' &&
    sessionId.length > 0 &&
    sessionId.length < 128
  )
}

function isValidTimestamp(timestamp: string): boolean {
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return false

  const now = Date.now()
  const diff = Math.abs(now - date.getTime())
  return diff < MAX_TIMESTAMP_DRIFT_MS
}

export interface FilterResult {
  passed: IncomingEvent[]
  dropped: number
  reasons: string[]
}

export function filterEvents(
  events: IncomingEvent[],
  debug: boolean = false
): FilterResult {
  const reasons: string[] = []
  const passed: IncomingEvent[] = []

  // check batch size per session
  const sessionCounts: Record<string, number> = {}
  for (const event of events) {
    sessionCounts[event.sessionId] = (sessionCounts[event.sessionId] ?? 0) + 1
  }

  const flaggedSessions = new Set(
    Object.entries(sessionCounts)
      .filter(([_, count]) => count > MAX_EVENTS_PER_BATCH)
      .map(([sessionId]) => sessionId)
  )

  if (flaggedSessions.size > 0 && debug) {
    reasons.push(`Dropped sessions exceeding ${MAX_EVENTS_PER_BATCH} events: ${[...flaggedSessions].join(', ')}`)
  }

  for (const event of events) {
    if (flaggedSessions.has(event.sessionId)) {
      continue
    }

    if (!isValidUrl(event.url)) {
      if (debug) reasons.push(`Dropped event with invalid URL: ${event.url}`)
      continue
    }

    if (!isValidSessionId(event.sessionId)) {
      if (debug) reasons.push(`Dropped event with invalid sessionId: ${event.sessionId}`)
      continue
    }

    if (!isValidTimestamp(event.timestamp)) {
      if (debug) reasons.push(`Dropped event with invalid timestamp: ${event.timestamp}`)
      continue
    }

    passed.push(event)
  }

  return {
    passed,
    dropped: events.length - passed.length,
    reasons,
  }
}