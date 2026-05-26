import type { PulsarEvent } from '@/types/index'
import { EventQueue } from '@/lib/queue/index'

const RAGE_THRESHOLD: number = 3
const RAGE_WINDOW_MS: number = 500

export function listenForRageClicks(
  sessionId: string,
  projectKey: string,
  queue: EventQueue,
  debug: boolean
): void {
  const clickTimes: Map<string, number[]> = new Map<string, number[]>()

  document.addEventListener('click', (e: MouseEvent) => {
    const target: Element | null = e.target as Element | null
    if (!target) return

    const key: string = target.tagName + (target.id ? `#${target.id}` : '') +
      (target.className && typeof target.className === 'string'
        ? `.${target.className.split(' ')[0]}`
        : '')

    const now: number = Date.now()
    const times: number[] = clickTimes.get(key) ?? []
    const recentTimes: number[] = times.filter((t: number) => now - t < RAGE_WINDOW_MS)
    recentTimes.push(now)
    clickTimes.set(key, recentTimes)

    if (recentTimes.length >= RAGE_THRESHOLD) {
      clickTimes.delete(key) // reset after detecting

      const event: PulsarEvent = {
        type: 'rage_click',
        sessionId,
        projectKey,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        sessionStart: undefined,
        metadata: {
          element: key,
          clicks: recentTimes.length,
          tagName: target.tagName.toLowerCase(),
          id: target.id || null,
        },
      }

      if (debug) console.log('[Pulsar] rage_click detected on', key)
      queue.enqueue(event)
    }
  })
}