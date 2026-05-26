import type { PulsarEvent } from '@/types/index'
import { EventQueue } from '@/lib/queue/index'

export function listenForFormSubmits(
  sessionId: string,
  projectKey: string,
  queue: EventQueue,
  debug: boolean
): void {
  document.addEventListener('submit', (e: SubmitEvent) => {
    const form: HTMLFormElement | null = e.target as HTMLFormElement | null
    if (!form) return

    const event: PulsarEvent = {
      type: 'form_submit',
      sessionId,
      projectKey,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      sessionStart: undefined,
      metadata: {
        formId: form.id || null,
        formName: form.getAttribute('name') || null,
        formAction: form.action || null,
      },
    }

    if (debug) console.log('[Pulsar] form_submit', event.metadata)
    queue.enqueue(event)
  })
}