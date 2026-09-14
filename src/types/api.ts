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
  tesista: ParticipanteExpediente | null
  co_tesista: ParticipanteExpediente | null
  etapa: EtapaExpedienteActual | null
  estado_actual: EstadoExpedienteActual | null
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

export interface SubsanacionDocumentaria {
  id_subsanacion_documentaria: number
  numero_intento: number
  detalle: string | null
  archivo_adjunto: string | null
  fecha_presentacion: string
  resultado: 'aceptada' | 'rechazada' | null
  fecha_revision: string | null
}

export interface ObservacionDocumentaria {
  id_observacion_documentaria: number
  detalle: string
  es_subsanable: boolean | 0 | 1
  estado: 'pendiente' | 'en_subsanacion' | 'cerrada'
  fecha_emision: string
  subsanaciones: SubsanacionDocumentaria[]
}

export type ResultadoEvaluacionRequisito = 'conforme' | 'observado' | 'no_presentado'

export interface EvaluacionRequisitoDocumentario {
  id_evaluacion_requisito: number
  resultado: ResultadoEvaluacionRequisito
  comentario: string | null
  fecha_evaluacion: string
  observaciones: ObservacionDocumentaria[]
}

export interface EvaluarRequisitoPayload {
  resultado: ResultadoEvaluacionRequisito
  comentario: string | null
}

export interface RegistrarObservacionPayload {
  detalle: string
  es_subsanable: boolean
}

export interface RequisitoRevisionDocumentaria {
  id_requisito_documentario: number
  codigo: string
  nombre: string
  descripcion: string | null
  estado: 0 | 1
  evaluacion: EvaluacionRequisitoDocumentario | null
}

export interface RevisionDocumentariaDetalle extends ResumenRevisionDocumentaria {
  requisitos: RequisitoRevisionDocumentaria[]
}

export interface RevisionDocumentariaConsulta {
  id_expediente: number
  rondas: ResumenRevisionDocumentaria[]
  revision: RevisionDocumentariaDetalle | null
}

export interface RevisionDocumentariaResponse {
  data: RevisionDocumentariaConsulta
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
