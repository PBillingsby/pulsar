import {
  listenForClicks,
  listenForCopy,
  listenForDeadClicks,
  listenForFormSubmits,
  listenForRageClicks,
  listenForRouteChanges,
  listenForScrollDepth,
  listenForSessionEvents,
} from '@/lib/events/index'
import { EventQueue } from '@/lib/queue/index'
import { sendEvents } from '@/lib/queue/sender'
import { getDeviceInfo } from '@/lib/session/device'
import { getOrCreateSessionId, isIgnored } from '@/lib/session/index'
import type { PulsarConfig, PulsarEvent } from '@/types/index'

export function init(config: PulsarConfig): void {
  const {
    projectKey,
    endpoint = 'https://pulsar-api-production-0bc2.up.railway.app/events',
    debug = false,
    ignoreMe = false,
  } = config

  if (ignoreMe) {
    localStorage.setItem('pulsar_ignore', 'true')
    if (debug) console.log('[Pulsar] ignoreMe set — this device will be ignored')
    return
  }

  if (isIgnored()) {
    if (debug) console.log('[Pulsar] ignoreMe is active — tracking disabled')
    return
  }

  ; (window as Window & { __pulsarEndpoint?: string }).__pulsarEndpoint = endpoint

  const sessionId: string = getOrCreateSessionId()
  const sessionStart: string = new Date().toISOString()

  const queue: EventQueue = new EventQueue(
    endpoint,
    debug,
    (events: PulsarEvent[]) => sendEvents(endpoint, events, debug)
  )

  const initialPageView: PulsarEvent = {
    type: 'page_view',
    sessionId,
    projectKey,
    url: window.location.href,
    referrer: document.referrer || undefined,
    timestamp: new Date().toISOString(),
    sessionStart,
    metadata: {
      ...getDeviceInfo(),
    },
  }
  queue.enqueue(initialPageView)

  const resetScroll: () => void = listenForScrollDepth(sessionId, projectKey, queue, debug)

  listenForRouteChanges(sessionId, projectKey, queue, debug, resetScroll)
  listenForClicks(sessionId, projectKey, queue, debug)
  listenForDeadClicks(sessionId, projectKey, queue, debug)
  listenForSessionEvents(sessionId, projectKey, sessionStart, queue, debug)
  listenForRageClicks(sessionId, projectKey, queue, debug)
  listenForFormSubmits(sessionId, projectKey, queue, debug)
  listenForCopy(sessionId, projectKey, queue, debug)

  if (debug) console.log('[Pulsar] initialised', { projectKey, sessionId })
}