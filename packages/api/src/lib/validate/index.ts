import type { IncomingEvent } from '@/types/index'

const VALID_TYPES = ['page_view', 'click', 'session_end'] as const

export function isValidEvent(event: unknown): event is IncomingEvent {
  if (!event || typeof event !== 'object') return false

  const e = event as Record<string, unknown>

  return (
    typeof e.type === 'string' &&
    VALID_TYPES.includes(e.type as typeof VALID_TYPES[number]) &&
    typeof e.sessionId === 'string' &&
    typeof e.projectKey === 'string' &&
    typeof e.url === 'string' &&
    typeof e.timestamp === 'string'
  )
}

export function validatePayload(body: unknown): IncomingEvent[] | null {
  if (!body || typeof body !== 'object') return null

  const payload: Record<string, unknown> = body as Record<string, unknown>

  if (!Array.isArray(payload.events)) return null

  const valid: IncomingEvent[] = payload.events.filter(isValidEvent)

  if (valid.length === 0) return null

  return valid
}