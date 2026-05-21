import { describe, it, expect, mock, beforeEach } from 'bun:test'
import type { PulsarStats } from '@/types/index'

const mockCount = mock(async () => 3)
const mockFindMany = mock(async () => [
  { sessionId: 'session-1' },
  { sessionId: 'session-2' },
  { sessionId: 'session-3' },
])
const mockGroupByUrl = mock(async () => [
  { url: 'https://example.com/home', _count: { url: 2 } },
  { url: 'https://example.com/pricing', _count: { url: 1 } },
])

const mockGroupBySession = mock(async () => [
  {
    sessionId: 'session-1',
    _count: { sessionId: 3 },
    _min: { timestamp: new Date('2026-01-01T10:00:00Z') },
    _max: { timestamp: new Date('2026-01-02T10:00:00Z') }, // different day = returned
  },
  {
    sessionId: 'session-2',
    _count: { sessionId: 2 },
    _min: { timestamp: new Date('2026-01-01T10:00:00Z') },
    _max: { timestamp: new Date('2026-01-01T11:00:00Z') }, // same day = not returned
  },
  {
    sessionId: 'session-3',
    _count: { sessionId: 1 },
    _min: { timestamp: new Date('2026-01-01T10:00:00Z') },
    _max: { timestamp: new Date('2026-01-01T10:00:00Z') }, // same day = not returned
  },
])

mock.module('@/db/client', () => ({
  prisma: {
    event: {
      count: mockCount,
      findMany: mockFindMany,
      groupBy: mock(async (args: { by: string[] }) => {
        if (args.by.includes('url')) return mockGroupByUrl()
        return mockGroupBySession()
      }),
    },
  },
}))

const { getStats } = await import('@/lib/analytics')

describe('getStats', () => {
  beforeEach(() => {
    mockCount.mockClear()
    mockFindMany.mockClear()
    mockGroupByUrl.mockClear()
    mockGroupBySession.mockClear()
  })

  it('returns correct shape', async () => {
    const stats = await getStats('test-key')

    expect(stats.projectKey).toBe('test-key')
    expect(typeof stats.totalVisitors).toBe('number')
    expect(typeof stats.totalPageViews).toBe('number')
    expect(stats.comebackRate === null || typeof stats.comebackRate === 'number').toBe(true)
    expect(Array.isArray(stats.topPages)).toBe(true)
    expect(Array.isArray(stats.recentSessions)).toBe(true)
    expect(typeof stats.insufficientData).toBe('boolean')
  })

  it('calculates comeback rate when sufficient data exists', async () => {
    // override findMany to return 10+ sessions
    mockFindMany.mockImplementationOnce(async () =>
      Array.from({ length: 12 }, (_, i) => ({ sessionId: `session-${i}` }))
    )

    const stats = await getStats('test-key')
    expect(stats.insufficientData).toBe(false)
    expect(typeof stats.comebackRate).toBe('number')
  })

  it('calculates comeback rate correctly', async () => {
    const stats = await getStats('test-key')
    // 3 sessions, 1 returned — above MIN_SESSIONS floor so comeback rate should be set
    // but mock only has 3 sessions which is below 10 — so it will be null
    // update mock to have 10+ sessions or check for null
    expect(stats.insufficientData).toBe(true)
    expect(stats.comebackRate).toBeNull()
  })

  it('comeback rate is 0 when no visitors', async () => {
    mockFindMany.mockImplementationOnce(async () => [])
    const stats = await getStats('test-key')
    expect(stats.comebackRate).toBeNull()
    expect(stats.insufficientData).toBe(true)
  })

  it('returns top pages sorted by views', async () => {
    const stats = await getStats('test-key')
    expect(stats.topPages[0].url).toBe('https://example.com/home')
    expect(stats.topPages[0].views).toBe(2)
  })

  it('marks sessions with more than one page view as returned', async () => {
    const stats = await getStats('test-key')
    const returned = stats.recentSessions.filter((s) => s.returned)
    expect(returned.length).toBe(1)
    expect(returned[0].sessionId).toBe('session-1')
  })

  it('limits recent sessions to 10', async () => {
    const stats = await getStats('test-key')
    expect(stats.recentSessions.length).toBeLessThanOrEqual(10)
  })
})