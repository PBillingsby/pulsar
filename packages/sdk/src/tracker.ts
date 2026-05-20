import type { PulsarConfig } from '@/types/index'
import { generateSessionId } from '@/lib/session'
import { EventQueue } from '@/lib/queue'
import { listenForClicks } from '@/lib/clicks'
import { listenForRouteChanges } from '@/lib/routes'

const DEFAULT_ENDPOINT = 'https://api.pulsar.dev/events'

export class Tracker {
  private config: PulsarConfig
  private sessionId: string
  private queue: EventQueue

  constructor(config: PulsarConfig) {
    this.config = config
    this.sessionId = generateSessionId()
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