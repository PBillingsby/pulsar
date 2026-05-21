import type { PulsarEvent } from '@/types/index'
import { EventQueue } from '@/lib/queue/index'
import { isIgnored } from '@/lib/session/index'

const NOISE_TAGS: Set<string> = new Set(['html', 'body', 'div', 'span', 'section', 'main', 'article', 'aside', 'header', 'footer', 'nav'])

function getElementLabel(el: Element): string | null {
  const label: string | null =
    el.getAttribute('aria-label') ||
    el.getAttribute('data-pulsar') ||
    el.getAttribute('id') ||
    (el.tagName.toLowerCase() === 'a' ? el.getAttribute('href') : null) ||
    (el.tagName.toLowerCase() === 'button' ? el.textContent?.trim().slice(0, 40) : null)

  return label && label.trim().length > 0 ? label.trim() : null
}

function getClickPath(el: Element): string {
  const parts: string[] = []
  let current: Element | null = el

  while (current && parts.length < 3) {
    const label = getElementLabel(current)
    if (label) parts.unshift(label)
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
    if (isIgnored()) return

    const target = e.target as Element
    if (!target) return

    const tag = target.tagName.toLowerCase()
    const label = getElementLabel(target)

    // drop clicks on unlabeled noise elements
    if (NOISE_TAGS.has(tag) && !label) {
      if (debug) console.log('[Pulsar] click ignored — unlabeled noise element', tag)
      return
    }

    const event: PulsarEvent = {
      type: 'click',
      sessionId,
      projectKey,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      sessionStart: undefined,
      metadata: {
        label: label ?? tag,
        path: getClickPath(target),
        tagName: tag,
      },
    }

    if (debug) {
      console.log('[Pulsar] click', event.metadata)
    }

    queue.enqueue(event)
  })
}