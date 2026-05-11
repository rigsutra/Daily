import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * Internal retry counter used by the API client interceptor.
     */
    __retryCount?: number;
  }
}
