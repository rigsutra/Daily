import { mobileUsageRepository } from '../repositories/mobileUsage.repository.js'

export const mobileUsageService = {
  async syncUsage(deviceId: string, capturedAt: string, apps: Array<{
    packageName: string
    appName: string
    usageMinutes: number
    lastUsed: number
  }>) {
    const date = new Date(capturedAt)
    date.setHours(0, 0, 0, 0)
    const results = await Promise.all(
      apps.map(app =>
        mobileUsageRepository.upsertByDevice({
          deviceId,
          appName: app.appName,
          packageName: app.packageName,
          minutesUsed: app.usageMinutes,
          lastUsed: new Date(app.lastUsed),
          date,
        })
      )
    )
    return results
  },

  async getTodayUsage(userId: number) {
    const records = await mobileUsageRepository.findTodayByUser(userId)
    const total = records.reduce((sum, r) => sum + r.minutesUsed, 0)
    const topDistracting = records.slice(0, 5)
    return {
      apps: records,
      totalMinutes: total,
      topDistracting,
    }
  },

  async linkDevice(userId: number, deviceId: string) {
    return mobileUsageRepository.linkDevice(userId, deviceId)
  },
}
