import api from './client'

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data).then(r => r.data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then(r => r.data),

  profile: () => api.get('/auth/profile').then(r => r.data),
}
