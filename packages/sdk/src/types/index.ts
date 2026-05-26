export interface PulsarConfig {
  projectKey: string
  endpoint?: string
  debug?: boolean
  ignoreMe?: boolean
}

export type PulsarEventType =
  | 'page_view'
  | 'click'
  | 'rage_click'
  | 'scroll_depth'
  | 'session_end'
  | 'form_submit'
  | 'copy'
  | 'tab_focus'
  | 'tab_blur'

export interface PulsarEvent {
  type: PulsarEventType
  sessionId: string
  projectKey: string
  url: string
  referrer?: string
  timestamp: string
  sessionStart?: string
  metadata?: Record<string, unknown>
}