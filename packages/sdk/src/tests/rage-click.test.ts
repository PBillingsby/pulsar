import { describe, it, expect, beforeEach } from 'bun:test'
import { Window } from 'happy-dom'
import type { PulsarEvent } from '@/types/index'
import { EventQueue } from '@/lib/queue/index'
import { listenForRageClicks } from '@/lib/events/rage-click'

const happyWindow = new Window({ url: 'https://example.com' })
globalThis.localStorage = happyWindow.localStorage as unknown as Storage

describe('listenForRageClicks', () => {
  let window: Window
  let captured: PulsarEvent[]
  let queue: EventQueue

  beforeEach(() => {
    localStorage.clear()
    window = new Window({ url: 'https://example.com' })
    globalThis.document = window.document as unknown as Document
    globalThis.window = window as unknown as Window & typeof globalThis

    captured = []
    const mockSender = async (events: PulsarEvent[]): Promise<PulsarEvent[]> => {
      captured.push(...events)
      return []
    }

    queue = new EventQueue('https://api.pulsar.dev/events', false, mockSender)
    listenForRageClicks('test-session', 'test-key', queue, false)
  })

  it('emits rage_click after 3 rapid clicks on same element', async () => {
    const button = window.document.createElement('button')
    button.id = 'submit-btn'
    window.document.body.appendChild(button)

    button.click()
    button.click()
    button.click()
    await queue.flush()

    expect(captured.length).toBe(1)
    expect(captured[0].type).toBe('rage_click')
  })

  it('does not emit rage_click for clicks on different elements', async () => {
    const btn1 = window.document.createElement('button')
    btn1.id = 'btn-1'
    const btn2 = window.document.createElement('button')
    btn2.id = 'btn-2'
    window.document.body.appendChild(btn1)
    window.document.body.appendChild(btn2)

    btn1.click()
    btn2.click()
    btn1.click()
    await queue.flush()

    expect(captured.filter(e => e.type === 'rage_click').length).toBe(0)
  })

  it('includes element info in metadata', async () => {
    const button = window.document.createElement('button')
    button.id = 'angry-btn'
    window.document.body.appendChild(button)

    button.click()
    button.click()
    button.click()
    await queue.flush()

    const meta = captured[0].metadata as Record<string, unknown>
    expect(meta.tagName).toBe('button')
    expect(meta.id).toBe('angry-btn')
  })
})