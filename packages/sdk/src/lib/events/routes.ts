import type { PulsarEvent } from '@/types/index'
import { EventQueue } from '@/lib/queue/index'

export function listenForRouteChanges(
  sessionId: string,
  projectKey: string,
  queue: EventQueue,
  debug: boolean,
  onNavigate?: () => void
): void {
  let currentUrl: string = window.location.href

  const track = (): void => {
    const newUrl: string = window.location.href
    if (newUrl === currentUrl) return
    currentUrl = newUrl

    onNavigate?.()

    const event: PulsarEvent = {
      type: 'page_view',
      sessionId,
      projectKey,
      url: newUrl,
      timestamp: new Date().toISOString(),
      sessionStart: undefined,
      metadata: { navigation: 'spa' },
    }

    if (debug) console.log('[Pulsar] route change', newUrl)
    queue.enqueue(event)
  }

  const originalPushState = history.pushState.bind(history)
  const originalReplaceState = history.replaceState.bind(history)

  history.pushState = (...args) => { originalPushState(...args); track() }
  history.replaceState = (...args) => { originalReplaceState(...args); track() }

  window.addEventListener('popstate', track)
}