import type { PulsarEvent } from '@/types/index'

/**
 * Sends a batch and returns the events to retry.
 * - 2xx: delivered
 * - 429 / 5xx / network error: temporary, retry the batch
 * - other 4xx: the server rejected the data (bad payload, unknown key, wrong origin);
 *   retrying would fail forever, so drop it
 */
export async function sendEvents(endpoint: string, events: PulsarEvent[], debug: boolean): Promise<PulsarEvent[]> {
  try {
    const res: Response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true,
    })

    if (res.ok) {
      if (debug) console.log(`[Pulsar] flushed ${events.length} events`)
      return []
    }

    if (res.status === 429 || res.status >= 500) {
      if (debug) console.warn(`[Pulsar] flush failed (${res.status}), re-queuing`)
      return events
    }

    if (debug) console.warn(`[Pulsar] flush rejected (${res.status}), dropping ${events.length} events`)
    return []
  } catch (err) {
    if (debug) console.warn('[Pulsar] flush failed, re-queuing', err)
    return events
  }
}