import { Hono } from 'hono'
import { getStats } from '@/lib/analytics/index'
import { generateDigest } from '@/lib/digest/index'
import { sendDigest } from '@/lib/email/index'
import type { ApiResponse, DigestData } from '@/types/index'

export const digestRouter = new Hono()

digestRouter.post('/:projectKey', async (c) => {
  const projectKey = c.req.param('projectKey')
  const { email } = await c.req.json<{ email: string }>()

  if (!email) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Email is required',
    }, 400)
  }

  const stats = await getStats(projectKey)
  const digest = generateDigest(stats)

  await sendDigest(email, digest)

  return c.json<ApiResponse<DigestData>>({
    success: true,
    data: digest,
  })
})