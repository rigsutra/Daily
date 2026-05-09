import { prisma } from '../db.js'

export const taskRepository = {
  findAllByUser: (userId: number) =>
    prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),

  findById: (id: number) =>
    prisma.task.findUnique({ where: { id }, include: { completions: true } }),

  create: (data: { userId: number; title: string; target: number; unit: string; mandatory: boolean }) =>
    prisma.task.create({ data }),

  delete: (id: number) =>
    prisma.$transaction([
      prisma.taskCompletion.deleteMany({ where: { taskId: id } }),
      prisma.task.delete({ where: { id } }),
    ]),

  upsertCompletion: (taskId: number, date: Date, achieved: number) =>
    prisma.taskCompletion.upsert({
      where: { taskId_date: { taskId, date } },
      update: { achieved, completed: achieved > 0 },
      create: { taskId, date, achieved, completed: achieved > 0 },
    }),

  getCompletionsForDate: (userId: number, date: Date) => {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    return prisma.taskCompletion.findMany({
      where: {
        task: { userId },
        date: { gte: start, lte: end },
      },
      include: { task: true },
    })
  },

  createDeleteRequest: (data: { userId: number; taskId: number; taskTitle: string; reason: string }) =>
    prisma.deleteRequest.create({ data }),

  getDeleteRequest: (taskId: number) =>
    prisma.deleteRequest.findFirst({ where: { taskId } }),

  getDeleteRequestsForDate: (userId: number, date: Date) => {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    return prisma.deleteRequest.findMany({
      where: { userId, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
    })
  },
}
