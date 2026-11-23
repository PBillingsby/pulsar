import { getStats } from '@/lib/analytics'
import { authorizeProject } from '@/lib/auth/index'
import type { ApiResponse, PulsarStats } from '@/types/index'
import { Hono } from 'hono'

export const statsRouter = new Hono()

statsRouter.get('/:projectKey', async (c) => {
  const project = await authorizeProject(c, c.req.param('projectKey'))
  if (!project) {
    return c.json<ApiResponse<null>>({ success: false, error: 'Unauthorized' }, 401)
  }

  const stats: PulsarStats = await getStats(project.projectKey)
  return c.json<ApiResponse<PulsarStats>>({ success: true, data: stats })
})