import { describe, it, expect } from 'bun:test'
import { generateSessionId } from '@/lib/session'

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