import { digestLimiter, ingestLimiter, registerLimiter } from '@/lib/middleware/rate-limit'
import { startScheduler } from '@/lib/scheduler/index'
import { digestRouter } from '@/routes/digest'
import { ingestRouter } from '@/routes/ingest'
import { projectsRouter } from '@/routes/projects'
import { statsRouter } from '@/routes/stats'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'

const app = new Hono()

app.use('*', cors())
app.use('*', secureHeaders())
app.use('/events/*', ingestLimiter)
app.use('/projects/register', registerLimiter)
app.use('/digest/*', digestLimiter)

app.get('/health', (c) => c.json({ status: 'ok' }))
app.route('/events', ingestRouter)
app.route('/stats', statsRouter)
app.route('/digest', digestRouter)
app.route('/projects', projectsRouter)

const PORT: number = Number(process.env.PORT) || 3001

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Pulsar API running on http://localhost:${PORT}`)
  startScheduler()
})