const SLEEP_HOURS_DAILY = 7.5
const ESSENTIAL_HOURS_DAILY = 2
const JOB_HOURS_DAILY = 10 // 9AM to 7PM
const TRAVEL_HOURS_DAILY = 1
const WORKING_DAYS_PER_WEEK = 5

export interface YearTimeResult {
  year: number
  totalDays: number
  workingDays: number
  weekendDays: number
  remainingDaysInYear: number
  totalFreeHoursPerYear: number
  remainingFreeHoursInYear: number
  productiveHoursPerDay: number
  remainingMonthFreeHours: number
  daysLeftInMonth: number
  daysLeftInYear: number
}

export function calculateAvailableYearTime(): YearTimeResult {
  const now = new Date()
  const year = now.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const endOfYear = new Date(year, 11, 31)
  const totalDays = 365

  // Count working days in year
  let workingDays = 0
  const cursor = new Date(startOfYear)
  while (cursor <= endOfYear) {
    const d = cursor.getDay()
    if (d !== 0 && d !== 6) workingDays++
    cursor.setDate(cursor.getDate() + 1)
  }
  const weekendDays = totalDays - workingDays

  // Free hours per working day (no job)
  const workdayFreeHours = 24 - JOB_HOURS_DAILY - TRAVEL_HOURS_DAILY - SLEEP_HOURS_DAILY - ESSENTIAL_HOURS_DAILY
  // Free hours per weekend day
  const weekendFreeHours = 24 - SLEEP_HOURS_DAILY - ESSENTIAL_HOURS_DAILY
  const totalFreeHoursPerYear = workingDays * workdayFreeHours + weekendDays * weekendFreeHours

  // Remaining days
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const msPerDay = 1000 * 60 * 60 * 24
  const daysLeftInYear = Math.ceil((endOfYear.getTime() - todayStart.getTime()) / msPerDay)

  let remainingFreeHours = 0
  const remaining = new Date(todayStart)
  const end = new Date(endOfYear)
  while (remaining <= end) {
    const d = remaining.getDay()
    remainingFreeHours += d === 0 || d === 6 ? weekendFreeHours : workdayFreeHours
    remaining.setDate(remaining.getDate() + 1)
  }

  // Month remaining
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const daysLeftInMonth = Math.ceil((endOfMonth.getTime() - todayStart.getTime()) / msPerDay)
  let remainingMonthFreeHours = 0
  const mCursor = new Date(todayStart)
  while (mCursor <= endOfMonth) {
    const d = mCursor.getDay()
    remainingMonthFreeHours += d === 0 || d === 6 ? weekendFreeHours : workdayFreeHours
    mCursor.setDate(mCursor.getDate() + 1)
  }

  const productiveHoursPerDay = workdayFreeHours

  return {
    year,
    totalDays,
    workingDays,
    weekendDays,
    remainingDaysInYear: daysLeftInYear,
    totalFreeHoursPerYear: Math.round(totalFreeHoursPerYear * 10) / 10,
    remainingFreeHoursInYear: Math.round(remainingFreeHours * 10) / 10,
    productiveHoursPerDay,
    remainingMonthFreeHours: Math.round(remainingMonthFreeHours * 10) / 10,
    daysLeftInMonth,
    daysLeftInYear,
  }
}
