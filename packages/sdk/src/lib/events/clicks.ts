import type { PulsarEvent } from '@/types/index'
import { EventQueue } from '@/lib/queue'

function getElementLabel(el: Element): string {
  return (
    el.getAttribute('aria-label') ||
    el.getAttribute('data-pulsar') ||
    el.getAttribute('id') ||
    el.tagName.toLowerCase()
  )
}

function getClickPath(el: Element): string {
  const parts: string[] = []
  let current: Element | null = el

  while (current && parts.length < 3) {
    parts.unshift(getElementLabel(current))
    current = current.parentElement
  }

  return parts.join(' > ')
}

export function listenForClicks(
  sessionId: string,
  projectKey: string,
  queue: EventQueue,
  debug: boolean
): void {
  document.addEventListener('click', (e) => {
    const target = e.target as Element
    if (!target) return

    const event: PulsarEvent = {
      type: 'click',
      sessionId,
      projectKey,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      metadata: {
        label: getElementLabel(target),
        path: getClickPath(target),
        tagName: target.tagName.toLowerCase(),
      },
    }

    if (debug) {
      console.log('[Pulsar] click', event.metadata)
    }

    queue.enqueue(event)
  })
}