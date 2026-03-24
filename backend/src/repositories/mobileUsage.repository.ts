import { prisma } from '../db.js'

export const mobileUsageRepository = {
  upsert: (data: { userId: number; appName: string; minutesUsed: number; category: string; date: Date }) =>
    prisma.mobileUsage.upsert({
      where: { userId_appName_date: { userId: data.userId, appName: data.appName, date: data.date } },
      update: { minutesUsed: data.minutesUsed },
      create: data,
    }),

  findTodayByUser: (userId: number) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return prisma.mobileUsage.findMany({
      where: { userId, date: today },
      orderBy: { minutesUsed: 'desc' },
    })
  },

  findByUserAndDate: (userId: number, date: Date) =>
    prisma.mobileUsage.findMany({
      where: { userId, date },
      orderBy: { minutesUsed: 'desc' },
    }),
}
