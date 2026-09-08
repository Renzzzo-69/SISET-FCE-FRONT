import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import api, { AUTH_TOKEN_KEY, setUnauthorizedHandler } from '@/services/api'
import type { LoginCredentials, LoginResponse, MeResponse, UsuarioActual } from '@/types/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(AUTH_TOKEN_KEY))
  const usuario = ref<UsuarioActual | null>(null)
  const restaurando = ref(false)
  const inicializado = ref(false)

  const autenticado = computed(() => token.value !== null && usuario.value !== null)
  const codigosRol = computed(() => usuario.value?.roles.map((rol) => rol.codigo) ?? [])

  function guardarToken(nuevoToken: string) {
    token.value = nuevoToken
    localStorage.setItem(AUTH_TOKEN_KEY, nuevoToken)
  }

  function limpiarSesion() {
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
      const { data } = await api.get<MeResponse>('/me')
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
