import { rateLimiter } from 'hono-rate-limiter'

// max 1000 events per minute per IP
export const ingestLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-6',
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown',
})

// max 5 registrations per IP per hour
export const registerLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-6',
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown',
})