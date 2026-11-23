import { prisma } from '@/db/client'
import type { Context } from 'hono'
import crypto from 'node:crypto'

/** Public key embedded in the SDK. Anyone can read it, so it must never grant read access. */
export function generateProjectKey(name: string): string {
  const slug: string = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20)

  const suffix: string = crypto.randomBytes(6).toString('hex')
  return `${slug}-${suffix}`
}

/** Private key returned once at registration. Authenticates stats and digest requests. */
export function generateSecretKey(): string {
  return `psk_${crypto.randomBytes(32).toString('hex')}`
}

function safeEqual(a: string, b: string): boolean {
  const bufA: Buffer = Buffer.from(a)
  const bufB: Buffer = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

function bearerToken(c: Context): string | null {
  const header: string | undefined = c.req.header('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const token: string = header.slice('Bearer '.length).trim()
  return token.length > 0 ? token : null
}

/**
 * Returns the project only if the request carries its secret key. Returns null for
 * a missing project, a deleted project or a wrong key, so callers can't tell which.
 */
export async function authorizeProject(c: Context, projectKey: string): Promise<{
  projectKey: string
  email: string
  language: string
} | null> {
  const token: string | null = bearerToken(c)
  if (!token) return null

  const project = await prisma.project.findFirst({
    where: { projectKey, deletedAt: null },
    select: { projectKey: true, email: true, language: true, secretKey: true },
  })

  if (!project || !safeEqual(token, project.secretKey)) return null

  return { projectKey: project.projectKey, email: project.email, language: project.language }
}