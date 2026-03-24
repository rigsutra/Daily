import api from './client'

export const goalsApi = {
  getAll: () => api.get('/goals').then(r => r.data),
  create: (data: { title: string; period: string; targetHours: number }) =>
    api.post('/goals', data).then(r => r.data),
  updateProgress: (id: number, achievedHours: number) =>
    api.patch(`/goals/${id}/progress`, { achievedHours }).then(r => r.data),
}
