import api from './client'

export const timerApi = {
  start: (type: string) => api.post('/timer/start', { type }).then(r => r.data),
  pause: () => api.post('/timer/pause').then(r => r.data),
  stop: () => api.post('/timer/stop').then(r => r.data),
  getActive: () => api.get('/timer/active').then(r => r.data),
  today: () => api.get('/timer/today').then(r => r.data),
}
