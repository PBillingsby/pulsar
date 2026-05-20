import { describe, it, expect, beforeEach } from 'bun:test'
import { Window } from 'happy-dom'
import { generateSessionId, getOrCreateSessionId } from '@/lib/session'

// set up localStorage before tests run
const window = new Window({ url: 'https://example.com' })
globalThis.localStorage = window.localStorage as unknown as Storage

describe('generateSessionId', () => {
  it('generates a string', () => {
    expect(typeof generateSessionId()).toBe('string')
  })

  it('generates unique ids', () => {
    const a = generateSessionId()
    const b = generateSessionId()
    expect(a).not.toBe(b)
  })

  it('contains a timestamp and random suffix separated by a dash', () => {
    const id = generateSessionId()
    const parts = id.split('-')
    expect(parts.length).toBe(2)
    expect(Number(parts[0])).toBeGreaterThan(0)
    expect(parts[1].length).toBeGreaterThan(0)
  })
})

describe('getOrCreateSessionId', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('creates a new session id when none exists', () => {
    const id = getOrCreateSessionId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('returns the same session id within the expiry window', () => {
    const first = getOrCreateSessionId()
    const second = getOrCreateSessionId()
    expect(first).toBe(second)
  })

  it('creates a new session id after expiry', () => {
    const first = getOrCreateSessionId()
    localStorage.setItem('pulsar_session_expiry', String(Date.now() - 1000))
    const second = getOrCreateSessionId()
    expect(first).not.toBe(second)
  })

  it('persists session id in localStorage', () => {
    const id = getOrCreateSessionId()
    expect(localStorage.getItem('pulsar_session_id')).toBe(id)
  })
})