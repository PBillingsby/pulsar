import { listenForCopy } from '@/lib/events/copy'
import { EventQueue } from '@/lib/queue/index'
import type { PulsarEvent } from '@/types/index'
import { beforeEach, describe, expect, it } from 'bun:test'
import { Event as HappyEvent, Window } from 'happy-dom'

const happyWindow = new Window({ url: 'https://example.com' })
globalThis.localStorage = happyWindow.localStorage as unknown as Storage

describe('listenForCopy', () => {
  let window: Window
  let captured: PulsarEvent[]
  let queue: EventQueue

  beforeEach(() => {
    localStorage.clear()
    window = new Window({ url: 'https://example.com' })
    globalThis.document = window.document as unknown as Document
    globalThis.window = window as unknown as typeof globalThis.window

    captured = []
    const mockSender = async (events: PulsarEvent[]): Promise<PulsarEvent[]> => {
      captured.push(...events)
      return []
    }

    queue = new EventQueue('https://pulsar-api-production-0bc2.up.railway.app/events', false, mockSender)
    listenForCopy('test-session', 'test-key', queue, false)
  })

  it('captures copy event', async () => {
    window.document.dispatchEvent(new HappyEvent('copy', { bubbles: true }))
    await queue.flush()

    expect(captured.length).toBe(1)
    expect(captured[0].type).toBe('copy')
  })

  it('captures selection length in metadata', async () => {
    window.document.dispatchEvent(new HappyEvent('copy', { bubbles: true }))
    await queue.flush()

    const meta = captured[0].metadata as Record<string, unknown>
    expect(typeof meta.selectionLength).toBe('number')
  })
})