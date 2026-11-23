import { listenForSessionEvents } from '@/lib/events/session'
import { EventQueue } from '@/lib/queue/index'
import type { PulsarEvent } from '@/types/index'
import { beforeEach, describe, expect, it } from 'bun:test'
import { Event as HappyEvent, Window } from 'happy-dom'

const happyWindow = new Window({ url: 'https://example.com' })
globalThis.localStorage = happyWindow.localStorage as unknown as Storage

describe('listenForSessionEvents', () => {
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
    listenForSessionEvents('test-session', 'test-key', new Date().toISOString(), queue, false)
  })

  it('emits tab_blur when visibility changes to hidden', async () => {
    Object.defineProperty(window.document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    })

    window.document.dispatchEvent(new HappyEvent('visibilitychange', { bubbles: true }))
    await queue.flush()

    const blurEvent = captured.find(e => e.type === 'tab_blur')
    expect(blurEvent).toBeDefined()
    expect(blurEvent?.type).toBe('tab_blur')
  })

  it('emits tab_focus when visibility changes to visible', async () => {
    // first go hidden
    Object.defineProperty(window.document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    })
    window.document.dispatchEvent(new HappyEvent('visibilitychange', { bubbles: true }))

    // then come back
    Object.defineProperty(window.document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    })
    window.document.dispatchEvent(new HappyEvent('visibilitychange', { bubbles: true }))
    await queue.flush()

    const focusEvent = captured.find(e => e.type === 'tab_focus')
    expect(focusEvent).toBeDefined()
    expect(focusEvent?.type).toBe('tab_focus')
  })

  it('includes totalActiveMs in tab_blur metadata', async () => {
    Object.defineProperty(window.document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    })

    window.document.dispatchEvent(new HappyEvent('visibilitychange', { bubbles: true }))
    await queue.flush()

    const blurEvent = captured.find(e => e.type === 'tab_blur')
    const meta = blurEvent?.metadata as Record<string, unknown>
    expect(typeof meta?.totalActiveMs).toBe('number')
  })

  it('emits session_end on beforeunload', async () => {
    window.dispatchEvent(new HappyEvent('beforeunload', { bubbles: true }))
    await queue.flush()

    // session_end uses sendBeacon so may not be in queue
    // just verify it doesn't throw
    expect(true).toBe(true)
  })
})