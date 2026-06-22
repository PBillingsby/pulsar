import { listenForFormSubmits } from '@/lib/events/form'
import { EventQueue } from '@/lib/queue/index'
import type { PulsarEvent } from '@/types/index'
import { beforeEach, describe, expect, it } from 'bun:test'
import { Event as HappyEvent, Window } from 'happy-dom'

const happyWindow = new Window({ url: 'https://example.com' })
globalThis.localStorage = happyWindow.localStorage as unknown as Storage

describe('listenForFormSubmits', () => {
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

    queue = new EventQueue('https://pulsar-api-production-0bc2.up.railway.app/events', false, mockSender)
    listenForFormSubmits('test-session', 'test-key', queue, false)
  })

  it('captures form submit event', async () => {
    const form = window.document.createElement('form')
    form.id = 'signup-form'
    window.document.body.appendChild(form)

    form.dispatchEvent(new HappyEvent('submit', { bubbles: true }))
    await queue.flush()

    expect(captured.length).toBe(1)
    expect(captured[0].type).toBe('form_submit')
  })

  it('captures form id in metadata', async () => {
    const form = window.document.createElement('form')
    form.id = 'checkout-form'
    window.document.body.appendChild(form)

    form.dispatchEvent(new HappyEvent('submit', { bubbles: true }))
    await queue.flush()

    const meta = captured[0].metadata as Record<string, unknown>
    expect(meta.formId).toBe('checkout-form')
  })

  it('handles form with no id', async () => {
    const form = window.document.createElement('form')
    window.document.body.appendChild(form)

    form.dispatchEvent(new HappyEvent('submit', { bubbles: true }))
    await queue.flush()

    const meta = captured[0].metadata as Record<string, unknown>
    expect(meta.formId).toBeNull()
  })
})