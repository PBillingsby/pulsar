import type { PulsarEvent } from '@/types/index'
import { EventQueue } from '@/lib/queue/index'

const MILESTONES: number[] = [25, 50, 75, 100]

export function listenForScrollDepth(
  sessionId: string,
  projectKey: string,
  queue: EventQueue,
  debug: boolean
): () => void {
  const reached: Set<number> = new Set<number>()

  function getScrollPercent(): number {
    const el: HTMLElement = document.documentElement
    const scrollTop: number = el.scrollTop || document.body.scrollTop
    const scrollHeight: number = el.scrollHeight - el.clientHeight
    if (scrollHeight <= 0) return 100
    return Math.round((scrollTop / scrollHeight) * 100)
  }

  function onScroll(): void {
    const percent: number = getScrollPercent()

    for (const milestone of MILESTONES) {
      if (percent >= milestone && !reached.has(milestone)) {
        reached.add(milestone)

        const event: PulsarEvent = {
          type: 'scroll_depth',
          sessionId,
          projectKey,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          sessionStart: undefined,
          metadata: { depth: milestone },
        }

        if (debug) console.log(`[Pulsar] scroll_depth ${milestone}%`)
        queue.enqueue(event)
      }
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true })

  return (): void => reached.clear()
}