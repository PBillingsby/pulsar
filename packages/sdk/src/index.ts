import { init } from '@/tracker'
import type { PulsarConfig } from '@/types/index'

export const Pulsar = {
  init(config: PulsarConfig): void {
    init(config)
  }
}

// React/Next.js provider
export function PulsarProvider(config: PulsarConfig): null {
  if (typeof window !== 'undefined') {
    init(config)
  }
  return null
}