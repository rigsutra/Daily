const SLEEP_HOURS = 7.5
const ESSENTIAL_HOURS = 2
const JOB_HOURS = 10
const TRAVEL_HOURS = 1

export function calculateAvailableYearTime() {
  const now = new Date()
  const year = now.getFullYear()
  const totalDays = 365
  const workDayFreeHours = 24 - JOB_HOURS - TRAVEL_HOURS - SLEEP_HOURS - ESSENTIAL_HOURS
  const weekendFreeHours = 24 - SLEEP_HOURS - ESSENTIAL_HOURS

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const endOfYear = new Date(year, 11, 31)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  function countFreeHours(from: Date, to: Date) {
    let hours = 0
    const cur = new Date(from)
    while (cur <= to) {
      const d = cur.getDay()
      hours += d === 0 || d === 6 ? weekendFreeHours : workDayFreeHours
      cur.setDate(cur.getDate() + 1)
    }
    return Math.round(hours * 10) / 10
  }

  const msPerDay = 86400000
  const daysLeftInYear = Math.ceil((endOfYear.getTime() - todayStart.getTime()) / msPerDay)
  const daysLeftInMonth = Math.ceil((endOfMonth.getTime() - todayStart.getTime()) / msPerDay)

  return {
    year,
    totalDays,
    productiveHoursPerDay: workDayFreeHours,
    remainingFreeHoursInYear: countFreeHours(todayStart, endOfYear),
    remainingMonthFreeHours: countFreeHours(todayStart, endOfMonth),
    daysLeftInYear,
    daysLeftInMonth,
  }
}
