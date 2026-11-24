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

export async function descargarDocumentoPrivado(ruta: string, nombre: string) {
  const baseApi = new URL(import.meta.env.VITE_API_URL, window.location.origin)
  const url = new URL(ruta, baseApi.origin)
  url.searchParams.set('download', '1')
  if (url.pathname.includes('/formatos-oficiales/') || url.pathname.includes('/plantilla-observaciones')) {
    url.searchParams.set('encoding', 'base64')
  }

  const { blob: data, nombre: nombreServidor } = await obtenerDocumentoBinario(url)
  const urlTemporal = URL.createObjectURL(data)
  const enlace = document.createElement('a')
  const extension =
    data.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ? 'docx'
      : 'pdf'

  enlace.href = urlTemporal
  enlace.download = nombreServidor ?? `${nombre}.${extension}`
  document.body.append(enlace)
  enlace.click()
  enlace.remove()

  window.setTimeout(() => URL.revokeObjectURL(urlTemporal), 0)
}

export async function verDocumentoPrivado(ruta: string) {
  const visor = window.open('', '_blank')

  if (!visor) {
    throw new Error('El navegador bloqueó la ventana del visor. Habilite las ventanas emergentes para este sitio.')
  }

  visor.document.title = 'Cargando informe...'
  visor.document.body.innerHTML =
    '<div style="font-family:Arial,sans-serif;padding:32px;text-align:center;color:#283a70">Cargando informe...</div>'

  try {
    const baseApi = new URL(import.meta.env.VITE_API_URL, window.location.origin)
    const url = new URL(ruta, baseApi.origin)
    url.searchParams.set('download', '0')
    if (url.pathname.includes('/formatos-oficiales/')) url.searchParams.set('encoding', 'base64')

    const { blob: data, nombre } = await obtenerDocumentoBinario(url)

    if (data.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const urlDescarga = URL.createObjectURL(data)
      const enlace = document.createElement('a')
      enlace.href = urlDescarga
      enlace.download = nombre ?? 'documento.docx'
      document.body.append(enlace)
      enlace.click()
      enlace.remove()
      window.setTimeout(() => URL.revokeObjectURL(urlDescarga), 1_000)
      visor.close()
      return
    }

    const urlTemporal = URL.createObjectURL(data)
    visor.location.replace(urlTemporal)
    window.setTimeout(() => URL.revokeObjectURL(urlTemporal), 300_000)
  } catch (error: any) {
    let mensaje = error?.response?.data?.message ?? error?.message ?? 'No se pudo abrir el informe.'

    if (error?.response?.data instanceof Blob) {
      try {
        const contenido = await error.response.data.text()
        const respuesta = JSON.parse(contenido)
        mensaje = respuesta.message ?? mensaje
      } catch {
        // El servidor pudo devolver una respuesta binaria o HTML sin detalles adicionales.
      }
    }

    visor.document.title = 'No se pudo abrir el informe'
    visor.document.body.innerHTML = ''
    const contenedor = visor.document.createElement('div')
    contenedor.style.cssText =
      'max-width:600px;margin:80px auto;padding:32px;font-family:Arial,sans-serif;text-align:center;color:#191c20;background:#fff;border:1px solid #c5c6d1;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.12)'
    const titulo = visor.document.createElement('h2')
    titulo.textContent = 'No se pudo abrir el informe'
    titulo.style.color = '#283a70'
    const detalle = visor.document.createElement('p')
    detalle.textContent = mensaje
    contenedor.append(titulo, detalle)
    visor.document.body.append(contenedor)

    throw new Error(mensaje)
  }
}

async function obtenerDocumentoBinario(url: URL): Promise<{ blob: Blob; nombre: string | null }> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  const respuesta = await fetch(url.toString(), {
    headers: {
      Accept: 'application/octet-stream, application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  })

  if (respuesta.status === 401) {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    onUnauthorized?.()
  }

  if (!respuesta.ok) {
    let mensaje = `No se pudo obtener el documento (${respuesta.status}).`
    try {
      const error = await respuesta.json()
      mensaje = error.message ?? mensaje
    } catch {
      // La respuesta no contiene un error JSON.
    }
    throw new Error(mensaje)
  }

  if (respuesta.headers.get('content-type')?.includes('application/json')) {
    const documento = await respuesta.json()
    const binario = atob(documento.contenido)
    const bytes = new Uint8Array(binario.length)
    for (let indice = 0; indice < binario.length; indice += 1) {
      bytes[indice] = binario.charCodeAt(indice)
    }

    return {
      blob: new Blob([bytes], { type: documento.tipo }),
      nombre: documento.nombre ?? null,
    }
  }

  const contenido = await respuesta.arrayBuffer()
  const tipo = respuesta.headers.get('content-type')?.split(';')[0] || 'application/octet-stream'
  const disposicion = respuesta.headers.get('content-disposition')
  const coincidenciaUtf8 = disposicion?.match(/filename\*=UTF-8''([^;]+)/i)
  const coincidenciaSimple = disposicion?.match(/filename="?([^";]+)"?/i)
  const nombre = coincidenciaUtf8?.[1]
    ? decodeURIComponent(coincidenciaUtf8[1])
    : coincidenciaSimple?.[1]?.trim() ?? null

  return { blob: new Blob([contenido], { type: tipo }), nombre }
}

export default api
