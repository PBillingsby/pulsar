import type { FilterResult, IncomingEvent } from '@/types/index'

const MAX_EVENTS_PER_BATCH = 100
const MAX_TIMESTAMP_DRIFT_MS = 24 * 60 * 60 * 1000
const MIN_SESSION_DURATION_MS = 5000

function isValidUrl(url: string): boolean {
  try {
    const parsed: string | URL = new URL(url)
    const hostname: string = parsed.hostname
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
  const date: Date | string = new Date(timestamp)
  if (isNaN(date.getTime())) return false
  const now: number = Date.now()
  const diff: number = Math.abs(now - date.getTime())
  return diff < MAX_TIMESTAMP_DRIFT_MS
}

function isBounce(event: IncomingEvent): boolean {
  if (!event.sessionStart) return false
  const start: number = new Date(event.sessionStart).getTime()
  const now: number = new Date(event.timestamp).getTime()
  return (now - start) < MIN_SESSION_DURATION_MS
}

function isMeaningfulClick(event: IncomingEvent): boolean {
  if (event.type !== 'click') return true
  const label: string = (event.metadata?.label as string) ?? ''
  const tag: string = (event.metadata?.tagName as string) ?? ''
  const noiseTags: Set<string> = new Set(['html', 'body', 'div', 'span', 'section', 'main', 'article', 'aside', 'header', 'footer', 'nav'])
  if (noiseTags.has(tag) && (!label || label === tag)) return false
  return true
}

export function filterEvents(
  events: IncomingEvent[],
  debug: boolean = false,
  ignored: boolean = false
): FilterResult {
  const reasons: string[] = []
  const passed: IncomingEvent[] = []

  if (ignored) {
    return { passed: [], dropped: events.length, reasons: debug ? ['Session marked as ignored'] : [] }
  }

  const sessionCounts: Record<string, number> = {}
  for (const event of events) {
    sessionCounts[event.sessionId] = (sessionCounts[event.sessionId] ?? 0) + 1
  }

  const flaggedSessions: Set<string> = new Set(
    Object.entries(sessionCounts)
      .filter(([_, count]) => count > MAX_EVENTS_PER_BATCH)
      .map(([sessionId]) => sessionId)
  )

  if (flaggedSessions.size > 0 && debug) {
    reasons.push(`Dropped sessions exceeding ${MAX_EVENTS_PER_BATCH} events: ${[...flaggedSessions].join(', ')}`)
  }

  for (const event of events) {
    if (flaggedSessions.has(event.sessionId)) continue

    if (!isValidUrl(event.url)) {
      if (debug) reasons.push(`Dropped event with invalid URL: ${event.url}`)
      continue
    }

    if (!isValidSessionId(event.sessionId)) {
      if (debug) reasons.push(`Dropped event with invalid sessionId`)
      continue
    }

    if (!isValidTimestamp(event.timestamp)) {
      if (debug) reasons.push(`Dropped event with invalid timestamp`)
      continue
    }

    if (isBounce(event)) {
      if (debug) reasons.push(`Dropped bounce event — session under 5 seconds`)
      continue
    }

    if (!isMeaningfulClick(event)) {
      if (debug) reasons.push(`Dropped unlabeled click on noise element`)
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