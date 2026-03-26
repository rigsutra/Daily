import { prisma } from '../db.js'

export const mobileUsageRepository = {
  upsertByDevice: (data: {
    deviceId: string
    appName: string
    packageName: string
    minutesUsed: number
    lastUsed?: Date
    date: Date
  }) =>
    prisma.mobileUsage.upsert({
      where: { deviceId_packageName_date: { deviceId: data.deviceId, packageName: data.packageName, date: data.date } },
      update: { minutesUsed: data.minutesUsed, lastUsed: data.lastUsed },
      create: data,
    }),

  findTodayByUser: async (userId: number) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const devices = await prisma.userDevice.findMany({ where: { userId } })
    if (!devices.length) return []
    const deviceIds = devices.map(d => d.deviceId)
    return prisma.mobileUsage.findMany({
      where: { deviceId: { in: deviceIds }, date: today },
      orderBy: { minutesUsed: 'desc' },
    })
  },

  linkDevice: (userId: number, deviceId: string) =>
    prisma.userDevice.upsert({
      where: { deviceId },
      update: { userId },
      create: { userId, deviceId },
    }),

  findByUserAndDate: async (userId: number, date: Date) => {
    const devices = await prisma.userDevice.findMany({ where: { userId } })
    if (!devices.length) return []
    const deviceIds = devices.map(d => d.deviceId)
    return prisma.mobileUsage.findMany({
      where: { deviceId: { in: deviceIds }, date },
      orderBy: { minutesUsed: 'desc' },
    })
  },
}
