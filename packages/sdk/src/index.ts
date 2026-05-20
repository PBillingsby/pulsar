import type { PulsarConfig } from '@/types/index'
import { Tracker } from '@/tracker'

let tracker: Tracker | null = null

export const Pulsar = {
  init(config: PulsarConfig): void {
    tracker = new Tracker(config)
    tracker.listen()
  }
}