import { prisma } from '../db.js'

export const userRepository = {
  findByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email } }),

  findById: (id: number) =>
    prisma.user.findUnique({ where: { id } }),

  create: (data: { name: string; email: string; password: string }) =>
    prisma.user.create({ data }),

  update: (id: number, data: Partial<{ name: string; email: string; password: string }>) =>
    prisma.user.update({ where: { id }, data }),
}
