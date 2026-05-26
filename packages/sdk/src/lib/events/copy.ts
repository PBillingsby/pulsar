import type { PulsarEvent } from '@/types/index'
import { EventQueue } from '@/lib/queue/index'

export function listenForCopy(
  sessionId: string,
  projectKey: string,
  queue: EventQueue,
  debug: boolean
): void {
  document.addEventListener('copy', () => {
    const selection: string = window.getSelection()?.toString().slice(0, 100) ?? ''

    const event: PulsarEvent = {
      type: 'copy',
      sessionId,
      projectKey,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      sessionStart: undefined,
      metadata: {
        selectionLength: selection.length,
      },
    }

    if (debug) console.log('[Pulsar] copy event')
    queue.enqueue(event)
  })
}