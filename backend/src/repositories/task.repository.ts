import { prisma } from '../db.js'

export const taskRepository = {
  findAllByUser: (userId: number) =>
    prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),

  findById: (id: number) =>
    prisma.task.findUnique({ where: { id }, include: { completions: true } }),

  create: (data: { userId: number; title: string; target: number; unit: string; mandatory: boolean }) =>
    prisma.task.create({ data }),

  delete: (id: number) =>
    prisma.task.delete({ where: { id } }),

  upsertCompletion: (taskId: number, date: Date, achieved: number) =>
    prisma.taskCompletion.upsert({
      where: { taskId_date: { taskId, date } },
      update: { achieved, completed: achieved > 0 },
      create: { taskId, date, achieved, completed: achieved > 0 },
    }),

  getCompletionsForDate: (userId: number, date: Date) =>
    prisma.taskCompletion.findMany({
      where: {
        task: { userId },
        date,
      },
      include: { task: true },
    }),

  createDeleteRequest: (data: { userId: number; taskId: number; reason: string }) =>
    prisma.deleteRequest.create({ data }),

  getDeleteRequest: (taskId: number) =>
    prisma.deleteRequest.findFirst({ where: { taskId } }),
}
