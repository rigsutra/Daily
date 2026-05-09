import { prisma } from '../db.js'
import { goalRepository } from '../repositories/goal.repository.js'

export const goalProgressService = {
  // Calculate and update goal progress based on timer sessions
  async updateGoalsFromTimerSessions(userId: number, startDate: Date, endDate: Date) {
    const timerSessions = await prisma.timerSession.findMany({
      where: {
        userId,
        startTime: { gte: startDate, lte: endDate },
        type: 'work'
      }
    })

    const totalHours = timerSessions.reduce((sum, session) => sum + (session.duration / 60), 0)

    const activeGoals = await prisma.goal.findMany({
      where: {
        userId,
        status: 'active',
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      }
    })

    for (const goal of activeGoals) {
      const progress = goal.achievedHours + totalHours
      const status = progress >= goal.targetHours ? 'completed' : 'active'
      
      await prisma.goal.update({
        where: { id: goal.id },
        data: { achievedHours: progress, status }
      })
    }

    return { totalHours, goalsUpdated: activeGoals.length }
  },

  // Calculate and update goal progress based on task completions
  async updateGoalsFromTaskCompletions(userId: number, startDate: Date, endDate: Date) {
    const taskCompletions = await prisma.taskCompletion.findMany({
      where: {
        task: { userId },
        date: { gte: startDate, lte: endDate },
        completed: true
      },
      include: { task: true }
    })

    // Calculate productive hours from completed tasks
    const totalHours = taskCompletions.reduce((sum, completion) => {
      // Estimate 30 minutes per completed task as productive time
      return sum + 0.5
    }, 0)

    const activeGoals = await prisma.goal.findMany({
      where: {
        userId,
        status: 'active',
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      }
    })

    for (const goal of activeGoals) {
      const progress = goal.achievedHours + totalHours
      const status = progress >= goal.targetHours ? 'completed' : 'active'
      
      await prisma.goal.update({
        where: { id: goal.id },
        data: { achievedHours: progress, status }
      })
    }

    return { totalHours, goalsUpdated: activeGoals.length }
  },

  // Update all goals for a user based on recent activity
  async updateAllGoalsProgress(userId: number) {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Update from timer sessions
    const timerResult = await this.updateGoalsFromTimerSessions(userId, thirtyDaysAgo, now)
    
    // Update from task completions
    const taskResult = await this.updateGoalsFromTaskCompletions(userId, thirtyDaysAgo, now)

    return {
      timerUpdates: timerResult,
      taskUpdates: taskResult,
      totalGoalsUpdated: timerResult.goalsUpdated + taskResult.goalsUpdated
    }
  },

  // Get goal progress with detailed information
  async getGoalProgress(userId: number, goalId: number) {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId }
    })

    if (!goal || goal.userId !== userId) {
      throw new Error('Goal not found')
    }

    const progressPercentage = goal.targetHours > 0 ? (goal.achievedHours / goal.targetHours) * 100 : 0
    const remainingHours = Math.max(0, goal.targetHours - goal.achievedHours)

    return {
      ...goal,
      progressPercentage: Math.round(progressPercentage * 100) / 100,
      remainingHours: Math.round(remainingHours * 10) / 10,
      isCompleted: goal.status === 'completed',
      isFailed: goal.status === 'failed'
    }
  }
}