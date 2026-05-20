import type { PulsarEvent } from '@/types/index'

export async function sendEvents(endpoint: string, events: PulsarEvent[], debug: boolean): Promise<PulsarEvent[]> {
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true,
    })

    if (debug) {
      console.log(`[Pulsar] flushed ${events.length} events`)
    }

    return []
  } catch (err) {
    if (debug) {
      console.warn('[Pulsar] flush failed, re-queuing', err)
    }
    return events
  }
}