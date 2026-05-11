import { jest } from '@jest/globals'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

// Mock axios module
jest.mock('axios', () => {
  const actual = jest.requireActual('axios') as any
  const mockInstance: Partial<AxiosInstance> = {
    request: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  }
  return {
    ...actual,
    create: jest.fn(() => mockInstance),
  }
})

// Import the api client after mocking axios
import api from '../../frontend/src/api/client'

// Helper to get the mocked axios instance and its interceptors
const mockedAxios = (require('axios') as any)
const mockInstance = mockedAxios.create.mock.results[0].value as any

describe('API client retry interceptor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset retry counter on config objects
    mockInstance.request.mockImplementation(async (config: AxiosRequestConfig) => {
      // placeholder, will be overridden per test
      return {} as AxiosResponse
    })
  })

  test('should retry failed request up to MAX_RETRIES and succeed', async () => {
    const failTimes = 2
    let callCount = 0
    const successResponse = { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config: {} as any }
    mockInstance.request.mockImplementation(async (config: AxiosRequestConfig) => {
      callCount++
      if (callCount <= failTimes) {
        // Simulate network error without response
        const err: any = new Error('Network Error')
        err.config = config
        throw err
      }
      return successResponse
    })

    const response = await api.get('/test')
    expect(response).toBe(successResponse)
    expect(callCount).toBe(failTimes + 1)
  })

  test('should reject after exceeding max retries', async () => {
    const maxRetries = 3 // as defined in client.ts
    mockInstance.request.mockImplementation(async (config: AxiosRequestConfig) => {
      const err: any = new Error('Network Error')
      err.config = config
      throw err
    })

    await expect(api.get('/fail')).rejects.toThrow('Network Error')
    // initial request + retries = maxRetries + 1 attempts
    expect(mockInstance.request).toHaveBeenCalledTimes(maxRetries + 1)
  })
})
