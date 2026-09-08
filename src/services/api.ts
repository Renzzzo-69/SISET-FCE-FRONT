import axios from 'axios'

export const AUTH_TOKEN_KEY = 'token'

let onUnauthorized: (() => void) | undefined

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      onUnauthorized?.()
    }

    return Promise.reject(error)
  },
)

export default api
