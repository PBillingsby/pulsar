import { describe, it, expect } from 'bun:test'
import { filterEvents } from '@/lib/filter/index'
import type { IncomingEvent } from '@/types/index'

const validEvent: IncomingEvent = {
  type: 'page_view',
  sessionId: 'test-session',
  projectKey: 'test-key',
  url: 'https://example.com/dashboard',
  timestamp: new Date().toISOString(),
}

describe('filterEvents', () => {
  it('passes a valid event', () => {
    const { passed, dropped } = filterEvents([validEvent])
    expect(passed.length).toBe(1)
    expect(dropped).toBe(0)
  })

  it('drops localhost urls', () => {
    const { passed, dropped } = filterEvents([{
      ...validEvent,
      url: 'http://localhost:3000/dashboard',
    }])
    expect(passed.length).toBe(0)
    expect(dropped).toBe(1)
  })

  it('drops 127.0.0.1 urls', () => {
    const { passed, dropped } = filterEvents([{
      ...validEvent,
      url: 'http://127.0.0.1:3000',
    }])
    expect(passed.length).toBe(0)
    expect(dropped).toBe(1)
  })

  it('drops malformed urls', () => {
    const { passed, dropped } = filterEvents([{
      ...validEvent,
      url: 'not-a-url',
    }])
    expect(passed.length).toBe(0)
    expect(dropped).toBe(1)
  })

  it('drops events with empty sessionId', () => {
    const { passed, dropped } = filterEvents([{
      ...validEvent,
      sessionId: '',
    }])
    expect(passed.length).toBe(0)
    expect(dropped).toBe(1)
  })

  it('drops events with timestamps too far in the past', () => {
    const { passed, dropped } = filterEvents([{
      ...validEvent,
      timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    }])
    expect(passed.length).toBe(0)
    expect(dropped).toBe(1)
  })

  it('drops events with future timestamps', () => {
    const { passed, dropped } = filterEvents([{
      ...validEvent,
      timestamp: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
    }])
    expect(passed.length).toBe(0)
    expect(dropped).toBe(1)
  })

  it('drops entire session when batch exceeds 100 events', () => {
    const events = Array.from({ length: 101 }, (): IncomingEvent => ({
      ...validEvent,
      sessionId: 'bot-session',
    }))
    const { passed, dropped } = filterEvents(events)
    expect(passed.length).toBe(0)
    expect(dropped).toBe(101)
  })

  it('returns debug reasons when debug is true', () => {
    const { reasons } = filterEvents([{
      ...validEvent,
      url: 'http://localhost:3000',
    }], true)
    expect(reasons.length).toBeGreaterThan(0)
  })

  it('passes multiple valid events', () => {
    const { passed, dropped } = filterEvents([validEvent, validEvent, validEvent])
    expect(passed.length).toBe(3)
    expect(dropped).toBe(0)
  })
})