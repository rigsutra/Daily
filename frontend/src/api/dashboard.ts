import api from './client'

export const dashboardApi = {
  daily: () => api.get('/dashboard/daily').then(r => r.data),
  updateDaily: (data: {
    workHours?: number
    studyHours?: number
    gymCompleted?: boolean
    waterLiters?: number
    sleepHours?: number
  }) => api.patch('/dashboard/daily', data).then(r => r.data),
  weekly: () => api.get('/dashboard/weekly').then(r => r.data),
  monthly: () => api.get('/dashboard/monthly').then(r => r.data),
  yearly: () => api.get('/dashboard/yearly').then(r => r.data),
}
