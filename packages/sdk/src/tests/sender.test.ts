import { EventQueue } from '@/lib/queue'
import { sendEvents } from '@/lib/queue/sender'
import type { PulsarEvent } from '@/types/index'
import { afterEach, describe, expect, it, mock } from 'bun:test'

const event: PulsarEvent = {
  type: 'page_view',
  sessionId: 'test-session',
  projectKey: 'test-key',
  url: 'https://example.com',
  timestamp: new Date().toISOString(),
}

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })

function respondWith(status: number): void {
  globalThis.fetch = mock(async () => new Response(null, { status })) as unknown as typeof fetch
}

describe('sendEvents', () => {
  it('returns nothing to retry on success', async () => {
    respondWith(200)
    expect(await sendEvents('https://api.test/events', [event], false)).toEqual([])
  })

  it('retries on rate limiting and server errors', async () => {
    respondWith(429)
    expect(await sendEvents('https://api.test/events', [event], false)).toEqual([event])
    respondWith(503)
    expect(await sendEvents('https://api.test/events', [event], false)).toEqual([event])
  })

  it('drops events the server rejected, so bad data is not retried forever', async () => {
    respondWith(403)
    expect(await sendEvents('https://api.test/events', [event], false)).toEqual([])
  })

  it('retries on network failure', async () => {
    globalThis.fetch = mock(async () => { throw new TypeError('network down') }) as unknown as typeof fetch
    expect(await sendEvents('https://api.test/events', [event], false)).toEqual([event])
  })
})

describe('EventQueue flush', () => {
  it('keeps events enqueued while a failed send is in flight', async () => {
    let queue!: EventQueue
    const lateEvent: PulsarEvent = { ...event, sessionId: 'late' }

    const failingSender = async (batch: PulsarEvent[]): Promise<PulsarEvent[]> => {
      queue.enqueue(lateEvent) // arrives mid-request
      return batch
    }

    queue = new EventQueue('https://api.test/events', false, failingSender)
    queue.enqueue(event)
    await queue.flush()

    expect(queue.size()).toBe(2)
  })
})