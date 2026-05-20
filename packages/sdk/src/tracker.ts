import type { PulsarConfig } from '@/types/index'
import { getOrCreateSessionId } from '@/lib/session/index'
import { EventQueue } from '@/lib/queue/index'
import { listenForClicks } from '@/lib/events/clicks'
import { listenForRouteChanges } from '@/lib/events/routes'

const DEFAULT_ENDPOINT = 'https://api.pulsar.dev/events'

export class Tracker {
  private config: PulsarConfig
  private sessionId: string
  private queue: EventQueue

  constructor(config: PulsarConfig) {
    this.config = config
    this.sessionId = getOrCreateSessionId()
    this.queue = new EventQueue(
      config.endpoint ?? DEFAULT_ENDPOINT,
      config.debug ?? false
    )
  }

  private trackPageView(): void {
    this.queue.enqueue({
      type: 'page_view',
      sessionId: this.sessionId,
      projectKey: this.config.projectKey,
      url: window.location.href,
      referrer: document.referrer || undefined,
      timestamp: new Date().toISOString(),
    })
  }

  listen(): void {
    this.trackPageView()
    this.queue.start()
    listenForClicks(
      this.sessionId,
      this.config.projectKey,
      this.queue,
      this.config.debug ?? false
    )
    listenForRouteChanges(
      this.sessionId,
      this.config.projectKey,
      this.queue,
      this.config.debug ?? false
    )
    window.addEventListener('beforeunload', () => this.queue.flush())
  }
}