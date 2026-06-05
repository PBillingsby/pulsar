import type { IncomingEvent } from '@/types/index'

const VALID_TYPES: ReadonlySet<string> = new Set<IncomingEvent['type']>([
  'page_view', 'click', 'dead_click', 'rage_click', 'scroll_depth',
  'session_end', 'form_submit', 'copy', 'tab_focus', 'tab_blur'
])

export function isValidEvent(event: unknown): event is IncomingEvent {
  if (!event || typeof event !== 'object') return false

  const e = event as Record<string, unknown>

  return (
    typeof e.type === 'string' &&
    VALID_TYPES.has(e.type as IncomingEvent['type']) &&
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