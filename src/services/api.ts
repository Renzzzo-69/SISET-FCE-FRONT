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
    const tokenActual = localStorage.getItem(AUTH_TOKEN_KEY)
    if (
      error.response?.status === 401 &&
      tokenActual &&
      error.config?.headers?.Authorization === `Bearer ${tokenActual}`
    ) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      onUnauthorized?.()
    }

    return Promise.reject(error)
  },
)

export async function descargarDocumentoPrivado(ruta: string, nombre: string) {
  const baseApi = new URL(import.meta.env.VITE_API_URL, window.location.origin)
  const url = new URL(ruta, baseApi.origin)
  url.searchParams.set('download', '1')

  const { data, headers } = await api.get<Blob>(url.toString(), { responseType: 'blob' })
  const urlTemporal = URL.createObjectURL(data)
  const enlace = document.createElement('a')
  const extension =
    data.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ? 'docx'
      : 'pdf'

  enlace.href = urlTemporal
  const disposition = String(headers['content-disposition'] ?? '')
  const nombreServidor = disposition.match(/filename="([^"]+)"/i)?.[1]
    ?? disposition.match(/filename=([^;\s]+)/i)?.[1]
  enlace.download = nombreServidor ?? `${nombre}.${extension}`
  document.body.append(enlace)
  enlace.click()
  enlace.remove()

  window.setTimeout(() => URL.revokeObjectURL(urlTemporal), 0)
}

export default api
