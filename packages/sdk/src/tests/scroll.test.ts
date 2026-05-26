import { describe, it, expect, beforeEach } from 'bun:test'
import { Window, Event as HappyEvent } from 'happy-dom'
import type { PulsarEvent } from '@/types/index'
import { EventQueue } from '@/lib/queue/index'
import { listenForScrollDepth } from '@/lib/events/scroll'

const happyWindow = new Window({ url: 'https://example.com' })
globalThis.localStorage = happyWindow.localStorage as unknown as Storage

describe('listenForScrollDepth', () => {
  let window: Window
  let captured: PulsarEvent[]
  let queue: EventQueue
  let reset: () => void

  beforeEach(() => {
    localStorage.clear()
    window = new Window({ url: 'https://example.com' })
    globalThis.document = window.document as unknown as Document
    globalThis.window = window as unknown as Window & typeof globalThis

    // set up scrollable page
    Object.defineProperty(window.document.documentElement, 'scrollHeight', { value: 2000, configurable: true })
    Object.defineProperty(window.document.documentElement, 'clientHeight', { value: 500, configurable: true })

    captured = []
    const mockSender = async (events: PulsarEvent[]): Promise<PulsarEvent[]> => {
      captured.push(...events)
      return []
    }

    queue = new EventQueue('https://api.pulsar.dev/events', false, mockSender)
    reset = listenForScrollDepth('test-session', 'test-key', queue, false)
  })

  it('emits scroll_depth event at 25% milestone', async () => {
    Object.defineProperty(window.document.documentElement, 'scrollTop', { value: 375, configurable: true })
    window.dispatchEvent(new HappyEvent('scroll'))
    await queue.flush()

    expect(captured.length).toBe(1)
    expect(captured[0].type).toBe('scroll_depth')
    expect((captured[0].metadata as Record<string, unknown>)?.depth).toBe(25)
  })

  it('does not emit the same milestone twice', async () => {
    Object.defineProperty(window.document.documentElement, 'scrollTop', { value: 375, configurable: true })
    window.dispatchEvent(new HappyEvent('scroll'))
    window.dispatchEvent(new HappyEvent('scroll'))
    await queue.flush()

    const depthEvents = captured.filter(e => (e.metadata as Record<string, unknown>)?.depth === 25)
    expect(depthEvents.length).toBe(1)
  })

  it('resets milestones when reset is called', async () => {
    Object.defineProperty(window.document.documentElement, 'scrollTop', { value: 375, configurable: true })
    window.dispatchEvent(new HappyEvent('scroll'))
    await queue.flush()

    reset()
    captured = []

    window.dispatchEvent(new HappyEvent('scroll'))
    await queue.flush()

    expect(captured.length).toBe(1)
    expect((captured[0].metadata as Record<string, unknown>)?.depth).toBe(25)
  })

  it('emits multiple milestones as user scrolls', async () => {
    Object.defineProperty(window.document.documentElement, 'scrollTop', { value: 1125, configurable: true })
    window.dispatchEvent(new HappyEvent('scroll'))
    await queue.flush()

    expect(captured.length).toBe(3) // 25, 50, 75
  })
})