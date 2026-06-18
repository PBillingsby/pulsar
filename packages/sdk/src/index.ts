import { init } from '@/tracker'
import type { PulsarConfig } from '@/types/index'

export const Pulsar = {
  init(config: PulsarConfig): void {
    init(config)
  }
}