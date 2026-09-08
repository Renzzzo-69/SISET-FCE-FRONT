export interface RolActivo {
  id_rol: number
  codigo: string
  nombre: string
}

export interface UsuarioActual {
  id_usuario: number
  correo_electronico: string
  estado: 0 | 1
  roles: RolActivo[]
}

export interface LoginCredentials {
  correo_electronico: string
  password: string
}

export interface LoginResponse {
  message: string
  token: string
  token_type: 'Bearer'
  usuario: Omit<UsuarioActual, 'roles'>
}

export interface MeResponse {
  usuario: UsuarioActual
}

export interface Expediente {
  id_expediente: number
  cod_expediente: number
  id_tesista: number // Tesista 1
  id_co_tesista: number | null // Tesista 2; clave JSON heredada del backend
  id_etapa_actual: number
  id_estado_actual: number
  solicitud_adjunta: string
  version: number
  cumple: 0 | 1
  estado: 0 | 1
}

export interface AlumnoActivo {
  id_alumno: number
  id_usuario: number
  apellido_paterno: string
  apellido_materno: string
  nombres: string
  estado: 0 | 1
  usuario?: {
    id_usuario: number
  }
}

export interface CrearExpedientePayload {
  cod_expediente: number
  id_tesista: number // Tesista 1
  id_co_tesista?: number // Tesista 2; clave JSON heredada del backend
  solicitud_adjunta: string
  version: number
}
