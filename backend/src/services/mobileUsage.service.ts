import { mobileUsageRepository } from '../repositories/mobileUsage.repository.js'

const PRODUCTIVE_CATEGORIES = ['Work', 'Education', 'Productivity']
const NON_PRODUCTIVE_CATEGORIES = ['Social', 'Entertainment', 'Gaming']

export const mobileUsageService = {
  async syncUsage(userId: number, data: Array<{ appName: string; minutesUsed: number; category: string }>) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const results = await Promise.all(
      data.map(item => mobileUsageRepository.upsert({ userId, ...item, date: today }))
    )
    return results
  },

  async getTodayUsage(userId: number) {
    const records = await mobileUsageRepository.findTodayByUser(userId)
    const total = records.reduce((sum, r) => sum + r.minutesUsed, 0)
    const productive = records
      .filter(r => PRODUCTIVE_CATEGORIES.includes(r.category))
      .reduce((sum, r) => sum + r.minutesUsed, 0)
    const nonProductive = records
      .filter(r => NON_PRODUCTIVE_CATEGORIES.includes(r.category))
      .reduce((sum, r) => sum + r.minutesUsed, 0)
    const topDistracting = records
      .filter(r => NON_PRODUCTIVE_CATEGORIES.includes(r.category))
      .slice(0, 5)

    return { apps: records, totalMinutes: total, productiveMinutes: productive, nonProductiveMinutes: nonProductive, topDistracting }
  },
}
