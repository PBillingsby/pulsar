import { EventQueue } from '@/lib/queue'
import type { PulsarEvent } from '@/types/index'
import { describe, expect, it } from 'bun:test'

const mockEvent: PulsarEvent = {
  type: 'page_view',
  sessionId: 'test-session',
  projectKey: 'test-key',
  url: 'https://example.com',
  timestamp: new Date().toISOString(),
}

describe('EventQueue', () => {
  it('enqueues events', () => {
    const queue = new EventQueue('https://pulsar-api-production-0bc2.up.railway.app/events', false)
    queue.enqueue(mockEvent)
    expect(queue.size()).toBe(1)
  })

  it('flushes queue when max size is reached', async () => {
    const sent: PulsarEvent[][] = []

    const mockSender = async (events: PulsarEvent[]): Promise<PulsarEvent[]> => {
      sent.push(events)
      return []
    }

    const queue = new EventQueue('https://pulsar-api-production-0bc2.up.railway.app/events', false, mockSender)

    for (let i = 0; i < 20; i++) {
      queue.enqueue(mockEvent)
    }

    expect(queue.size()).toBe(0)
    expect(sent.length).toBe(1)
    expect(sent[0].length).toBe(20)
  })

  it('clears queue after flush', async () => {
    const mockSender = async (_events: PulsarEvent[]): Promise<PulsarEvent[]> => {
      return []
    }

    const queue = new EventQueue('https://pulsar-api-production-0bc2.up.railway.app/events', false, mockSender)
    queue.enqueue(mockEvent)
    await queue.flush()
    expect(queue.size()).toBe(0)
  })

  it('requeues events on sender failure', async () => {
    const mockSender = async (events: PulsarEvent[]): Promise<PulsarEvent[]> => {
      return events
    }

    const queue = new EventQueue('https://pulsar-api-production-0bc2.up.railway.app/events', false, mockSender)
    queue.enqueue(mockEvent)
    await queue.flush()
    expect(queue.size()).toBe(1)
  })
})