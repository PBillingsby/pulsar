import { Hono } from 'hono'
import { getStats } from '@/lib/analytics'
import type { ApiResponse, PulsarStats } from '@/types/index'

export const statsRouter = new Hono()

statsRouter.get('/:projectKey', async (c) => {
  const projectKey = c.req.param('projectKey')

  if (!projectKey) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: 'Project key is required',
    }, 400)
  }

  const stats = await getStats(projectKey)

  return c.json<ApiResponse<PulsarStats>>({
    success: true,
    data: stats,
  })
})