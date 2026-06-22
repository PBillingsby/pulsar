import { EventQueue } from '@/lib/queue/index'
import type { PulsarEvent } from '@/types/index'

export function listenForSessionEvents(
  sessionId: string,
  projectKey: string,
  sessionStart: string,
  queue: EventQueue,
  debug: boolean
): void {
  let lastFocusTime: number = Date.now()
  let totalActiveMs: number = 0
  let ended: boolean = false

  function sendSessionEnd(reason: string): void {
    if (ended) return
    ended = true

    const now: number = Date.now()
    if (document.visibilityState === 'visible') {
      totalActiveMs += now - lastFocusTime
    }

    const durationSeconds: number = Math.round(totalActiveMs / 1000)

    const event: PulsarEvent = {
      type: 'session_end',
      sessionId,
      projectKey,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      sessionStart,
      metadata: { durationSeconds, reason },
    }

    if (debug) console.log(`[Pulsar] session_end — ${durationSeconds}s (${reason})`)

    // use sendBeacon for reliability on page unload
    const endpoint: string = (window as Window & { __pulsarEndpoint?: string }).__pulsarEndpoint ?? 'https://pulsar-api-production-0bc2.up.railway.app/events'

    const payload: string = JSON.stringify({ events: [event] })
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }))
    } else {
      queue.enqueue(event)
    }
  }

  function onVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      totalActiveMs += Date.now() - lastFocusTime

      const blurEvent: PulsarEvent = {
        type: 'tab_blur',
        sessionId,
        projectKey,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        sessionStart,
        metadata: { totalActiveMs },
      }
      if (debug) console.log('[Pulsar] tab_blur')
      queue.enqueue(blurEvent)

      sendSessionEnd('visibility_hidden')
    } else {
      lastFocusTime = Date.now()
      ended = false // allow re-tracking if user comes back

      const focusEvent: PulsarEvent = {
        type: 'tab_focus',
        sessionId,
        projectKey,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        sessionStart,
        metadata: {},
      }
      if (debug) console.log('[Pulsar] tab_focus')
      queue.enqueue(focusEvent)
    }
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('beforeunload', () => sendSessionEnd('beforeunload'))
}