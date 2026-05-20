export interface PulsarConfig {
  projectKey: string
  debug?: boolean
  endpoint?: string
}

export interface PulsarEvent {
  type: 'page_view' | 'click' | 'session_end'
  sessionId: string
  projectKey: string
  url: string
  referrer?: string
  timestamp: string
  metadata?: Record<string, unknown>
}