import { captureWeeklySnapshot } from '@/lib/analytics/snapshots'
import { authorizeProject } from '@/lib/auth/index'
import { buildDigest } from '@/lib/digest/index'
import { sendDigest } from '@/lib/email/index'
import type { ApiResponse, DigestData } from '@/types/index'
import { Hono } from 'hono'

export const digestRouter = new Hono()

// Needs the secret key and only ever sends to the email on file, so a public
// projectKey can't be used to read data or email arbitrary addresses.
digestRouter.post('/:projectKey', async (c) => {
  const project = await authorizeProject(c, c.req.param('projectKey'))
  if (!project) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Unauthorized' }, 401)
  }

  await captureWeeklySnapshot(project.projectKey)
  const digest: DigestData = await buildDigest(project.projectKey)
  await sendDigest(project.email, digest, project.language ?? 'English')

  return c.json<ApiResponse<DigestData>>({ success: true, data: digest })
})