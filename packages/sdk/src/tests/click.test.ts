import { describe, it, expect, beforeEach } from 'bun:test'
import { Window } from 'happy-dom'
import type { PulsarEvent } from '@/types/index'
import { EventQueue } from '@/lib/queue'
import { listenForClicks } from '@/lib/events/clicks'

describe('listenForClicks', () => {
  let window: Window
  let captured: PulsarEvent[]
  let queue: EventQueue

  beforeEach(() => {
    window = new Window({ url: 'https://example.com' })
    globalThis.document = window.document as unknown as Document
    globalThis.window = window as unknown as Window & typeof globalThis

    captured = []

    const mockSender = async (events: PulsarEvent[]): Promise<PulsarEvent[]> => {
      captured.push(...events)
      return []
    }

    queue = new EventQueue('https://api.pulsar.dev/events', false, mockSender)

    listenForClicks('test-session', 'test-key', queue, false)
  })

  it('captures a click event', async () => {
    const button = window.document.createElement('button')
    button.id = 'submit-btn'
    window.document.body.appendChild(button)

    button.click()
    await queue.flush()

    expect(captured.length).toBe(1)
    expect(captured[0].type).toBe('click')
    expect(captured[0].sessionId).toBe('test-session')
    expect(captured[0].projectKey).toBe('test-key')
  })

  it('captures element label from id', async () => {
    const button = window.document.createElement('button')
    button.id = 'my-button'
    window.document.body.appendChild(button)

    button.click()
    await queue.flush()

    expect((captured[0].metadata as Record<string, unknown>)?.label).toBe('my-button')
  })

  it('captures element label from aria-label', async () => {
    const button = window.document.createElement('button')
    button.setAttribute('aria-label', 'Close dialog')
    window.document.body.appendChild(button)

    button.click()
    await queue.flush()

    expect((captured[0].metadata as Record<string, unknown>)?.label).toBe('Close dialog')
  })

  it('falls back to tag name when no label exists', async () => {
    const div = window.document.createElement('div')
    window.document.body.appendChild(div)

    div.click()
    await queue.flush()

    expect((captured[0].metadata as Record<string, unknown>)?.label).toBe('div')
  })
})