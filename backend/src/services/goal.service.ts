import { goalRepository } from '../repositories/goal.repository.js'
import { prisma } from '../db.js'
import { goalProgressService } from './goalProgress.service.js'

function getPeriodDates(period: string): { startDate: Date; endDate: Date } {
  const now = new Date()
  if (period === 'weekly') {
    const day = now.getDay()
    const start = new Date(now)
    start.setDate(now.getDate() - day)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { startDate: start, endDate: end }
  }
  if (period === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { startDate: start, endDate: end }
  }
  const start = new Date(now.getFullYear(), 0, 1)
  const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
  return { startDate: start, endDate: end }
}

export const goalService = {
  getGoals: (userId: number) => goalRepository.findAllByUser(userId),

  createGoal: (userId: number, body: { title: string; period: string; targetHours: number }) => {
    const { startDate, endDate } = getPeriodDates(body.period)
    return goalRepository.create({ userId, ...body, startDate, endDate })
  },

  updateProgress: (goalId: number, achievedHours: number) =>
    goalRepository.update(goalId, { achievedHours }),

  getGoalDetails: (userId: number, goalId: number) => {
    return goalProgressService.getGoalProgress(userId, goalId)
  },

  // Get user goals with progress information
  getGoalProgress: (userId: number) => {
    return prisma.goal.findMany({
      where: { userId },
      include: {
        _count: {
          select: { taskCompletions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  },

  // Auto-update all goals based on recent activity
  autoUpdateGoals: (userId: number) => {
    return goalProgressService.updateAllGoalsProgress(userId)
  }
}
