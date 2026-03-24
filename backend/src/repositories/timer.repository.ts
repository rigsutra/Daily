import { prisma } from '../db.js'

export const timerRepository = {
  create: (data: { userId: number; type: string; startTime: Date }) =>
    prisma.timerSession.create({ data }),

  findActiveByUser: (userId: number) =>
    prisma.timerSession.findFirst({
      where: { userId, endTime: null },
      orderBy: { startTime: 'desc' },
    }),

  update: (id: number, data: Partial<{ endTime: Date; duration: number; paused: boolean }>) =>
    prisma.timerSession.update({ where: { id }, data }),

  findByUserAndDate: (userId: number, date: Date) => {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    return prisma.timerSession.findMany({
      where: { userId, startTime: { gte: start, lte: end } },
    })
  },
}
