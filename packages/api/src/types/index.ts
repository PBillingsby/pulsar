export interface IncomingEvent {
  type: 'page_view' | 'click' | 'session_end'
  sessionId: string
  projectKey: string
  url: string
  referrer?: string
  timestamp: string
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
  comebackRate: number
  topPages: TopPage[]
  recentSessions: RecentSession[]
}

export interface FilterResult {
  passed: IncomingEvent[]
  dropped: number
  reasons: string[]
}

export interface DigestData {
  projectKey: string
  date: string
  summary: string
  comebackRate: number
  totalVisitors: number
  topPage: string
  returning: number
  insight: string
}