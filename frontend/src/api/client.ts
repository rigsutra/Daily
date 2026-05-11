import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const MAX_RETRIES = 3

api.interceptors.response.use(
  r => r,
  async err => {
    const config = err.config
    // Handle unauthorized errors (except auth endpoints)
    if (err.response?.status === 401 && config?.url && !config.url.includes('/auth/')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      return Promise.reject(err)
    }

    // Retry logic for network errors or server errors (5xx)
    if (config) {
      const shouldRetry = !err.response || (err.response.status >= 500 && err.response.status < 600)
      if (shouldRetry) {
        config.__retryCount = config.__retryCount ?? 0
        if (config.__retryCount < MAX_RETRIES) {
          config.__retryCount += 1
          // simple backoff (optional)
          await new Promise(res => setTimeout(res, 1500))
          return api.request(config)
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api
