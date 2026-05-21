import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { ingestRouter } from '@/routes/ingest'
import { statsRouter } from '@/routes/stats'
import { digestRouter } from '@/routes/digest'
import { projectsRouter } from '@/routes/projects'
import { startScheduler } from '@/lib/scheduler/index'

const app = new Hono()

app.use('*', cors())

app.get('/health', (c) => c.json({ status: 'ok' }))
app.route('/events', ingestRouter)
app.route('/stats', statsRouter)
app.route('/digest', digestRouter)
app.route('/projects', projectsRouter)

const PORT = Number(process.env.PORT) || 3001

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Pulsar API running on http://localhost:${PORT}`)
  startScheduler()
})