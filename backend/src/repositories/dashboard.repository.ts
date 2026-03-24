import { prisma } from '../db.js'

export const dashboardRepository = {
  getDailyEntry: (userId: number, date: Date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return prisma.dailyEntry.findUnique({ where: { userId_date: { userId, date: d } } })
  },

  upsertDailyEntry: (
    userId: number,
    date: Date,
    data: Partial<{
      workHours: number
      studyHours: number
      gymCompleted: boolean
      waterLiters: number
      sleepHours: number
      productiveHours: number
    }>
  ) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return prisma.dailyEntry.upsert({
      where: { userId_date: { userId, date: d } },
      update: data,
      create: { userId, date: d, ...data },
    })
  },

  getEntriesInRange: (userId: number, start: Date, end: Date) =>
    prisma.dailyEntry.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    }),

  getTimerSessions: (userId: number, start: Date, end: Date) =>
    prisma.timerSession.findMany({
      where: { userId, startTime: { gte: start, lte: end } },
    }),

  getTaskCompletions: (userId: number, start: Date, end: Date) =>
    prisma.taskCompletion.findMany({
      where: {
        task: { userId },
        date: { gte: start, lte: end },
      },
      include: { task: true },
    }),
}
