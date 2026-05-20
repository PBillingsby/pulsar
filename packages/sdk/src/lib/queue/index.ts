import type { PulsarEvent } from '@/types/index'
import { sendEvents } from '@/lib/queue/sender'

const FLUSH_INTERVAL_MS = 5000
const MAX_QUEUE_SIZE = 20

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

    const batch = [...this.queue]
    this.queue = []
    this.queue = await this.sender(batch)
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