import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { buildDigest } from '@/lib/digest/index'
import { sendDigest } from '@/lib/email/index'
import { digestTriggerSchema, type DigestTriggerInput } from '@/lib/validate/schemas'
import type { ApiResponse, DigestData } from '@/types/index'
import { prisma } from '@/db/client'

export const digestRouter = new Hono()

digestRouter.post('/:projectKey', zValidator('json', digestTriggerSchema), async (c) => {
  const projectKey: string = c.req.param('projectKey')
  const { email }: DigestTriggerInput = c.req.valid('json')

  const project = await prisma.project.findUnique({
    where: { projectKey },
    select: { language: true },
  })

  const digest: DigestData = await buildDigest(projectKey)
  await sendDigest(email, digest, project?.language ?? 'English')

  return c.json<ApiResponse<DigestData>>({ success: true, data: digest })
})