import { describe, it, expect, beforeEach } from 'bun:test'
import { Window } from 'happy-dom'
import type { PulsarEvent } from '@/types/index'
import { EventQueue } from '@/lib/queue'
import { listenForRouteChanges } from '@/lib/events/routes'

describe('listenForRouteChanges', () => {
  let happyWindow: Window
  let captured: PulsarEvent[]
  let queue: EventQueue

  beforeEach(() => {
    happyWindow = new Window({ url: 'https://example.com' })

    Object.defineProperty(globalThis, 'window', {
      value: happyWindow,
      writable: true,
      configurable: true,
    })

    Object.defineProperty(globalThis, 'history', {
      value: happyWindow.history,
      writable: true,
      configurable: true,
    })

    Object.defineProperty(globalThis, 'location', {
      value: happyWindow.location,
      writable: true,
      configurable: true,
    })

    captured = []

    const mockSender = async (events: PulsarEvent[]): Promise<PulsarEvent[]> => {
      captured.push(...events)
      return []
    }

    queue = new EventQueue('https://api.pulsar.dev/events', false, mockSender)
    listenForRouteChanges('test-session', 'test-key', queue, false)
  })

  it('tracks pushState navigation', async () => {
    history.pushState({}, '', '/new-page')
    await queue.flush()

    expect(captured.length).toBe(1)
    expect(captured[0].type).toBe('page_view')
    expect(captured[0].metadata?.navigation).toBe('spa')
  })

  it('tracks replaceState navigation', async () => {
    history.replaceState({}, '', '/replaced-page')
    await queue.flush()

    expect(captured.length).toBe(1)
    expect(captured[0].type).toBe('page_view')
  })

  it('does not track when url has not changed', async () => {
    history.pushState({}, '', '/same-page')
    history.pushState({}, '', '/same-page')
    await queue.flush()

    expect(captured.length).toBe(1)
  })

  it('captures the new url after navigation', async () => {
    history.pushState({}, '', '/about')
    await queue.flush()

    expect(captured[0].url).toContain('/about')
  })
})