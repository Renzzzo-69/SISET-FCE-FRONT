import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import api, { AUTH_TOKEN_KEY, setUnauthorizedHandler } from '@/services/api'
import type {
  Expediente,
  LoginCredentials,
  LoginResponse,
  MeResponse,
  UsuarioActual,
} from '@/types/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(AUTH_TOKEN_KEY))
  const usuario = ref<UsuarioActual | null>(null)
  const restaurando = ref(false)
  const inicializado = ref(false)
  const tieneExpediente = ref<boolean | null>(null)
  const errorExpediente = ref('')
  const expedientes = ref<Expediente[]>([])
  let revisionExpedientes = 0

  function sincronizarExpedientes(data: Expediente[]) {
    revisionExpedientes++
    expedientes.value = data
    const alumnoId = usuario.value?.alumno?.id_alumno
    tieneExpediente.value = alumnoId != null && data.some(
      (expediente) => Number(expediente.id_tesista) === Number(alumnoId) || Number(expediente.id_co_tesista) === Number(alumnoId),
    )
    errorExpediente.value = ''
  }

  async function actualizarExpediente() {
    const usuarioConsultado = usuario.value
    const revisionConsultada = revisionExpedientes
    try {
      const { data } = await api.get<Expediente[]>('/expedientes', { timeout: 20000 })
      if (usuario.value !== usuarioConsultado || revisionConsultada !== revisionExpedientes) return
      sincronizarExpedientes(data)
    } catch {
      if (usuario.value !== usuarioConsultado || revisionConsultada !== revisionExpedientes) return
      errorExpediente.value = 'No se pudo comprobar su expediente. Intente nuevamente.'
    }
  }

  function moduloTesistaDisponible(nombre: string) {
    if (nombre === 'formatos' || nombre === 'perfil') return true
    if (tieneExpediente.value === null) return false
    return tieneExpediente.value ? nombre !== 'expedientes-nuevo' : nombre === 'expedientes-nuevo'
  }

  const autenticado = computed(() => token.value !== null && usuario.value !== null)
  const codigosRol = computed(() => usuario.value?.roles.map((rol) => {
    const codigo = rol.codigo.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-\s]+/g, '_')
    return codigo === 'secretria_academica' ? 'secretaria_academica' : codigo
  }) ?? [])

  function guardarToken(nuevoToken: string) {
    token.value = nuevoToken
    localStorage.setItem(AUTH_TOKEN_KEY, nuevoToken)
  }

  function limpiarSesion() {
    revisionExpedientes++
    expedientes.value = []
    tieneExpediente.value = null
    errorExpediente.value = ''
    token.value = null
    usuario.value = null
    localStorage.removeItem(AUTH_TOKEN_KEY)
  }

  function tieneRol(...codigos: string[]) {
    return codigos.some((codigo) => codigosRol.value.includes(codigo))
  }

  async function restaurarSesion() {
    if (!token.value) {
      inicializado.value = true
      return false
    }

    restaurando.value = true

    try {
      const { data } = await api.get<MeResponse>('/me', { timeout: 20000 })
      usuario.value = data.usuario
      return true
    } catch {
      return false
    } finally {
      restaurando.value = false
      inicializado.value = true
    }
  }

  async function iniciarSesion(credenciales: LoginCredentials) {
    limpiarSesion()

    const { data } = await api.post<LoginResponse>('/login', credenciales)

    if (!data.token) {
      throw new Error('El servidor no devolvió un token de acceso.')
    }

    guardarToken(data.token)

    if (!(await restaurarSesion())) {
      limpiarSesion()
      throw new Error('No se pudo obtener el perfil de la sesión iniciada.')
    }
  }

  async function cerrarSesion() {
    try {
      if (token.value) {
        await api.post('/logout')
      }
    } catch {
      // El cierre local es suficiente si el token ya no es válido en el servidor.
    } finally {
      limpiarSesion()
    }
  }

  setUnauthorizedHandler(limpiarSesion)

  return {
    expedientes,
    tieneExpediente,
    errorExpediente,
    actualizarExpediente,
    sincronizarExpedientes,
    moduloTesistaDisponible,
    token,
    usuario,
    restaurando,
    inicializado,
    autenticado,
    codigosRol,
    tieneRol,
    restaurarSesion,
    iniciarSesion,
    cerrarSesion,
    limpiarSesion,
  }
})
