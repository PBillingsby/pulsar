import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { buildDigest } from '@/lib/digest/index'
import { sendDigest } from '@/lib/email/index'
import { digestTriggerSchema, type DigestTriggerInput } from '@/lib/validate/schemas'
import type { ApiResponse, DigestData } from '@/types/index'

export const digestRouter = new Hono()

digestRouter.post('/:projectKey', zValidator('json', digestTriggerSchema), async (c) => {
  const projectKey: string = c.req.param('projectKey')
  const { email }: DigestTriggerInput = c.req.valid('json')

  const digest: DigestData = await buildDigest(projectKey)
  await sendDigest(email, digest)

  return c.json<ApiResponse<DigestData>>({ success: true, data: digest })
})