export interface User {
  id: number
  name: string
  email: string
  createdAt?: string
}

export interface Task {
  id: number
  userId: number
  title: string
  target: number
  unit: string
  mandatory: boolean
  createdAt: string
}

export interface TaskCompletion {
  id: number
  taskId: number
  date: string
  achieved: number
  completed: boolean
  task: Task
}

export interface TimerSession {
  id: number
  userId: number
  type: string
  startTime: string
  endTime?: string
  duration: number
  paused: boolean
}

export interface Goal {
  id: number
  userId: number
  title: string
  period: 'weekly' | 'monthly' | 'yearly'
  targetHours: number
  achievedHours: number
  status: 'active' | 'completed' | 'failed'
  startDate: string
  endDate: string
  createdAt: string
}

export interface MobileApp {
  id: number
  appName: string
  minutesUsed: number
  category: string
  date: string
}

export interface MobileUsageData {
  apps: MobileApp[]
  totalMinutes: number
  productiveMinutes: number
  nonProductiveMinutes: number
  topDistracting: MobileApp[]
}

export interface DailyDashboard {
  date: string
  totalHours: number
  hoursUsed: number
  hoursRemaining: number
  productivityScore: number
  workHours: number
  studyHours: number
  gymCompleted: boolean
  waterLiters: number
  sleepHours: number
  mobileMinutes: number
  completedTasks: number
  totalTasks: number
}

export interface WeeklyDashboard {
  startDate: string
  endDate: string
  entries: any[]
  totalProductiveHours: number
  totalWorkHours: number
  totalStudyHours: number
  totalTimerHours: number
  completedTasks: number
  totalTasks: number
}

export interface MonthlyDashboard {
  month: number
  year: number
  entries: any[]
  avgProductiveHours: number
  completedTasks: number
  totalTasks: number
}

export interface YearlyDashboard {
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
