import { getConnInfo } from '@hono/node-server/conninfo'
import type { Context } from 'hono'
import { rateLimiter } from 'hono-rate-limiter'

// X-Forwarded-For is set by the client unless a proxy you trust overwrites it.
// Only read it when TRUST_PROXY=true (Railway, Fly, Cloudflare); otherwise use the
// socket address so the limit can't be bypassed by faking the header.
function clientIp(c: Context): string {
  if (process.env.TRUST_PROXY === 'true') {
    const forwarded: string | undefined = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    if (forwarded) return forwarded
    const realIp: string | undefined = c.req.header('x-real-ip')
    if (realIp) return realIp
  }

  try {
    return getConnInfo(c).remote.address ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

// max 1000 events per minute per IP
export const ingestLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-6',
  keyGenerator: clientIp,
})

// max 5 registrations per IP per hour
export const registerLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-6',
  keyGenerator: clientIp,
})

// max 3 manual digests per project per hour; each costs an LLM call and an email
export const digestLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-6',
  keyGenerator: (c: Context) => `digest:${c.req.path}`,
})