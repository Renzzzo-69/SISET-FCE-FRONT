export interface RolActivo {
  id_rol: number
  codigo: string
  nombre: string
}

export interface UsuarioActual {
  id_usuario: number
  correo_electronico: string
  estado: 0 | 1
  alumno: {
    id_alumno: number
  } | null
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
  usuario: Omit<UsuarioActual, 'alumno' | 'roles'>
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
  solicitud_adjunta: string | null
  version: number
  cumple: 0 | 1
  estado: 0 | 1
}

export interface CandidatoTesista {
  id_alumno: number
  apellido_paterno: string
  apellido_materno: string
  nombres: string
}

export interface ParticipanteExpediente {
  id_alumno: number
  apellido_paterno: string
  apellido_materno: string
  nombres: string
}

export interface EtapaExpedienteActual {
  id_etapa_expediente: number
  codigo: string
  nombre: string
}

export interface EstadoExpedienteActual {
  id_estado_expediente: number
  codigo: string
  nombre: string
}

export interface InformeExpediente {
  id_informe_proyecto_tesis: number
  version: number
  es_tesis: 0 | 1
  titulo: string
  turnitin: number | null
  archivo_adjunto: string | null
  estado: 0 | 1
}

export interface EventoHistorialExpediente {
  id_historial: number
  fecha_cambio: string
  accion_realizada: string
  etapa_anterior: EtapaExpedienteActual | null
  etapa_nueva: EtapaExpedienteActual | null
  estado_anterior: EstadoExpedienteActual | null
  estado_nuevo: EstadoExpedienteActual | null
  responsable: {
    id_usuario: number
    nombre: string | null
  } | null
}

export interface ResumenRevisionDocumentaria {
  id_revision_documentaria: number
  numero_ronda: number
  fecha_inicio: string | null
  fecha_cierre: string | null
  resultado_final: string | null
}

export interface ExpedienteDetalle {
  id_expediente: number
  cod_expediente: number
  solicitud_adjunta: string | null
  version: number
  cumple: 0 | 1
  estado: 0 | 1
  tesista_1: ParticipanteExpediente | null
  tesista_2: ParticipanteExpediente | null
  etapa_actual: EtapaExpedienteActual | null
  estado_actual: EstadoExpedienteActual | null
  informes: InformeExpediente[]
  historial: EventoHistorialExpediente[]
  revision_documentaria_reciente: ResumenRevisionDocumentaria | null
}

export interface ExpedienteDetalleResponse {
  data: ExpedienteDetalle | null
}

export interface InformeTurnitin {
  id_informe: number
  id_expediente: number
  cod_expediente: number
  tipo: 'proyecto' | 'tesis'
  version: number
  titulo: string
  turnitin: number | null
  archivo_adjunto: string | null
}

export interface ActualizarTurnitinResponse {
  mensaje: string
  data: {
    id_informe: number
    id_expediente: number
    version: number
    turnitin: number
  }
}
