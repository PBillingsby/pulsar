import type { PulsarEvent } from '@/types/index'
import { EventQueue } from '@/lib/queue/index'
import { isIgnored } from '@/lib/session/index'

// Elements that are inherently interactive — never dead clicks
const INTERACTIVE_TAGS: Set<string> = new Set([
  'a', 'button', 'input', 'select', 'textarea', 'label',
  'summary', 'details', 'video', 'audio',
])

// Elements that are inherently non-interactive — always candidates
const INERT_TAGS: Set<string> = new Set([
  'div', 'span', 'section', 'main', 'article', 'aside',
  'header', 'footer', 'nav', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'img', 'figure', 'figcaption',
])

const DEAD_CLICK_WAIT_MS: number = 500

function hasInteractiveAncestor(el: Element): boolean {
  let current: Element | null = el
  while (current) {
    const tag: string = current.tagName.toLowerCase()
    if (INTERACTIVE_TAGS.has(tag)) return true
    if (
      current.getAttribute('role') === 'button' ||
      current.getAttribute('tabindex') !== null ||
      current.getAttribute('onclick') !== null ||
      current.getAttribute('data-onclick') !== null
    ) return true
    current = current.parentElement
  }
  return false
}

function getElementLabel(el: Element): string | null {
  const label: string | null =
    el.getAttribute('aria-label') ||
    el.getAttribute('data-pulsar') ||
    el.getAttribute('id') ||
    el.textContent?.trim().slice(0, 40) ||
    null
  return label && label.trim().length > 0 ? label.trim() : null
}

export function listenForDeadClicks(
  sessionId: string,
  projectKey: string,
  queue: EventQueue,
  debug: boolean
): void {
  document.addEventListener('click', (e: MouseEvent) => {
    if (isIgnored()) return

    const target = e.target as Element
    if (!target) return

    const tag: string = target.tagName.toLowerCase()

    // skip inherently interactive elements
    if (INTERACTIVE_TAGS.has(tag)) return

    // skip elements that have interactive ancestors
    if (hasInteractiveAncestor(target)) return

    // only track inert elements — reduce false positives from custom components
    if (!INERT_TAGS.has(tag)) return

    const urlBefore: string = window.location.href

    // wait and see if anything happened as a result of the click
    setTimeout(() => {
      if (isIgnored()) return

      const urlChanged: boolean = window.location.href !== urlBefore

      // if URL changed, it wasn't dead — something handled it
      if (urlChanged) return

      const label: string | null = getElementLabel(target)

      const event: PulsarEvent = {
        type: 'dead_click',
        sessionId,
        projectKey,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        sessionStart: undefined,
        metadata: {
          label: label ?? tag,
          tagName: tag,
          x: e.clientX,
          y: e.clientY,
        },
      }

      if (debug) {
        console.log('[Pulsar] dead_click', event.metadata)
      }

      queue.enqueue(event)
    }, DEAD_CLICK_WAIT_MS)
  })
}