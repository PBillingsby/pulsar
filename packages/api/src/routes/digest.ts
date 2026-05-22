import { Hono } from 'hono'
import { buildDigest } from '@/lib/digest/index'
import { sendDigest } from '@/lib/email/index'
import type { ApiResponse, DigestData } from '@/types/index'

export const digestRouter = new Hono()

digestRouter.post('/:projectKey', async (c) => {
  const projectKey: string = c.req.param('projectKey')
  const { email } = await c.req.json<{ email: string }>()

  if (!email) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Email is required' }, 400)
  }

  const digest: DigestData = await buildDigest(projectKey)
  await sendDigest(email, digest)

  return c.json<ApiResponse<DigestData>>({ success: true, data: digest })
})