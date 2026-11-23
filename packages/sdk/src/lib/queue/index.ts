import { sendEvents } from '@/lib/queue/sender'
import type { PulsarEvent } from '@/types/index'

const FLUSH_INTERVAL_MS: number = 5000
const MAX_QUEUE_SIZE: number = 20
const MAX_BUFFERED_EVENTS: number = 500

type SenderFn = (events: PulsarEvent[]) => Promise<PulsarEvent[]>

export class EventQueue {
  private queue: PulsarEvent[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private endpoint: string
  private debug: boolean
  private sender: SenderFn

  constructor(endpoint: string, debug: boolean, sender?: SenderFn) {
    this.endpoint = endpoint
    this.debug = debug
    this.sender = sender ?? ((events) => sendEvents(endpoint, events, debug))
  }

  size(): number {
    return this.queue.length
  }

  enqueue(event: PulsarEvent): void {
    this.queue.push(event)

    if (this.debug) {
      console.log('[Pulsar] queued', event)
    }

    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return

    const batch: PulsarEvent[] = [...this.queue]
    this.queue = []
    const failed: PulsarEvent[] = await this.sender(batch)

    // Events can be enqueued while the request is in flight. Put failed events back
    // in front of them instead of overwriting the queue, and drop the oldest past the cap.
    this.queue = [...failed, ...this.queue].slice(-MAX_BUFFERED_EVENTS)
  }

  start(): void {
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS)
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }
}