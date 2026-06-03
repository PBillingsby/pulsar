export interface IncomingEvent {
  type: 'page_view' | 'click' | 'rage_click' | 'scroll_depth' | 'session_end' | 'form_submit' | 'copy' | 'tab_focus' | 'tab_blur'
  sessionId: string
  projectKey: string
  url: string
  referrer?: string
  timestamp: string
  sessionStart?: string
  metadata?: Record<string, unknown>
}

export interface IngestPayload {
  events: IncomingEvent[]
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface TopPage {
  url: string
  views: number
}

export interface RecentSession {
  sessionId: string
  pageViews: number
  firstSeen: Date
  lastSeen: Date
  returned: boolean
}

export interface PulsarStats {
  projectKey: string
  totalVisitors: number
  totalPageViews: number
  comebackRate: number | null
  insufficientData: boolean
  topPages: TopPage[]
  recentSessions: RecentSession[]
}

export interface FilterResult {
  passed: IncomingEvent[]
  dropped: number
  reasons: string[]
}

export interface DigestData {
  email: string
  projectKey: string
  date: string
  summary: string
  comebackRate: number | null
  comebackTrend: string | null
  totalVisitors: number
  topPage: string
  keyPage: string
  isActivationPage: boolean
  returning: number
  insight: string
  snapshots: WeeklySnapshot[]
}

export interface RegisterProjectInput {
  name: string
  email: string
  domain?: string
  language?: string
  digestDay?: number
  digestHour?: number
}

export interface ProjectResponse {
  projectKey: string
  name: string
  email: string
  domain: string | null
  beta: boolean
  language: string
  digestDay: number
  digestHour: number
  createdAt: Date
}

export interface FilterResult {
  passed: IncomingEvent[]
  dropped: number
  reasons: string[]
}

export interface WeeklySnapshot {
  id: string
  projectKey: string
  weekStart: Date
  totalVisitors: number
  returning: number
  comebackRate: number | null
  topPage: string | null
  totalEvents: number
  activationPage: string | null
  avgDepthReturners: number | null
  avgDepthBouncers: number | null
  returnerTopPage: string | null
  bouncerTopPage: string | null
  returnerFirstPage: string | null
  activationReachRate: number | null
  activationPageViews: number | null
  createdAt: Date
}

export interface BehavioralPatterns {
  returnerTopPage: string | null
  bouncerTopPage: string | null
  activationPage: string | null
  avgDepthReturners: number
  avgDepthBouncers: number
  returnerFirstPages: { url: string; count: number }[]
  avgSessionDurationReturners: number | null
  avgSessionDurationBouncers: number | null
  rageClickPages: { url: string; count: number }[]
  formSubmissionRate: number | null
  highIntentPages: { url: string; count: number }[]
  activationPageScrollDepth: number | null
}

export interface DigestContext {
  current: PulsarStats
  snapshots: WeeklySnapshot[]
  patterns: BehavioralPatterns
  language: string
}