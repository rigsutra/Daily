import api from './client'

export const tasksApi = {
  getAll: () => api.get('/tasks').then(r => r.data),
  create: (data: { title: string; target: number; unit: string; mandatory?: boolean }) =>
    api.post('/tasks', data).then(r => r.data),
  delete: (id: number, reason: string) =>
    api.delete(`/tasks/${id}`, { data: { reason } }).then(r => r.data),
  complete: (id: number, achieved: number) =>
    api.post(`/tasks/${id}/complete`, { achieved }).then(r => r.data),
  todayCompletions: () => api.get('/tasks/completions/today').then(r => r.data),
}
