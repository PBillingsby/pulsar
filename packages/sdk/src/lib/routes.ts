import type { PulsarEvent } from '@/types/index'
import { EventQueue } from '@/lib/queue'

export function listenForRouteChanges(
  sessionId: string,
  projectKey: string,
  queue: EventQueue,
  debug: boolean
): void {
  let currentUrl = window.location.href

  const track = () => {
    const newUrl = window.location.href
    if (newUrl === currentUrl) return
    currentUrl = newUrl

    const event: PulsarEvent = {
      type: 'page_view',
      sessionId,
      projectKey,
      url: newUrl,
      timestamp: new Date().toISOString(),
      metadata: {
        navigation: 'spa',
      },
    }

    if (debug) {
      console.log('[Pulsar] route change', newUrl)
    }

    queue.enqueue(event)
  }

  // history API navigation
  const originalPushState = history.pushState.bind(history)
  const originalReplaceState = history.replaceState.bind(history)

  history.pushState = (...args) => {
    originalPushState(...args)
    track()
  }

  history.replaceState = (...args) => {
    originalReplaceState(...args)
    track()
  }

  // browser back/forward
  window.addEventListener('popstate', track)
}