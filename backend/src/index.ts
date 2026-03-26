import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import swaggerUi from 'swagger-ui-express'

import authRoutes from './routes/auth.routes.js'
import taskRoutes from './routes/task.routes.js'
import timerRoutes from './routes/timer.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import goalRoutes from './routes/goal.routes.js'
import mobileUsageRoutes from './routes/mobileUsage.routes.js'
import { prisma } from './db.js'
import { swaggerSpec } from './swagger.js'

const app = express()
const PORT = process.env.PORT ?? 3000

const allowedOrigins = [
  'http://localhost:5173',
  'https://daily.ashishserver.space',
  'https://backenddaily.ashishserver.space',
]
app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/timer', timerRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/goals', goalRoutes)
app.use('/api/mobile-usage', mobileUsageRoutes)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// Cron: update goal statuses daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('[cron] Checking goal statuses...')
  try {
    const now = new Date()
    const expiredGoals = await prisma.goal.findMany({
      where: { status: 'active', endDate: { lt: now } },
    })
    for (const goal of expiredGoals) {
      const status = goal.achievedHours >= goal.targetHours ? 'completed' : 'failed'
      await prisma.goal.update({ where: { id: goal.id }, data: { status } })
    }
    console.log(`[cron] Updated ${expiredGoals.length} goals`)
  } catch (e) {
    console.error('[cron] Error:', e)
  }
})

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
