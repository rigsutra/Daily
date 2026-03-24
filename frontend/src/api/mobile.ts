import api from './client'

export const mobileApi = {
  today: () => api.get('/mobile-usage/today').then(r => r.data),
}
