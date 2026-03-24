import { prisma } from '../db.js'

export const goalRepository = {
  findAllByUser: (userId: number) =>
    prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),

  findByPeriod: (userId: number, period: string) =>
    prisma.goal.findMany({ where: { userId, period }, orderBy: { createdAt: 'desc' } }),

  create: (data: {
    userId: number
    title: string
    period: string
    targetHours: number
    startDate: Date
    endDate: Date
  }) => prisma.goal.create({ data }),

  update: (id: number, data: Partial<{ achievedHours: number; status: string }>) =>
    prisma.goal.update({ where: { id }, data }),
}
