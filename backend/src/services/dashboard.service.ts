import { dashboardRepository } from '../repositories/dashboard.repository.js'
import { mobileUsageRepository } from '../repositories/mobileUsage.repository.js'
import { calculateAvailableYearTime } from './yearCalculation.service.js'

function startOf(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}
function endOf(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export const dashboardService = {
  async getDaily(userId: number) {
    const today = startOf(new Date())
    const entry = await dashboardRepository.getDailyEntry(userId, today)
    const timerSessions = await dashboardRepository.getTimerSessions(userId, today, endOf(today))
    const taskCompletions = await dashboardRepository.getTaskCompletions(userId, today, endOf(today))
    const mobileUsage = await mobileUsageRepository.findTodayByUser(userId)

    const timerMinutes = timerSessions.reduce((sum, s) => sum + s.duration, 0)
    const completedTasks = taskCompletions.filter(c => c.completed).length
    const totalTasks = taskCompletions.length
    const productivityScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const totalMobileMinutes = mobileUsage.reduce((sum, m) => sum + m.minutesUsed, 0)

    const hoursUsed = timerMinutes / 60 + (entry?.workHours ?? 0) + (entry?.studyHours ?? 0)
    const hoursRemaining = Math.max(0, 24 - hoursUsed - (entry?.sleepHours ?? 0))

    return {
      date: today,
      totalHours: 24,
      hoursUsed: Math.round(hoursUsed * 10) / 10,
      hoursRemaining: Math.round(hoursRemaining * 10) / 10,
      productivityScore,
      workHours: entry?.workHours ?? 0,
      studyHours: entry?.studyHours ?? 0,
      gymCompleted: entry?.gymCompleted ?? false,
      waterLiters: entry?.waterLiters ?? 0,
      sleepHours: entry?.sleepHours ?? 0,
      mobileMinutes: totalMobileMinutes,
      completedTasks,
      totalTasks,
    }
  },

  async getWeekly(userId: number) {
    const now = new Date()
    const startOfWeek = startOf(new Date(now))
    startOfWeek.setDate(now.getDate() - now.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    const entries = await dashboardRepository.getEntriesInRange(userId, startOfWeek, endOfWeek)
    const sessions = await dashboardRepository.getTimerSessions(userId, startOfWeek, endOfWeek)
    const completions = await dashboardRepository.getTaskCompletions(userId, startOfWeek, endOfWeek)

    const totalProductiveHours = entries.reduce((s, e) => s + e.productiveHours, 0)
    const totalWorkHours = entries.reduce((s, e) => s + e.workHours, 0)
    const totalStudyHours = entries.reduce((s, e) => s + e.studyHours, 0)
    const totalTimerMinutes = sessions.reduce((s, ss) => s + ss.duration, 0)
    const completedCount = completions.filter(c => c.completed).length

    return {
      startDate: startOfWeek,
      endDate: endOfWeek,
      entries,
      totalProductiveHours,
      totalWorkHours,
      totalStudyHours,
      totalTimerHours: Math.round((totalTimerMinutes / 60) * 10) / 10,
      completedTasks: completedCount,
      totalTasks: completions.length,
    }
  },

  async getMonthly(userId: number) {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const entries = await dashboardRepository.getEntriesInRange(userId, start, end)
    const completions = await dashboardRepository.getTaskCompletions(userId, start, end)

    const avgProductiveHours = entries.length
      ? entries.reduce((s, e) => s + e.productiveHours, 0) / entries.length
      : 0

    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      entries,
      avgProductiveHours: Math.round(avgProductiveHours * 10) / 10,
      completedTasks: completions.filter(c => c.completed).length,
      totalTasks: completions.length,
    }
  },

  getYearly: (_userId: number) => calculateAvailableYearTime(),
}
