<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'

import api, { descargarDocumentoPrivado } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type {
  EvaluarRequisitoPayload,
  EstadoExpedienteActual,
  EtapaExpedienteActual,
  ExpedienteDetalle,
  ExpedienteDetalleResponse,
  InformeExpediente,
  ObservacionDocumentaria,
  ParticipanteExpediente,
  RegistrarObservacionPayload,
  RequisitoRevisionDocumentaria,
  RevisarSubsanacionPayload,
  RevisionDocumentariaConsulta,
  RevisionDocumentariaResponse,
  ResultadoEvaluacionRequisito,
  ResultadoRevisionSubsanacion,
  SubsanacionDocumentaria,
} from '@/types/api'

type SeccionActiva = 'revision' | 'observaciones' | 'subsanaciones' | 'conformidad' | 'historial'
type InformeConContexto = InformeExpediente & { resumen?: string | null }

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const detalle = ref<ExpedienteDetalle | null>(null)
const revision = ref<RevisionDocumentariaConsulta | null>(null)
const cargando = ref(true)
const accionEnCurso = ref<'recepcion' | 'iniciar' | 'subsanacion' | 'conformidad' | 'derivacion' | null>(null)
const operacionEnCurso = ref<string | null>(null)
const descargando = ref<string | null>(null)
const porcentajeTurnitin = ref<number | null>(null)
const actaConformidad = ref<File | null>(null)
const arrastrandoActa = ref(false)
const errorActa = ref('')
const mensajeError = ref('')
const mensajeAccion = ref('')
const mostrarConformidad = ref(false)
const seccionActiva = ref<SeccionActiva>('revision')
const confirmaciones = ref<Record<string, string>>({})
const formulariosEvaluacion = ref<Record<number, { resultado: ResultadoEvaluacionRequisito | ''; comentario: string }>>({})
const resultadosChecklist = ref<Record<number, ResultadoEvaluacionRequisito | null>>({})
const formulariosObservacion = ref<Record<number, { detalle: string; es_subsanable: boolean }>>({})
const idExpediente = computed(() => Number(route.params.id))
const estaGestionando = computed(() => accionEnCurso.value !== null || operacionEnCurso.value !== null)
const puedeRecepcionar = computed(() => detalle.value?.estado_actual?.codigo === 'pendiente_derivacion')
const puedeIniciar = computed(() => detalle.value?.estado_actual?.codigo === 'derivado_udi')
const puedeEvaluar = computed(
  () =>
    detalle.value?.etapa_actual?.codigo === 'revision_requisitos_documentarios' &&
    detalle.value.estado_actual?.codigo === 'en_revision' &&
    revision.value?.revision != null,
)
const puedeRevisarSubsanaciones = computed(
  () =>
    detalle.value?.etapa_actual?.codigo === 'revision_requisitos_documentarios' &&
    detalle.value.estado_actual?.codigo === 'en_revision' &&
    revision.value?.revision != null,
)
const puedeSolicitarSubsanacion = computed(
  () =>
    detalle.value?.etapa_actual?.codigo === 'revision_requisitos_documentarios' &&
    detalle.value.estado_actual?.codigo === 'observado' &&
    (revision.value?.revision?.requisitos.some((requisito) =>
      requisito.evaluacion?.observaciones.some(
        (observacion) => Boolean(observacion.es_subsanable) && observacion.estado === 'pendiente',
      ),
    ) ?? false),
)
const requisitosActivos = computed(() => revision.value?.revision?.requisitos.filter((requisito) => requisito.estado === 1) ?? [])
const puedeDerivarDecanatura = computed(
  () =>
    detalle.value?.etapa_actual?.codigo === 'revision_requisitos_documentarios' &&
    detalle.value.estado_actual?.codigo === 'conforme' &&
    revision.value?.revision?.resultado_final === 'conforme' &&
    revision.value?.revision?.fecha_cierre !== null,
)
const informeContexto = computed<InformeConContexto | null>(() => {
  const informes = detalle.value?.informes ?? []
  return (informes.find((informe) => informe.es_tesis === 0) ?? informes[0] ?? null) as InformeConContexto | null
})
const tituloInforme = computed(() => informeContexto.value?.titulo || 'Sin informaci\u00f3n')
const resumenInforme = computed(() => informeContexto.value?.resumen?.trim() || 'Sin informaci\u00f3n')
const eventoRecepcion = computed(
  () => detalle.value?.historial.find((evento) => evento.accion_realizada === 'expediente_recepcionado_udi') ?? null,
)
const fechaCierreRevision = computed(() => revision.value?.revision?.fecha_cierre ?? null)
const fechaRegistroConformidad = new Date()
const fechaEmision = new Intl.DateTimeFormat('es-PE', { dateStyle: 'short' }).format(fechaRegistroConformidad)
const horaRegistro = new Intl.DateTimeFormat('es-PE', { timeStyle: 'short', hour12: false }).format(fechaRegistroConformidad)
const responsableTecnico = computed(() => auth.usuario?.correo_electronico ?? 'Usuario registrado')
const turnitinActual = computed(() => porcentajeTurnitin.value ?? informeContexto.value?.turnitin ?? null)
const puedeSiguienteEtapa = computed(
  () =>
    requisitosActivos.value.length > 0 &&
    requisitosActivos.value.every((requisito) => resultadoChecklist(requisito) === 'conforme') &&
    (turnitinActual.value === null || turnitinActual.value <= 50),
)
const puedeDeclararConformidad = computed(
  () =>
    detalle.value?.etapa_actual?.codigo === 'revision_requisitos_documentarios' &&
    detalle.value.estado_actual?.codigo === 'en_revision' &&
    revision.value?.revision?.fecha_cierre === null &&
    puedeSiguienteEtapa.value,
)
const avanceRevision = computed(() => {
  const requisitos = requisitosActivos.value
  const evaluados = requisitos.filter((requisito) => resultadoChecklist(requisito) === 'conforme').length
  const porcentaje = requisitos.length ? Math.round((evaluados / requisitos.length) * 100) : null

  return { evaluados, total: requisitos.length, porcentaje }
})
const observaciones = computed(() =>
  revision.value?.revision?.requisitos.flatMap((requisito) =>
    (requisito.evaluacion?.observaciones ?? []).map((observacion) => ({ requisito, observacion })),
  ) ?? [],
)

const ETIQUETAS_ESTADO: Record<string, string> = {
  pendiente_derivacion: 'Pendiente de derivaci\u00f3n',
  derivado_udi: 'Derivado a UDI',
  en_revision: 'En revisi\u00f3n',
  observado: 'Observado',
  pendiente_subsanacion: 'Pendiente de subsanaci\u00f3n',
  conforme: 'Conforme',
  derivado_decanatura: 'Derivado a Decanatura',
}

function nombreParticipante(participante: ParticipanteExpediente | null) {
  return participante
    ? [participante.apellido_paterno, participante.apellido_materno, participante.nombres]
        .filter(Boolean)
        .join(' ')
    : 'No registrado'
}

function nombreEtapa(etapa: EtapaExpedienteActual | null) {
  return etapa?.nombre ?? 'No disponible'
}

function nombreEstado(estado: EstadoExpedienteActual | null) {
  if (!estado) return 'Sin informaci\u00f3n'

  return ETIQUETAS_ESTADO[estado.codigo] ?? estado.nombre ?? 'Sin informaci\u00f3n'
}

function claseEstado(codigo: string | undefined) {
  if (codigo === 'conforme') return 'is-success'
  if (codigo === 'observado') return 'is-error'
  if (codigo === 'pendiente_derivacion' || codigo === 'pendiente_subsanacion') return 'is-warning'
  if (codigo === 'derivado_udi' || codigo === 'en_revision' || codigo === 'derivado_decanatura') return 'is-primary'
  return 'is-muted'
}

function etiquetaResultado(resultado: ResultadoEvaluacionRequisito | null | undefined) {
  if (resultado === 'conforme') return 'Conforme'
  if (resultado === 'observado') return 'Observado'
  if (resultado === 'no_presentado') return 'No presentado'
  return 'Pendiente'
}

function fechaTexto(fecha: string | null) {
  if (fecha === null) return 'Sin fecha'

  const fechaLocal = new Date(fecha)
  return Number.isNaN(fechaLocal.getTime())
    ? fecha
    : new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(fechaLocal)
}

function mensajeDesdeError(error: unknown, predeterminado: string) {
  if (!axios.isAxiosError(error)) return predeterminado

  switch (error.response?.status) {
    case 401:
      return 'La sesión expiró. Inicie sesión nuevamente.'
    case 403:
      return 'No tiene autorización para consultar o gestionar este expediente.'
    case 404:
      return 'El expediente o la revisión solicitada ya no está disponible.'
    case 409:
      return error.response.data?.message ?? 'La acción no está permitida para el estado actual del expediente.'
    case 422:
      return error.response.data?.message ?? 'La solicitud contiene datos no válidos.'
    default:
      return error.response?.data?.message ?? predeterminado
  }
}

function sincronizarFormularios(datos: RevisionDocumentariaConsulta) {
  const requisitos = datos.revision?.requisitos ?? []

  formulariosEvaluacion.value = Object.fromEntries(
    requisitos.map((requisito) => [
      requisito.id_requisito_documentario,
      {
        resultado: requisito.evaluacion?.resultado ?? '',
        comentario: requisito.evaluacion?.comentario ?? '',
      },
    ]),
  )
  resultadosChecklist.value = Object.fromEntries(
    requisitos.map((requisito) => [requisito.id_requisito_documentario, requisito.evaluacion?.resultado ?? null]),
  )
  formulariosObservacion.value = Object.fromEntries(
    requisitos
      .filter((requisito) => requisito.evaluacion !== null)
      .map((requisito) => [requisito.evaluacion!.id_evaluacion_requisito, { detalle: '', es_subsanable: true }]),
  )
}

function formularioEvaluacion(idRequisito: number) {
  return (formulariosEvaluacion.value[idRequisito] ??= { resultado: '', comentario: '' })
}

function formularioObservacion(idEvaluacion: number) {
  return (formulariosObservacion.value[idEvaluacion] ??= { detalle: '', es_subsanable: true })
}

function resultadoChecklist(requisito: RequisitoRevisionDocumentaria) {
  return resultadosChecklist.value[requisito.id_requisito_documentario] ?? requisito.evaluacion?.resultado ?? null
}

function asignarActaConformidad(archivo: File | null) {
  if (!archivo) return

  if (archivo.type !== 'application/pdf' && !archivo.name.toLowerCase().endsWith('.pdf')) {
    errorActa.value = 'Seleccione un archivo PDF.'
    return
  }

  actaConformidad.value = archivo
  errorActa.value = ''
}

function seleccionarActaConformidad(event: Event) {
  asignarActaConformidad((event.target as HTMLInputElement).files?.[0] ?? null)
}

function soltarActaConformidad(event: DragEvent) {
  arrastrandoActa.value = false
  asignarActaConformidad(event.dataTransfer?.files[0] ?? null)
}

function puedeRegistrarObservacion(requisito: RequisitoRevisionDocumentaria) {
  const resultado = requisito.evaluacion?.resultado
  return puedeEvaluar.value && (resultado === 'observado' || resultado === 'no_presentado')
}

function puedeRevisarSubsanacion(observacion: ObservacionDocumentaria, subsanacion: SubsanacionDocumentaria) {
  return puedeRevisarSubsanaciones.value && Boolean(observacion.es_subsanable) && subsanacion.resultado === null
}

async function cargarInformacion() {
  detalle.value = null
  revision.value = null
  mensajeError.value = ''

  if (!Number.isInteger(idExpediente.value) || idExpediente.value < 1) {
    mensajeError.value = 'El identificador del expediente no es válido.'
    cargando.value = false
    return
  }

  cargando.value = true

  try {
    const [detalleRespuesta, revisionRespuesta] = await Promise.all([
      api.get<ExpedienteDetalleResponse>(`/expedientes/${idExpediente.value}`),
      api.get<RevisionDocumentariaResponse>(`/expedientes/${idExpediente.value}/revision-documentaria`),
    ])
    detalle.value = detalleRespuesta.data.data ?? null
    revision.value = revisionRespuesta.data.data
    porcentajeTurnitin.value = informeContexto.value?.turnitin ?? null
    sincronizarFormularios(revisionRespuesta.data.data)
  } catch (error) {
    mensajeError.value = mensajeDesdeError(error, 'No se pudo cargar la revisión documentaria.')
  } finally {
    cargando.value = false
  }
}

async function guardarEvaluacion(requisito: RequisitoRevisionDocumentaria) {
  const formulario = formulariosEvaluacion.value[requisito.id_requisito_documentario]

  if (formulario?.resultado) {
    resultadosChecklist.value[requisito.id_requisito_documentario] = formulario.resultado
    return
  }

  if (!formulario || formulario.resultado === '') {
    mensajeError.value = 'Seleccione un resultado para evaluar el requisito.'
    return
  }

  const clave = `evaluacion-${requisito.id_requisito_documentario}`
  operacionEnCurso.value = clave
  mensajeError.value = ''

  try {
    const payload: EvaluarRequisitoPayload = {
      resultado: formulario.resultado,
      comentario: formulario.comentario.trim() || null,
    }
    await api.put(
      `/expedientes/${idExpediente.value}/revision-documentaria/requisitos/${requisito.id_requisito_documentario}`,
      payload,
    )
    confirmaciones.value[clave] = 'Evaluación guardada correctamente.'
    await cargarInformacion()
  } catch (error) {
    mensajeError.value = mensajeDesdeError(error, 'No se pudo guardar la evaluación del requisito.')
  } finally {
    operacionEnCurso.value = null
  }
}

async function registrarObservacion(requisito: RequisitoRevisionDocumentaria) {
  if (estaGestionando.value) return

  const evaluacion = requisito.evaluacion
  if (!evaluacion) return

  const formulario = formulariosObservacion.value[evaluacion.id_evaluacion_requisito]

  if (!formulario || formulario.detalle.trim() === '') {
    mensajeError.value = 'Ingrese el detalle de la observación.'
    return
  }

  const clave = `observacion-${evaluacion.id_evaluacion_requisito}`
  operacionEnCurso.value = clave
  mensajeError.value = ''

  try {
    const payload: RegistrarObservacionPayload = {
      detalle: formulario.detalle.trim(),
      es_subsanable: formulario.es_subsanable,
    }
    await api.post(
      `/expedientes/${idExpediente.value}/revision-documentaria/evaluaciones/${evaluacion.id_evaluacion_requisito}/observaciones`,
      payload,
    )
    confirmaciones.value[clave] = 'Observación registrada correctamente.'
    await cargarInformacion()
  } catch (error) {
    mensajeError.value = mensajeDesdeError(error, 'No se pudo registrar la observación.')
  } finally {
    operacionEnCurso.value = null
  }
}

async function revisarSubsanacion(
  observacion: ObservacionDocumentaria,
  subsanacion: SubsanacionDocumentaria,
  resultado: ResultadoRevisionSubsanacion,
) {
  if (
    !Number.isInteger(idExpediente.value) ||
    idExpediente.value < 1 ||
    estaGestionando.value ||
    !puedeRevisarSubsanacion(observacion, subsanacion)
  ) {
    return
  }

  const clave = `subsanacion-${subsanacion.id_subsanacion_documentaria}`
  operacionEnCurso.value = clave
  mensajeError.value = ''

  try {
    const payload: RevisarSubsanacionPayload = { resultado }
    await api.put(
      `/expedientes/${idExpediente.value}/revision-documentaria/subsanaciones/${subsanacion.id_subsanacion_documentaria}`,
      payload,
    )
    confirmaciones.value[clave] =
      resultado === 'aceptada'
        ? 'Subsanación aceptada. La observación fue cerrada.'
        : 'Subsanación rechazada. La observación quedó pendiente; solicite una nueva subsanación para habilitar otro intento.'
    await cargarInformacion()
  } catch (error) {
    mensajeError.value = mensajeDesdeError(error, 'No se pudo revisar la subsanación.')
  } finally {
    operacionEnCurso.value = null
  }
}

async function ejecutarAccion(accion: 'recepcion' | 'iniciar') {
  if (!Number.isInteger(idExpediente.value) || idExpediente.value < 1 || estaGestionando.value) return

  accionEnCurso.value = accion
  mensajeError.value = ''
  mensajeAccion.value = ''

  try {
    const { data } = await api.post<{ message?: string }>(
      `/expedientes/${idExpediente.value}/revision-documentaria/${accion}`,
    )
    mensajeAccion.value =
      data.message ?? (accion === 'recepcion' ? 'Expediente recibido por UDI.' : 'Revisión documentaria iniciada.')
    await cargarInformacion()
  } catch (error) {
    mensajeError.value = mensajeDesdeError(error, 'No se pudo completar la acción solicitada.')
  } finally {
    accionEnCurso.value = null
  }
}

async function solicitarSubsanacion() {
  if (!Number.isInteger(idExpediente.value) || idExpediente.value < 1 || estaGestionando.value) return

  accionEnCurso.value = 'subsanacion'
  mensajeError.value = ''
  mensajeAccion.value = ''

  try {
    await api.post(`/expedientes/${idExpediente.value}/revision-documentaria/pendiente-subsanacion`)
    mensajeAccion.value = 'Expediente marcado como pendiente de subsanación.'
    await cargarInformacion()
  } catch (error) {
    mensajeError.value = mensajeDesdeError(error, 'No se pudo solicitar la subsanación.')
  } finally {
    accionEnCurso.value = null
  }
}

async function declararConformidad() {
  if (!Number.isInteger(idExpediente.value) || idExpediente.value < 1 || estaGestionando.value || !puedeDeclararConformidad.value) {
    return
  }

  if (!window.confirm('¿Desea declarar la conformidad técnica de esta revisión?')) return

  accionEnCurso.value = 'conformidad'
  mensajeError.value = ''
  mensajeAccion.value = ''

  try {
    await api.post(`/expedientes/${idExpediente.value}/revision-documentaria/conformidad`)
    mensajeAccion.value = 'Conformidad técnica declarada.'
    await cargarInformacion()
  } catch (error) {
    mensajeError.value = mensajeDesdeError(error, 'No se pudo declarar la conformidad técnica.')
  } finally {
    accionEnCurso.value = null
  }
}

async function derivarDecanatura() {
  if (!Number.isInteger(idExpediente.value) || idExpediente.value < 1 || estaGestionando.value || !puedeDerivarDecanatura.value) {
    return
  }

  if (!window.confirm('¿Desea derivar este expediente a Decanatura?')) return

  accionEnCurso.value = 'derivacion'
  mensajeError.value = ''
  mensajeAccion.value = ''

  try {
    await api.post(`/expedientes/${idExpediente.value}/revision-documentaria/derivacion-decanatura`)
    mensajeAccion.value = 'Expediente derivado a Decanatura.'
    await cargarInformacion()
  } catch (error) {
    mensajeError.value = mensajeDesdeError(error, 'No se pudo derivar el expediente a Decanatura.')
  } finally {
    accionEnCurso.value = null
  }
}

async function descargarDocumento(ruta: string, nombre: string, clave: string) {
  mensajeError.value = ''
  descargando.value = clave

  try {
    await descargarDocumentoPrivado(ruta, nombre)
  } catch (error) {
    mensajeError.value = mensajeDesdeError(error, 'No se pudo descargar el documento.')
  } finally {
    descargando.value = null
  }
}

onMounted(cargarInformacion)
</script>

<template>
  <section class="udi-revision" aria-labelledby="revision-title">
    <header class="revision-heading">
      <div>
        <p class="eyebrow">Unidad de Investigación</p>
        <h1 id="revision-title">Revisión documentaria</h1>
        <p class="intro">Evalúe la documentación presentada y gestione las observaciones del expediente.</p>
      </div>
      <div class="heading-actions">
        <button type="button" class="outline-button" :disabled="cargando" @click="cargarInformacion">
          <span class="material-symbols-outlined" aria-hidden="true">refresh</span>
          {{ cargando ? 'Actualizando…' : 'Actualizar' }}
        </button>
        <button type="button" class="outline-button" @click="router.push({ name: 'udi-expedientes' })">
          <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          Volver a la bandeja
        </button>
      </div>
    </header>

    <div v-if="cargando" class="interface-state" role="status" aria-live="polite">
      <span class="material-symbols-outlined state-icon" aria-hidden="true">hourglass_top</span>
      <div>
        <h2>Cargando revisión documentaria</h2>
        <p>Estamos preparando la información del expediente.</p>
      </div>
    </div>

    <div v-else-if="mensajeError" class="interface-state error-state" role="alert">
      <span class="material-symbols-outlined state-icon" aria-hidden="true">error</span>
      <div>
        <h2>No se pudo cargar la revisión</h2>
        <p>{{ mensajeError }}</p>
        <button type="button" class="primary-button" @click="cargarInformacion">Reintentar</button>
      </div>
    </div>

    <div v-else-if="detalle === null" class="interface-state" role="status">
      <span class="material-symbols-outlined state-icon" aria-hidden="true">folder_off</span>
      <div>
        <h2>Sin información del expediente</h2>
        <p>El expediente no contiene información disponible para revisión.</p>
      </div>
    </div>

    <template v-else>
      <template v-if="mostrarConformidad || detalle.estado_actual?.codigo === 'conforme'">
        <p v-if="mensajeAccion" class="message success-message" role="status">{{ mensajeAccion }}</p>

        <section class="conformity-view conformity-page" aria-labelledby="conformity-title">
          <nav class="conformity-breadcrumb" aria-label="Ubicaci&#243;n de la revisi&#243;n">
            <span>Gesti&#243;n acad&#233;mica</span>
            <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            <span>Expediente {{ detalle.cod_expediente }}</span>
            <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            <strong>Emisi&#243;n de conformidad</strong>
          </nav>

          <div class="conformity-layout">
            <div class="conformity-checklist-column">
              <section class="conformity-table-card">
                <header class="conformity-card-heading">
                  <h2 id="conformity-title">Checklist Final de Revisi&#243;n</h2>
                  <span class="conformity-status is-ready">APTO</span>
                </header>
                <div class="table-wrapper">
                  <table>
                    <thead><tr><th>Requisito</th><th>Estado</th><th>Observaciones</th></tr></thead>
                    <tbody>
                      <tr v-for="requisito in revision?.revision?.requisitos ?? []" :key="requisito.id_requisito_documentario">
                        <td><strong>{{ requisito.nombre }}</strong><span>{{ requisito.codigo }}</span></td>
                        <td><span class="evaluation-badge" :class="`is-${resultadoChecklist(requisito) ?? 'pending'}`"><span class="material-symbols-outlined" aria-hidden="true">{{ resultadoChecklist(requisito) === 'conforme' ? 'check_circle' : resultadoChecklist(requisito) === 'observado' ? 'error' : 'pending' }}</span>{{ etiquetaResultado(resultadoChecklist(requisito)) }}</span></td>
                        <td>
                          <ul v-if="requisito.evaluacion?.observaciones.length" class="conformity-observations">
                            <li v-for="observacion in requisito.evaluacion.observaciones" :key="observacion.id_observacion_documentaria">{{ observacion.detalle }}</li>
                          </ul>
                          <span v-else>Sin observaciones pendientes</span>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Informe de similitud (Turnitin)</strong><span>{{ informeContexto ? `${informeContexto.es_tesis ? 'Tesis final' : 'Proyecto'} · Versi\u00f3n ${informeContexto.version}` : 'Sin informe registrado' }}</span></td>
                        <td><span class="evaluation-badge" :class="turnitinActual === null ? 'is-pending' : 'is-conforme'"><span class="material-symbols-outlined" aria-hidden="true">{{ turnitinActual === null ? 'pending' : 'check_circle' }}</span>{{ turnitinActual === null ? 'Pendiente' : `${turnitinActual}%` }}</span></td>
                        <td>{{ turnitinActual === null ? 'Sin registrar' : 'Porcentaje registrado' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section class="documentation-status is-ready">
                <span class="material-symbols-outlined" aria-hidden="true">verified</span>
                <div>
                  <h2>Estado de Documentaci&#243;n</h2>
                  <p>{{ detalle.estado_actual?.codigo === 'conforme' ? 'La revisi&#243;n documentaria fue cerrada como conforme. No existen bloqueos t&#233;cnicos pendientes.' : 'Todos los requisitos activos est&#225;n conformes y no existen observaciones abiertas.' }}</p>
                </div>
              </section>
            </div>

            <aside class="conformity-form-card">
              <h2>Formulario de Conformidad</h2>
              <form @submit.prevent>
                <label>
                  C&#243;digo de Conformidad
                  <span class="input-with-icon"><span class="material-symbols-outlined" aria-hidden="true">tag</span><input value="Pendiente de implementaci&#243;n" disabled></span>
                </label>
                <div class="conformity-dates">
                  <label>Fecha de Emisi&#243;n<input type="text" :value="fechaEmision" disabled></label>
                  <label>Hora Registro<input type="text" :value="horaRegistro" disabled></label>
                </div>
                <label>
                  Responsable T&#233;cnico
                  <select disabled><option>{{ responsableTecnico }}</option></select>
                </label>
                <div class="acta-field">
                  <span>Acta de conformidad t&#233;cnica (PDF)</span>
                  <label class="acta-dropzone" :class="{ 'is-dragging': arrastrandoActa }" @dragover.prevent="arrastrandoActa = true" @dragleave.prevent="arrastrandoActa = false" @drop.prevent="soltarActaConformidad">
                    <input class="sr-only" type="file" accept="application/pdf,.pdf" @change="seleccionarActaConformidad">
                    <span class="material-symbols-outlined" aria-hidden="true">upload_file</span>
                    <strong>{{ actaConformidad ? 'Acta seleccionada' : 'Arrastra aqu&#237; el documento' }}</strong>
                    <small>{{ actaConformidad ? 'Archivo listo para la conformidad t&#233;cnica.' : 'O haz clic para seleccionar un PDF.' }}</small>
                    <span v-if="actaConformidad" class="acta-file-chip"><span class="material-symbols-outlined" aria-hidden="true">attach_file</span>{{ actaConformidad.name }}</span>
                  </label>
                  <small v-if="errorActa" class="acta-error">{{ errorActa }}</small>
                </div>
                <button v-if="puedeDeclararConformidad" type="button" class="conformity-primary-action" :disabled="estaGestionando" @click="declararConformidad"><span class="material-symbols-outlined" aria-hidden="true">verified_user</span>{{ accionEnCurso === 'conformidad' ? 'Declarando...' : 'Emitir conformidad t&#233;cnica' }}</button>
                <button v-else-if="puedeDerivarDecanatura" type="button" class="conformity-primary-action" :disabled="estaGestionando" @click="derivarDecanatura"><span class="material-symbols-outlined" aria-hidden="true">forward_to_inbox</span>{{ accionEnCurso === 'derivacion' ? 'Derivando...' : 'Derivar a Decanatura' }}</button>
                <button v-else type="button" class="conformity-primary-action" disabled><span class="material-symbols-outlined" aria-hidden="true">verified_user</span>Emitir conformidad t&#233;cnica</button>
              </form>
            </aside>
          </div>
        </section>
      </template>

      <template v-else-if="detalle.estado_actual?.codigo === 'en_revision'">
        <p v-if="mensajeAccion" class="message success-message" role="status">{{ mensajeAccion }}</p>

        <section class="stitch-review" aria-labelledby="revision-module-title">
          <header class="stitch-review-header">
            <div>
              <p class="stitch-breadcrumb">Revisi&#243;n en curso <span aria-hidden="true">›</span> Momento {{ revision?.revision?.numero_ronda ?? 1 }}: {{ informeContexto?.es_tesis ? 'Tesis' : 'Proyecto' }}</p>
              <h2 id="revision-module-title">M&#243;dulo de Revisi&#243;n y Observaciones</h2>
            </div>
            <div class="stitch-expediente-selector" aria-label="Expediente en revisi&#243;n">
              <span class="material-symbols-outlined" aria-hidden="true">folder_open</span>
              <span><strong>{{ detalle.cod_expediente }}</strong><small>{{ nombreParticipante(detalle.tesista_1) }}</small></span>
            </div>
          </header>

          <div class="stitch-review-layout">
            <main class="stitch-review-checklist">
              <div class="stitch-moment-label">
                <span class="material-symbols-outlined" aria-hidden="true">fact_check</span>
                Momento {{ revision?.revision?.numero_ronda ?? 1 }}: {{ informeContexto?.es_tesis ? 'Tesis' : 'Proyecto' }}
              </div>

              <section class="stitch-requirements-card">
                <header class="stitch-card-header">
                  <div>
                    <p>Checklist documentario</p>
                    <h3>Requisitos de revisi&#243;n</h3>
                  </div>
                  <span class="stitch-required">OBLIGATORIO</span>
                </header>

                <p v-if="revision?.revision === null" class="stitch-empty">Inicie la revisi&#243;n documentaria para habilitar los requisitos.</p>
                <div v-else-if="revision?.revision.requisitos.length" class="stitch-requirements-list">
                  <article v-for="requisito in revision.revision.requisitos" :key="requisito.id_requisito_documentario" class="stitch-requirement" :class="{ 'is-inactive': requisito.estado !== 1 }">
                    <div class="stitch-requirement-copy">
                      <span class="stitch-requirement-number">{{ requisito.codigo }}</span>
                      <div>
                        <h4>{{ requisito.nombre }}</h4>
                        <p v-if="requisito.descripcion">{{ requisito.descripcion }}</p>
                        <p v-else>Sin informaci&#243;n adicional.</p>
                      </div>
                    </div>

                    <div v-if="puedeEvaluar && requisito.estado === 1" class="stitch-evaluation-form">
                      <div class="stitch-decision-options" role="radiogroup" :aria-label="`Resultado para ${requisito.nombre}`">
                        <label class="stitch-decision is-conforme" :class="{ 'is-selected': formularioEvaluacion(requisito.id_requisito_documentario).resultado === 'conforme' }">
                          <input v-model="formularioEvaluacion(requisito.id_requisito_documentario).resultado" type="radio" value="conforme" :disabled="estaGestionando" @change="guardarEvaluacion(requisito)">
                          <span class="material-symbols-outlined" aria-hidden="true">check</span>
                          Cumple
                        </label>
                        <label class="stitch-decision is-observado" :class="{ 'is-selected': formularioEvaluacion(requisito.id_requisito_documentario).resultado === 'observado' }">
                          <input v-model="formularioEvaluacion(requisito.id_requisito_documentario).resultado" type="radio" value="observado" :disabled="estaGestionando" @change="guardarEvaluacion(requisito)">
                          <span class="material-symbols-outlined" aria-hidden="true">close</span>
                          No cumple
                        </label>
                      </div>
                    </div>

                    <div v-else class="stitch-evaluation-readonly">
                      <span class="evaluation-badge" :class="`is-${requisito.evaluacion?.resultado ?? 'pending'}`">{{ etiquetaResultado(requisito.evaluacion?.resultado) }}</span>
                      <span v-if="requisito.evaluacion">Evaluado {{ fechaTexto(requisito.evaluacion.fecha_evaluacion) }}</span>
                      <span v-else>Pendiente de evaluaci&#243;n</span>
                    </div>

                    <template v-if="requisito.evaluacion">
                      <p v-if="requisito.evaluacion.comentario" class="stitch-saved-comment">{{ requisito.evaluacion.comentario }}</p>
                      <p v-if="confirmaciones[`evaluacion-${requisito.id_requisito_documentario}`]" class="inline-success" role="status">{{ confirmaciones[`evaluacion-${requisito.id_requisito_documentario}`] }}</p>

                      <form v-if="puedeRegistrarObservacion(requisito)" class="stitch-observation-form" @submit.prevent="registrarObservacion(requisito)">
                        <label>
                          <span>Observaci&#243;n para el tesista</span>
                          <textarea v-model="formularioObservacion(requisito.evaluacion.id_evaluacion_requisito).detalle" :disabled="estaGestionando" rows="3" required placeholder="Detalle lo que debe subsanarse"></textarea>
                        </label>
                        <fieldset :disabled="estaGestionando">
                          <legend>Tipo de observaci&#243;n</legend>
                          <label><input v-model="formularioObservacion(requisito.evaluacion.id_evaluacion_requisito).es_subsanable" type="radio" :name="`subsanable-${requisito.evaluacion.id_evaluacion_requisito}`" :value="true"> Subsanable</label>
                          <label><input v-model="formularioObservacion(requisito.evaluacion.id_evaluacion_requisito).es_subsanable" type="radio" :name="`subsanable-${requisito.evaluacion.id_evaluacion_requisito}`" :value="false"> No subsanable</label>
                        </fieldset>
                        <button type="submit" class="stitch-observation-button" :disabled="estaGestionando">{{ operacionEnCurso === `observacion-${requisito.evaluacion.id_evaluacion_requisito}` ? 'Registrando...' : 'Registrar observaci&#243;n' }}</button>
                      </form>

                      <div v-if="requisito.evaluacion.observaciones.length" class="stitch-observations-history">
                        <article v-for="observacion in requisito.evaluacion.observaciones" :key="observacion.id_observacion_documentaria">
                          <div><strong>Observaci&#243;n</strong><span>{{ observacion.estado === 'cerrada' ? 'Cerrada' : observacion.estado === 'en_subsanacion' ? 'En subsanaci&#243;n' : 'Pendiente' }}</span></div>
                          <p>{{ observacion.detalle }}</p>
                          <div v-for="subsanacion in observacion.subsanaciones" :key="subsanacion.id_subsanacion_documentaria" class="stitch-subsanacion">
                            <span>Subsanaci&#243;n {{ subsanacion.numero_intento }}: {{ subsanacion.resultado ?? 'Pendiente de revisi&#243;n' }}</span>
                            <button v-if="subsanacion.archivo_adjunto" type="button" class="stitch-text-button" :disabled="descargando === `subsanacion-${subsanacion.id_subsanacion_documentaria}`" @click="descargarDocumento(subsanacion.archivo_adjunto, `subsanacion-${subsanacion.id_subsanacion_documentaria}`, `subsanacion-${subsanacion.id_subsanacion_documentaria}`)">Descargar</button>
                            <template v-if="puedeRevisarSubsanacion(observacion, subsanacion)">
                              <button type="button" class="stitch-text-button is-success" :disabled="estaGestionando" @click="revisarSubsanacion(observacion, subsanacion, 'aceptada')">Aceptar</button>
                              <button type="button" class="stitch-text-button is-danger" :disabled="estaGestionando" @click="revisarSubsanacion(observacion, subsanacion, 'rechazada')">Rechazar</button>
                            </template>
                          </div>
                        </article>
                      </div>
                    </template>
                  </article>
                </div>
                <p v-else class="stitch-empty">No hay requisitos activos para esta ronda.</p>
              </section>
            </main>

            <aside class="stitch-review-sidebar">
              <section class="stitch-side-card">
                <header><h3>Archivos adjuntos</h3><span class="material-symbols-outlined" aria-hidden="true">attach_file</span></header>
                <div class="stitch-files-list">
                  <article class="stitch-file-row">
                    <span class="material-symbols-outlined" aria-hidden="true">description</span>
                    <div><strong>Solicitud</strong><small>{{ detalle.solicitud_adjunta ? 'Documento disponible' : 'Sin informaci&#243;n' }}</small></div>
                    <button v-if="detalle.solicitud_adjunta" type="button" :disabled="descargando === 'solicitud'" aria-label="Descargar solicitud" @click="descargarDocumento(detalle.solicitud_adjunta, `solicitud-${detalle.cod_expediente}`, 'solicitud')"><span class="material-symbols-outlined" aria-hidden="true">download</span></button>
                  </article>
                  <article v-for="informe in detalle.informes" :key="informe.id_informe_proyecto_tesis" class="stitch-file-row">
                    <span class="material-symbols-outlined" aria-hidden="true">picture_as_pdf</span>
                    <div><strong>{{ informe.titulo || 'Sin informaci\u00f3n' }}</strong><small>{{ informe.es_tesis ? 'Tesis' : 'Proyecto' }} · Versi&#243;n {{ informe.version ?? 'Sin registrar' }}</small></div>
                    <button v-if="informe.archivo_adjunto" type="button" :disabled="descargando === `informe-${informe.id_informe_proyecto_tesis}`" :aria-label="`Descargar ${informe.titulo}`" @click="descargarDocumento(informe.archivo_adjunto, `informe-${informe.id_informe_proyecto_tesis}`, `informe-${informe.id_informe_proyecto_tesis}`)"><span class="material-symbols-outlined" aria-hidden="true">download</span></button>
                  </article>
                </div>
                <p v-if="!detalle.informes.length && !detalle.solicitud_adjunta" class="stitch-empty">Sin archivos adjuntos.</p>
              </section>

              <section class="stitch-review-status">
                <header><span class="material-symbols-outlined" aria-hidden="true">analytics</span><h3>Estado de la revisi&#243;n</h3></header>
                <div class="stitch-status-line"><span>Estado actual</span><strong>{{ nombreEstado(detalle.estado_actual) }}</strong></div>
                <div class="stitch-status-line"><span>Progreso</span><strong>{{ avanceRevision.evaluados }} de {{ avanceRevision.total }}</strong></div>
                <div class="stitch-progress-track" aria-hidden="true"><span :style="{ width: `${avanceRevision.porcentaje ?? 0}%` }"></span></div>
                <div class="stitch-turnitin-readout"><span>Similitud Turnitin</span><strong>{{ turnitinActual === null ? 'Pendiente' : `${turnitinActual}%` }}</strong></div>
              </section>

              <section class="stitch-side-card stitch-turnitin-form">
                <header><h3>Porcentaje de similitud</h3><span class="material-symbols-outlined" aria-hidden="true">percent</span></header>
                <div>
                  <label>
                    Registrar porcentaje
                    <span class="stitch-percent-input"><input v-model.number="porcentajeTurnitin" type="number" min="0" max="100" step="1" inputmode="numeric" placeholder="0"><span>%</span></span>
                  </label>
                  <p>{{ informeContexto ? `${informeContexto.es_tesis ? 'Tesis' : 'Proyecto'} · Versi\u00f3n ${informeContexto.version ?? 'Sin registrar'}` : 'Sin informe registrado' }}</p>
                </div>
              </section>

              <div class="stitch-flow-actions">
                <button type="button" class="stitch-primary-action" :disabled="!puedeSiguienteEtapa" @click="mostrarConformidad = true"><span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>Siguiente etapa</button>
                <p v-if="turnitinActual !== null && turnitinActual > 50">La similitud debe ser 50% o menor para continuar.</p>
                <p v-else-if="!puedeSiguienteEtapa">La siguiente etapa se habilita cuando todos los requisitos est&#233;n marcados como cumple.</p>
              </div>
            </aside>
          </div>
        </section>
      </template>

      <template v-else>
      <p v-if="mensajeAccion" class="message success-message" role="status">{{ mensajeAccion }}</p>

      <section class="expediente-overview" aria-labelledby="expediente-overview-title">
        <article class="overview-card">
          <div class="overview-meta">
            <span class="status-badge" :class="claseEstado(detalle.estado_actual?.codigo)">
              {{ nombreEstado(detalle.estado_actual) }}
            </span>
            <span class="stage-label">{{ nombreEtapa(detalle.etapa_actual) }}</span>
          </div>

          <div>
            <p class="eyebrow">Expediente {{ detalle.cod_expediente }}</p>
            <h2 id="expediente-overview-title">{{ tituloInforme }}</h2>
            <p class="project-summary">{{ resumenInforme }}</p>
          </div>

          <dl class="overview-details">
            <div>
              <dt>Tesista 1</dt>
              <dd>{{ nombreParticipante(detalle.tesista_1) }}</dd>
            </div>
            <div>
              <dt>Tesista 2</dt>
              <dd>{{ nombreParticipante(detalle.tesista_2) }}</dd>
            </div>
            <div>
              <dt>Asesor</dt>
              <dd>Sin información</dd>
            </div>
            <div>
              <dt>Recibido por UDI</dt>
              <dd>{{ eventoRecepcion ? fechaTexto(eventoRecepcion.fecha_cambio) : 'Pendiente' }}</dd>
            </div>
          </dl>
        </article>

        <aside class="progress-card" aria-label="Estado de la revisión">
          <p class="eyebrow">Semáforo de gestión</p>
          <div class="progress-ring" :class="{ 'is-pending': avanceRevision.porcentaje === null }">
            <strong>{{ avanceRevision.porcentaje === null ? '—' : `${avanceRevision.porcentaje}%` }}</strong>
            <span>{{ avanceRevision.porcentaje === null ? 'Pendiente' : 'Avance' }}</span>
          </div>
          <p class="progress-copy">
            {{ avanceRevision.total ? `${avanceRevision.evaluados} de ${avanceRevision.total} requisitos evaluados` : 'Sin requisitos para calcular avance' }}
          </p>
          <div class="progress-track" aria-hidden="true">
            <span :style="{ width: `${avanceRevision.porcentaje ?? 0}%` }"></span>
          </div>
          <p class="deadline"><span class="material-symbols-outlined" aria-hidden="true">schedule</span> Plazo: Sin información</p>
        </aside>
      </section>

      <section class="action-panel" aria-labelledby="available-actions-title">
        <div>
          <p class="eyebrow">Gestión del flujo</p>
          <h2 id="available-actions-title">Acciones disponibles</h2>
        </div>
        <div class="available-actions">
          <button v-if="puedeRecepcionar" type="button" class="primary-button" :disabled="estaGestionando" @click="ejecutarAccion('recepcion')">
            <span class="material-symbols-outlined" aria-hidden="true">move_to_inbox</span>
            {{ accionEnCurso === 'recepcion' ? 'Recibiendo…' : 'Recibir expediente' }}
          </button>
          <button v-else-if="puedeIniciar" type="button" class="primary-button" :disabled="estaGestionando" @click="ejecutarAccion('iniciar')">
            <span class="material-symbols-outlined" aria-hidden="true">rate_review</span>
            {{ accionEnCurso === 'iniciar' ? 'Iniciando…' : 'Iniciar revisión' }}
          </button>
          <button v-else-if="puedeSolicitarSubsanacion" type="button" class="primary-button" :disabled="estaGestionando" @click="solicitarSubsanacion">
            <span class="material-symbols-outlined" aria-hidden="true">send</span>
            {{ accionEnCurso === 'subsanacion' ? 'Solicitando…' : 'Solicitar subsanación' }}
          </button>
          <button v-else-if="puedeDeclararConformidad" type="button" class="primary-button" :disabled="estaGestionando" @click="declararConformidad">
            <span class="material-symbols-outlined" aria-hidden="true">verified_user</span>
            {{ accionEnCurso === 'conformidad' ? 'Declarando…' : 'Emitir conformidad técnica' }}
          </button>
          <button v-else-if="puedeDerivarDecanatura" type="button" class="primary-button" :disabled="estaGestionando" @click="derivarDecanatura">
            <span class="material-symbols-outlined" aria-hidden="true">forward_to_inbox</span>
            {{ accionEnCurso === 'derivacion' ? 'Derivando…' : 'Derivar a Decanatura' }}
          </button>
          <p v-else class="muted">No hay acciones disponibles para el estado actual.</p>
        </div>
      </section>

      <section class="workspace-card">
        <div class="tabs" role="tablist" aria-label="Secciones de la revisión documentaria">
          <button type="button" role="tab" :aria-selected="seccionActiva === 'revision'" :class="{ 'is-active': seccionActiva === 'revision' }" @click="seccionActiva = 'revision'">Revisión y observación</button>
          <button type="button" role="tab" :aria-selected="seccionActiva === 'observaciones'" :class="{ 'is-active': seccionActiva === 'observaciones' }" @click="seccionActiva = 'observaciones'">Observaciones</button>
          <button type="button" role="tab" :aria-selected="seccionActiva === 'subsanaciones'" :class="{ 'is-active': seccionActiva === 'subsanaciones' }" @click="seccionActiva = 'subsanaciones'">Subsanaciones</button>
          <button type="button" role="tab" :aria-selected="seccionActiva === 'conformidad'" :class="{ 'is-active': seccionActiva === 'conformidad' }" @click="seccionActiva = 'conformidad'">Conformidad</button>
          <button type="button" role="tab" :aria-selected="seccionActiva === 'historial'" :class="{ 'is-active': seccionActiva === 'historial' }" @click="seccionActiva = 'historial'">Historial</button>
        </div>

        <div v-if="seccionActiva === 'revision'" class="tab-content review-layout">
          <div class="review-column">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Ronda {{ revision?.revision?.numero_ronda ?? 'pendiente' }}</p>
                <h2>Checklist de revisión</h2>
              </div>
              <span class="status-badge" :class="claseEstado(detalle.estado_actual?.codigo)">{{ nombreEstado(detalle.estado_actual) }}</span>
            </div>

            <p v-if="revision?.revision === null" class="empty-copy">Inicie la revisión documentaria para habilitar los requisitos.</p>
            <div v-else-if="revision?.revision.requisitos.length" class="requirements-list">
              <article v-for="requisito in revision.revision.requisitos" :key="requisito.id_requisito_documentario" class="requirement-card" :class="{ 'is-inactive': requisito.estado !== 1 }">
                <div class="requirement-heading">
                  <div>
                    <p class="requirement-code">{{ requisito.codigo }}</p>
                    <h3>{{ requisito.nombre }}</h3>
                    <p v-if="requisito.descripcion" class="muted">{{ requisito.descripcion }}</p>
                  </div>
                  <span v-if="requisito.evaluacion" class="evaluation-badge" :class="`is-${requisito.evaluacion.resultado}`">{{ etiquetaResultado(requisito.evaluacion.resultado) }}</span>
                  <span v-else class="evaluation-badge is-pending">Pendiente</span>
                </div>

                <form v-if="puedeEvaluar && requisito.estado === 1" class="evaluation-form" @submit.prevent="guardarEvaluacion(requisito)">
                  <label>
                    <span>Resultado</span>
                    <select v-model="formularioEvaluacion(requisito.id_requisito_documentario).resultado" :disabled="estaGestionando" required>
                      <option value="">Seleccione un resultado</option>
                      <option value="conforme">Conforme</option>
                      <option value="observado">Observado</option>
                      <option value="no_presentado">No presentado</option>
                    </select>
                  </label>
                  <label>
                    <span>Comentario</span>
                    <textarea v-model="formularioEvaluacion(requisito.id_requisito_documentario).comentario" :disabled="estaGestionando" rows="3" placeholder="Comentario opcional"></textarea>
                  </label>
                  <button type="submit" class="outline-button" :disabled="estaGestionando">{{ operacionEnCurso === `evaluacion-${requisito.id_requisito_documentario}` ? 'Guardando…' : 'Guardar evaluación' }}</button>
                </form>

                <template v-if="requisito.evaluacion">
                  <p class="evaluation-meta">Evaluado: {{ fechaTexto(requisito.evaluacion.fecha_evaluacion) }}</p>
                  <p v-if="requisito.evaluacion.comentario" class="comment-box">{{ requisito.evaluacion.comentario }}</p>
                  <p v-if="confirmaciones[`evaluacion-${requisito.id_requisito_documentario}`]" class="inline-success" role="status">{{ confirmaciones[`evaluacion-${requisito.id_requisito_documentario}`] }}</p>

                  <form v-if="puedeRegistrarObservacion(requisito)" class="observation-form" @submit.prevent="registrarObservacion(requisito)">
                    <label>
                      <span>Detalle de la observación</span>
                      <textarea v-model="formularioObservacion(requisito.evaluacion.id_evaluacion_requisito).detalle" :disabled="estaGestionando" rows="3" required placeholder="Indique el detalle que debe revisarse"></textarea>
                    </label>
                    <fieldset :disabled="estaGestionando">
                      <legend>Clasificación</legend>
                      <label><input v-model="formularioObservacion(requisito.evaluacion.id_evaluacion_requisito).es_subsanable" type="radio" :name="`subsanable-${requisito.evaluacion.id_evaluacion_requisito}`" :value="true"> Subsanable</label>
                      <label><input v-model="formularioObservacion(requisito.evaluacion.id_evaluacion_requisito).es_subsanable" type="radio" :name="`subsanable-${requisito.evaluacion.id_evaluacion_requisito}`" :value="false"> No subsanable</label>
                    </fieldset>
                    <button type="submit" class="danger-button" :disabled="estaGestionando">{{ operacionEnCurso === `observacion-${requisito.evaluacion.id_evaluacion_requisito}` ? 'Registrando…' : 'Emitir observación' }}</button>
                  </form>
                </template>
              </article>
            </div>
            <p v-else class="empty-copy">No hay requisitos activos para esta ronda.</p>
          </div>

          <aside class="side-column">
            <section class="side-card">
              <div class="section-heading compact"><h2>Documentos clave</h2><span class="material-symbols-outlined" aria-hidden="true">folder_open</span></div>
              <div class="documents-list">
                <div class="document-item">
                  <span class="material-symbols-outlined" aria-hidden="true">description</span>
                  <div><strong>Solicitud</strong><small>{{ detalle.solicitud_adjunta ? 'Disponible para descarga' : 'Sin información' }}</small></div>
                  <button v-if="detalle.solicitud_adjunta" type="button" class="icon-button" :disabled="descargando === 'solicitud'" aria-label="Descargar solicitud" @click="descargarDocumento(detalle.solicitud_adjunta, `solicitud-${detalle.cod_expediente}`, 'solicitud')"><span class="material-symbols-outlined" aria-hidden="true">download</span></button>
                </div>
                <div v-for="informe in detalle.informes" :key="informe.id_informe_proyecto_tesis" class="document-item">
                  <span class="material-symbols-outlined" aria-hidden="true">picture_as_pdf</span>
                  <div><strong>{{ informe.titulo }}</strong><small>{{ informe.es_tesis ? 'Tesis final' : 'Proyecto' }} · Versión {{ informe.version }}<template v-if="informe.turnitin !== null"> · Turnitin {{ informe.turnitin }}%</template></small></div>
                  <button v-if="informe.archivo_adjunto" type="button" class="icon-button" :disabled="descargando === `informe-${informe.id_informe_proyecto_tesis}`" aria-label="Descargar informe" @click="descargarDocumento(informe.archivo_adjunto, `informe-${informe.id_informe_proyecto_tesis}`, `informe-${informe.id_informe_proyecto_tesis}`)"><span class="material-symbols-outlined" aria-hidden="true">download</span></button>
                </div>
              </div>
              <p v-if="!detalle.informes.length" class="muted">No hay informes registrados.</p>
            </section>

            <section class="side-card">
              <div class="section-heading compact"><h2>Similitud</h2><span class="material-symbols-outlined" aria-hidden="true">analytics</span></div>
              <template v-if="informeContexto">
                <strong class="turnitin-value">{{ informeContexto.turnitin === null ? 'Pendiente' : `${informeContexto.turnitin}%` }}</strong>
                <p class="muted">{{ informeContexto.turnitin === null ? 'Porcentaje sin registrar para el informe seleccionado.' : `${informeContexto.es_tesis ? 'Tesis final' : 'Proyecto'} · Versión ${informeContexto.version}` }}</p>
              </template>
              <p v-else class="muted">Sin informe registrado.</p>
            </section>
          </aside>
        </div>

        <div v-else-if="seccionActiva === 'observaciones'" class="tab-content">
          <div class="section-heading"><div><p class="eyebrow">Seguimiento de requisitos</p><h2>Observaciones emitidas</h2></div><span class="status-badge" :class="claseEstado(detalle.estado_actual?.codigo)">{{ nombreEstado(detalle.estado_actual) }}</span></div>
          <div v-if="observaciones.length" class="observation-list">
            <article v-for="item in observaciones" :key="item.observacion.id_observacion_documentaria" class="observation-card">
              <div class="observation-card-heading"><div><p class="requirement-code">{{ item.requisito.codigo }}</p><h3>{{ item.requisito.nombre }}</h3></div><span class="evaluation-badge" :class="item.observacion.estado === 'cerrada' ? 'is-conforme' : item.observacion.estado === 'en_subsanacion' ? 'is-pending' : 'is-observado'">{{ item.observacion.estado === 'cerrada' ? 'Cerrada' : item.observacion.estado === 'en_subsanacion' ? 'En subsanación' : 'Pendiente' }}</span></div>
              <p>{{ item.observacion.detalle }}</p>
              <p class="muted">{{ item.observacion.es_subsanable ? 'Subsanable' : 'No subsanable' }} · Emitida {{ fechaTexto(item.observacion.fecha_emision) }}</p>
            </article>
          </div>
          <p v-else class="empty-copy">No hay observaciones registradas en la ronda actual.</p>
        </div>

        <div v-else-if="seccionActiva === 'subsanaciones'" class="tab-content">
          <div class="section-heading"><div><p class="eyebrow">Documentos presentados por Tesista</p><h2>Subsanaciones</h2></div></div>
          <div v-if="observaciones.length" class="subsanation-list">
            <article v-for="item in observaciones" :key="item.observacion.id_observacion_documentaria" class="subsanation-card">
              <h3>{{ item.requisito.codigo }} · {{ item.requisito.nombre }}</h3>
              <p class="muted">{{ item.observacion.detalle }}</p>
              <div v-if="item.observacion.subsanaciones.length" class="attempt-list">
                <div v-for="subsanacion in item.observacion.subsanaciones" :key="subsanacion.id_subsanacion_documentaria" class="attempt-item">
                  <div><strong>Intento {{ subsanacion.numero_intento }}</strong><p>Resultado: {{ subsanacion.resultado ?? 'Pendiente de revisión' }}</p><p>Presentado: {{ fechaTexto(subsanacion.fecha_presentacion) }}</p><p v-if="subsanacion.detalle">{{ subsanacion.detalle }}</p></div>
                  <div class="attempt-actions">
                    <button v-if="subsanacion.archivo_adjunto" type="button" class="outline-button" :disabled="descargando === `subsanacion-${subsanacion.id_subsanacion_documentaria}`" @click="descargarDocumento(subsanacion.archivo_adjunto, `subsanacion-${subsanacion.id_subsanacion_documentaria}`, `subsanacion-${subsanacion.id_subsanacion_documentaria}`)"><span class="material-symbols-outlined" aria-hidden="true">download</span> Descargar</button>
                    <template v-if="puedeRevisarSubsanacion(item.observacion, subsanacion)"><button type="button" class="primary-button" :disabled="estaGestionando" @click="revisarSubsanacion(item.observacion, subsanacion, 'aceptada')">{{ operacionEnCurso === `subsanacion-${subsanacion.id_subsanacion_documentaria}` ? 'Guardando…' : 'Aceptar' }}</button><button type="button" class="danger-button" :disabled="estaGestionando" @click="revisarSubsanacion(item.observacion, subsanacion, 'rechazada')">Rechazar</button></template>
                  </div>
                </div>
              </div>
              <p v-else class="empty-copy">No hay subsanaciones presentadas.</p>
            </article>
          </div>
          <p v-else class="empty-copy">No hay observaciones con subsanaciones para mostrar.</p>
        </div>

        <div v-else-if="seccionActiva === 'conformidad'" class="tab-content conformity-view">
          <nav class="conformity-breadcrumb" aria-label="Ubicación de la revisión">
            <span>Gestión académica</span>
            <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            <span>Expediente {{ detalle.cod_expediente }}</span>
            <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            <strong>Emisión de conformidad</strong>
          </nav>

          <div class="conformity-layout">
            <div class="conformity-checklist-column">
              <section class="conformity-table-card">
                <header class="conformity-card-heading">
                  <h2>Checklist final de revisión</h2>
                  <span class="conformity-status" :class="{ 'is-ready': puedeDeclararConformidad || detalle.estado_actual?.codigo === 'conforme' }">
                    {{ puedeDeclararConformidad || detalle.estado_actual?.codigo === 'conforme' ? 'Estado: apto' : `Estado: ${nombreEstado(detalle.estado_actual)}` }}
                  </span>
                </header>
                <div class="table-wrapper">
                  <table>
                    <thead><tr><th>Requisito</th><th>Estado</th><th>Observaciones</th></tr></thead>
                    <tbody>
                      <tr v-for="requisito in revision?.revision?.requisitos ?? []" :key="requisito.id_requisito_documentario">
                        <td><strong>{{ requisito.nombre }}</strong><span>{{ requisito.codigo }}</span></td>
                        <td><span class="evaluation-badge" :class="`is-${requisito.evaluacion?.resultado ?? 'pending'}`"><span class="material-symbols-outlined" aria-hidden="true">{{ requisito.evaluacion?.resultado === 'conforme' ? 'check_circle' : requisito.evaluacion?.resultado === 'observado' ? 'error' : 'pending' }}</span>{{ etiquetaResultado(requisito.evaluacion?.resultado) }}</span></td>
                        <td>{{ requisito.evaluacion?.observaciones.length ? `${requisito.evaluacion.observaciones.length} registrada(s)` : 'Sin observaciones pendientes' }}</td>
                      </tr>
                      <tr>
                        <td><strong>Informe de similitud (Turnitin)</strong><span>{{ informeContexto ? `${informeContexto.es_tesis ? 'Tesis final' : 'Proyecto'} · Versión ${informeContexto.version}` : 'Sin informe registrado' }}</span></td>
                        <td><span class="evaluation-badge" :class="informeContexto?.turnitin === null || !informeContexto ? 'is-pending' : 'is-conforme'"><span class="material-symbols-outlined" aria-hidden="true">{{ informeContexto?.turnitin === null || !informeContexto ? 'pending' : 'check_circle' }}</span>{{ informeContexto?.turnitin === null || !informeContexto ? 'Pendiente' : `${informeContexto.turnitin}%` }}</span></td>
                        <td>{{ informeContexto?.turnitin === null || !informeContexto ? 'Sin registrar' : 'Porcentaje registrado' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section class="documentation-status" :class="{ 'is-ready': puedeDeclararConformidad || detalle.estado_actual?.codigo === 'conforme' }">
                <span class="material-symbols-outlined" aria-hidden="true">verified</span>
                <div>
                  <h2>Estado de documentación</h2>
                  <p>{{ detalle.estado_actual?.codigo === 'conforme' ? 'La revisión documentaria fue cerrada como conforme. No existen bloqueos técnicos pendientes.' : puedeDeclararConformidad ? 'Todos los requisitos activos están conformes y no existen observaciones abiertas.' : 'La conformidad estará disponible cuando todos los requisitos activos estén conformes y no existan observaciones abiertas.' }}</p>
                </div>
              </section>
            </div>

            <aside class="conformity-form-card">
              <h2>Formulario de conformidad</h2>
              <form @submit.prevent>
                <label>
                  Código de conformidad
                  <span class="input-with-icon"><span class="material-symbols-outlined" aria-hidden="true">tag</span><input value="Pendiente" disabled></span>
                </label>
                <div class="conformity-dates">
                  <label>Fecha de emisión<input type="date" :value="fechaCierreRevision?.slice(0, 10) ?? ''" disabled></label>
                  <label>Hora registro<input type="time" :value="fechaCierreRevision?.slice(11, 16) ?? ''" disabled></label>
                </div>
                <label>
                  Responsable técnico
                  <select disabled><option>Sin registrar</option></select>
                </label>
                <div class="acta-field">
                  <span>Acta de conformidad técnica (PDF)</span>
                  <div class="acta-dropzone" aria-disabled="true">
                    <span class="material-symbols-outlined" aria-hidden="true">upload_file</span>
                    <strong>Sin acta registrada</strong>
                    <small>La carga de acta aún no está disponible.</small>
                  </div>
                </div>
                <button v-if="puedeDeclararConformidad" type="button" class="conformity-primary-action" :disabled="estaGestionando" @click="declararConformidad"><span class="material-symbols-outlined" aria-hidden="true">verified_user</span>{{ accionEnCurso === 'conformidad' ? 'Declarando…' : 'Emitir conformidad técnica' }}</button>
                <button v-else-if="puedeDerivarDecanatura" type="button" class="conformity-primary-action" :disabled="estaGestionando" @click="derivarDecanatura"><span class="material-symbols-outlined" aria-hidden="true">forward_to_inbox</span>{{ accionEnCurso === 'derivacion' ? 'Derivando…' : 'Derivar a Decanatura' }}</button>
                <button v-else type="button" class="conformity-primary-action" disabled><span class="material-symbols-outlined" aria-hidden="true">verified_user</span>Emitir conformidad técnica</button>
              </form>
            </aside>
          </div>
        </div>

        <div v-else class="tab-content history-layout">
          <section><div class="section-heading"><div><p class="eyebrow">Trazabilidad del expediente</p><h2>Historial de movimientos</h2></div></div><ol v-if="detalle.historial.length" class="timeline"><li v-for="evento in detalle.historial" :key="evento.id_historial"><span class="timeline-dot"></span><div><strong>{{ evento.accion_realizada }}</strong><p>{{ fechaTexto(evento.fecha_cambio) }}</p><p class="muted">{{ evento.responsable?.nombre ?? 'Sistema' }}</p></div></li></ol><p v-else class="empty-copy">No hay movimientos registrados.</p></section>
          <aside class="rounds-card"><h2>Rondas de revisión</h2><ol v-if="revision?.rondas.length" class="round-list"><li v-for="ronda in revision.rondas" :key="ronda.id_revision_documentaria"><strong>Ronda {{ ronda.numero_ronda }}</strong><span>Inicio: {{ fechaTexto(ronda.fecha_inicio) }}</span><span>Cierre: {{ fechaTexto(ronda.fecha_cierre) }}</span><span>Resultado: {{ ronda.resultado_final ?? 'Pendiente' }}</span></li></ol><p v-else class="empty-copy">No se inició una ronda.</p></aside>
        </div>
      </section>
      </template>
    </template>
  </section>

  <section v-if="detalle && revision" class="legacy-view" aria-hidden="true">
    <div class="heading">
      <div>
        <h1>Revisión documentaria UDI</h1>
        <p v-if="detalle">Expediente {{ detalle.cod_expediente }}</p>
      </div>
      <div class="actions">
        <button type="button" :disabled="cargando" @click="cargarInformacion">
          {{ cargando ? 'Actualizando…' : 'Actualizar' }}
        </button>
        <button type="button" class="secondary" @click="router.push({ name: 'udi-expedientes' })">
          Volver a la bandeja
        </button>
      </div>
    </div>

    <p v-if="mensajeError" class="error" role="alert">{{ mensajeError }}</p>
    <p v-if="mensajeAccion" class="success" role="status">{{ mensajeAccion }}</p>

    <p v-if="cargando" class="status">Cargando revisión documentaria…</p>

    <div v-else-if="detalle === null" class="status">El expediente no contiene información de detalle.</div>

    <template v-else>
      <div class="summary-grid">
        <section class="card">
          <h2>Estado actual</h2>
          <dl>
            <div>
              <dt>Etapa</dt>
              <dd>{{ nombreEtapa(detalle.etapa_actual) }}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{{ nombreEstado(detalle.estado_actual) }}</dd>
            </div>
            <div>
              <dt>Tesista 1</dt>
              <dd>{{ nombreParticipante(detalle.tesista_1) }}</dd>
            </div>
            <div>
              <dt>Tesista 2</dt>
              <dd>{{ nombreParticipante(detalle.tesista_2) }}</dd>
            </div>
          </dl>
        </section>

        <section class="card">
          <h2>Acciones disponibles</h2>
          <button
            v-if="puedeRecepcionar"
            type="button"
            :disabled="estaGestionando"
            @click="ejecutarAccion('recepcion')"
          >
            {{ accionEnCurso === 'recepcion' ? 'Recibiendo…' : 'Recibir expediente' }}
          </button>
          <button
            v-else-if="puedeIniciar"
            type="button"
            :disabled="estaGestionando"
            @click="ejecutarAccion('iniciar')"
          >
            {{ accionEnCurso === 'iniciar' ? 'Iniciando…' : 'Iniciar revisión' }}
          </button>
          <button
            v-else-if="puedeSolicitarSubsanacion"
            type="button"
            :disabled="estaGestionando"
            @click="solicitarSubsanacion"
          >
            {{ accionEnCurso === 'subsanacion' ? 'Solicitando…' : 'Solicitar subsanación' }}
          </button>
          <button
            v-else-if="puedeDeclararConformidad"
            type="button"
            :disabled="estaGestionando"
            @click="declararConformidad"
          >
            {{ accionEnCurso === 'conformidad' ? 'Declarando…' : 'Declarar conformidad' }}
          </button>
          <button
            v-else-if="puedeDerivarDecanatura"
            type="button"
            :disabled="estaGestionando"
            @click="derivarDecanatura"
          >
            {{ accionEnCurso === 'derivacion' ? 'Derivando…' : 'Derivar a Decanatura' }}
          </button>
          <p v-else class="muted">No hay acciones de revisión disponibles para el estado actual.</p>
        </section>
      </div>

      <section class="card section">
        <h2>Solicitud e informes</h2>
        <div class="documents">
          <div>
            <strong>Solicitud</strong>
            <button
              v-if="detalle.solicitud_adjunta"
              type="button"
              :disabled="descargando === 'solicitud'"
              @click="descargarDocumento(detalle.solicitud_adjunta, `solicitud-${detalle.cod_expediente}`, 'solicitud')"
            >
              {{ descargando === 'solicitud' ? 'Descargando…' : 'Descargar solicitud' }}
            </button>
            <p v-else class="muted">No hay solicitud disponible.</p>
          </div>
          <div v-for="informe in detalle.informes" :key="informe.id_informe_proyecto_tesis">
            <strong>{{ informe.titulo }}</strong>
            <p class="muted">{{ informe.es_tesis ? 'Tesis final' : 'Proyecto' }} · Versión {{ informe.version }}</p>
            <button
              v-if="informe.archivo_adjunto"
              type="button"
              :disabled="descargando === `informe-${informe.id_informe_proyecto_tesis}`"
              @click="
                descargarDocumento(
                  informe.archivo_adjunto,
                  `informe-${informe.id_informe_proyecto_tesis}`,
                  `informe-${informe.id_informe_proyecto_tesis}`,
                )
              "
            >
              {{ descargando === `informe-${informe.id_informe_proyecto_tesis}` ? 'Descargando…' : 'Descargar informe' }}
            </button>
            <p v-else class="muted">No hay documento disponible.</p>
          </div>
        </div>
        <p v-if="!detalle.informes.length" class="muted">No hay informes registrados.</p>
      </section>

      <section class="card section">
        <h2>Rondas</h2>
        <ol v-if="revision?.rondas.length" class="rounds">
          <li v-for="ronda in revision.rondas" :key="ronda.id_revision_documentaria">
            <strong>Ronda {{ ronda.numero_ronda }}</strong>
            <span>Inicio: {{ fechaTexto(ronda.fecha_inicio) }}</span>
            <span>Cierre: {{ fechaTexto(ronda.fecha_cierre) }}</span>
            <span>Resultado: {{ ronda.resultado_final ?? 'Pendiente' }}</span>
          </li>
        </ol>
        <p v-else class="muted">No se ha iniciado una ronda de revisión documentaria.</p>
      </section>

      <section class="card section">
        <h2>Requisitos, evaluaciones y observaciones</h2>
        <p v-if="revision?.revision === null" class="muted">No hay una revisión documentaria para consultar.</p>
        <ul v-else-if="revision?.revision.requisitos.length" class="requirements">
          <li v-for="requisito in revision.revision.requisitos" :key="requisito.id_requisito_documentario">
            <div>
              <strong>{{ requisito.codigo }} · {{ requisito.nombre }}</strong>
              <p v-if="requisito.descripcion" class="muted">{{ requisito.descripcion }}</p>
            </div>

            <form v-if="puedeEvaluar" class="review-form" @submit.prevent="guardarEvaluacion(requisito)">
              <label>
                Resultado
                <select v-model="formularioEvaluacion(requisito.id_requisito_documentario).resultado" :disabled="estaGestionando" required>
                  <option value="">Seleccione un resultado</option>
                  <option value="conforme">Conforme</option>
                  <option value="observado">Observado</option>
                  <option value="no_presentado">No presentado</option>
                </select>
              </label>
              <label>
                Comentario (opcional)
                <textarea
                  v-model="formularioEvaluacion(requisito.id_requisito_documentario).comentario"
                  :disabled="estaGestionando"
                  rows="3"
                ></textarea>
              </label>
              <button type="submit" :disabled="estaGestionando">
                {{ operacionEnCurso === `evaluacion-${requisito.id_requisito_documentario}` ? 'Guardando…' : 'Guardar evaluación' }}
              </button>
            </form>
            <p v-if="confirmaciones[`evaluacion-${requisito.id_requisito_documentario}`]" class="inline-success" role="status">
              {{ confirmaciones[`evaluacion-${requisito.id_requisito_documentario}`] }}
            </p>

            <template v-if="requisito.evaluacion">
              <p>
                Evaluación: {{ requisito.evaluacion.resultado }} ·
                {{ fechaTexto(requisito.evaluacion.fecha_evaluacion) }}
              </p>
              <p v-if="requisito.evaluacion.comentario">Comentario: {{ requisito.evaluacion.comentario }}</p>
              <p
                v-if="confirmaciones[`observacion-${requisito.evaluacion.id_evaluacion_requisito}`]"
                class="inline-success"
                role="status"
              >
                {{ confirmaciones[`observacion-${requisito.evaluacion.id_evaluacion_requisito}`] }}
              </p>

              <ul v-if="requisito.evaluacion.observaciones.length" class="observations">
                <li v-for="observacion in requisito.evaluacion.observaciones" :key="observacion.id_observacion_documentaria">
                  <strong>Observación</strong>
                  <p>{{ observacion.detalle }}</p>
                  <p class="muted">
                    {{ observacion.es_subsanable ? 'Subsanable' : 'No subsanable' }} · {{ observacion.estado }}
                  </p>

                  <ul v-if="observacion.subsanaciones.length" class="subsanations">
                    <li v-for="subsanacion in observacion.subsanaciones" :key="subsanacion.id_subsanacion_documentaria">
                      <strong>Intento {{ subsanacion.numero_intento }}</strong>
                      <p>Observación relacionada: {{ observacion.detalle }}</p>
                      <p>Resultado: {{ subsanacion.resultado ?? 'Pendiente de revisión' }}</p>
                      <p>Presentado: {{ fechaTexto(subsanacion.fecha_presentacion) }}</p>
                      <p v-if="subsanacion.detalle">Detalle del Tesista: {{ subsanacion.detalle }}</p>
                      <p v-else class="muted">El Tesista no registró un detalle adicional.</p>
                      <button
                        v-if="subsanacion.archivo_adjunto"
                        type="button"
                        :disabled="descargando === `subsanacion-${subsanacion.id_subsanacion_documentaria}`"
                        @click="
                          descargarDocumento(
                            subsanacion.archivo_adjunto,
                            `subsanacion-${subsanacion.id_subsanacion_documentaria}`,
                            `subsanacion-${subsanacion.id_subsanacion_documentaria}`,
                          )
                        "
                      >
                        {{
                          descargando === `subsanacion-${subsanacion.id_subsanacion_documentaria}`
                            ? 'Descargando…'
                            : 'Descargar archivo adjunto'
                        }}
                      </button>
                      <p v-else class="muted">No hay archivo adjunto disponible.</p>
                      <p
                        v-if="confirmaciones[`subsanacion-${subsanacion.id_subsanacion_documentaria}`]"
                        class="inline-success"
                        role="status"
                      >
                        {{ confirmaciones[`subsanacion-${subsanacion.id_subsanacion_documentaria}`] }}
                      </p>
                      <div v-if="puedeRevisarSubsanacion(observacion, subsanacion)" class="subsanation-actions">
                        <button
                          type="button"
                          :disabled="estaGestionando"
                          @click="revisarSubsanacion(observacion, subsanacion, 'aceptada')"
                        >
                          {{ operacionEnCurso === `subsanacion-${subsanacion.id_subsanacion_documentaria}` ? 'Guardando…' : 'Aceptar' }}
                        </button>
                        <button
                          type="button"
                          class="reject"
                          :disabled="estaGestionando"
                          @click="revisarSubsanacion(observacion, subsanacion, 'rechazada')"
                        >
                          Rechazar
                        </button>
                      </div>
                    </li>
                  </ul>
                  <p v-else class="muted">No hay subsanaciones presentadas.</p>
                </li>
              </ul>
              <p v-else class="muted">Sin observaciones.</p>

              <form v-if="puedeRegistrarObservacion(requisito)" class="review-form" @submit.prevent="registrarObservacion(requisito)">
                <label>
                  Detalle de la observación
                  <textarea
                    v-model="formularioObservacion(requisito.evaluacion.id_evaluacion_requisito).detalle"
                    :disabled="estaGestionando"
                    rows="3"
                    required
                  ></textarea>
                </label>
                <fieldset :disabled="estaGestionando">
                  <legend>Clasificación</legend>
                  <label>
                    <input
                      v-model="formularioObservacion(requisito.evaluacion.id_evaluacion_requisito).es_subsanable"
                      type="radio"
                      :name="`subsanable-${requisito.evaluacion.id_evaluacion_requisito}`"
                      :value="true"
                    >
                    Subsanable
                  </label>
                  <label>
                    <input
                      v-model="formularioObservacion(requisito.evaluacion.id_evaluacion_requisito).es_subsanable"
                      type="radio"
                      :name="`subsanable-${requisito.evaluacion.id_evaluacion_requisito}`"
                      :value="false"
                    >
                    No subsanable
                  </label>
                </fieldset>
                <button type="submit" :disabled="estaGestionando">
                  {{
                    operacionEnCurso === `observacion-${requisito.evaluacion.id_evaluacion_requisito}`
                      ? 'Registrando…'
                      : 'Registrar observación'
                  }}
                </button>
              </form>
            </template>
            <p v-else class="muted">Sin evaluación registrada.</p>
          </li>
        </ul>
        <p v-else-if="revision?.revision" class="muted">No hay requisitos activos para esta ronda.</p>
      </section>
    </template>
  </section>
</template>

<style scoped>
.heading,
.actions,
.documents,
.filter-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.heading {
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

h1,
h2,
p,
dl {
  margin-top: 0;
}

.heading p,
.status,
.muted,
dt {
  color: #6b7280;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.card {
  padding: 1.25rem;
  background: #fff;
  border-radius: 6px;
}

.section {
  margin-top: 1rem;
}

dl {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 0;
}

dt {
  font-size: 0.85rem;
}

dd {
  margin: 0.2rem 0 0;
}

button {
  padding: 0.55rem 0.8rem;
  color: #fff;
  cursor: pointer;
  background: #534caf;
  border: 0;
  border-radius: 4px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.review-form {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  margin-top: 0.75rem;
  background: #f9fafb;
  border-radius: 4px;
}

.review-form > label {
  display: grid;
  gap: 0.35rem;
  color: #374151;
}

select,
textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem;
  border: 1px solid #9ca3af;
  border-radius: 4px;
  font: inherit;
}

fieldset {
  display: flex;
  gap: 1rem;
  padding: 0;
  border: 0;
}

fieldset label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

legend {
  margin-bottom: 0.35rem;
  color: #374151;
}

.inline-success {
  padding: 0.65rem 0.8rem;
  color: #047857;
  background: #ecfdf5;
  border-radius: 4px;
}

.secondary {
  color: #1f2937;
  background: #e5e7eb;
}

.reject {
  background: #b91c1c;
}

.subsanation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.error,
.success {
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 4px;
}

.error {
  color: #991b1b;
  background: #fef2f2;
}

.success {
  color: #047857;
  background: #ecfdf5;
}

.documents,
.rounds,
.requirements,
.observations,
.subsanations {
  align-items: stretch;
  flex-direction: column;
}

.documents {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.documents > div,
.requirements > li,
.observations > li,
.subsanations > li {
  padding: 0.9rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.rounds,
.requirements,
.observations,
.subsanations {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 0;
}

.rounds li,
.observations li,
.subsanations li {
  display: grid;
  gap: 0.3rem;
}

.requirements {
  padding-left: 1.25rem;
}

.observations,
.subsanations {
  margin-top: 0.75rem;
  padding-left: 1.25rem;
}

.documents p,
.requirements p,
.observations p,
.subsanations p {
  margin: 0.35rem 0;
}

@media (max-width: 600px) {
  .heading,
  .actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>

<style scoped>
.conformity-view {
  display: grid;
  gap: var(--siset-space-6);
}

.conformity-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--siset-space-2);
  color: var(--siset-color-text-muted);
  font-size: 0.875rem;
}

.conformity-breadcrumb .material-symbols-outlined {
  font-size: 1rem;
}

.conformity-breadcrumb strong {
  color: var(--siset-color-primary);
}

.conformity-view .conformity-layout {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  gap: var(--siset-space-6);
}

.conformity-checklist-column {
  display: grid;
  align-content: start;
  gap: var(--siset-space-6);
}

.conformity-view .conformity-table-card,
.conformity-form-card {
  overflow: hidden;
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-xl);
  box-shadow: var(--siset-shadow-sm);
}

.conformity-card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--siset-space-3);
  padding: var(--siset-space-4) var(--siset-space-6);
  background: var(--siset-color-surface-muted);
  border-bottom: 1px solid var(--siset-color-border);
}

.conformity-card-heading h2,
.conformity-form-card h2 {
  margin: 0;
  font-size: 1.125rem;
}

.conformity-status {
  display: inline-flex;
  align-items: center;
  padding: var(--siset-space-1) var(--siset-space-3);
  color: var(--siset-color-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-xl);
}

.conformity-status.is-ready {
  color: var(--siset-color-secondary);
  background: var(--siset-color-secondary-container);
  border-color: var(--siset-color-secondary);
}

.conformity-view .table-wrapper {
  border: 0;
  border-radius: 0;
}

.conformity-view .conformity-table-card table {
  min-width: 35rem;
}

.conformity-view .conformity-table-card th {
  padding: var(--siset-space-3) var(--siset-space-6);
  color: var(--siset-color-text-muted);
  font-size: 0.75rem;
  background: var(--siset-color-surface-muted);
}

.conformity-view .conformity-table-card td {
  padding: var(--siset-space-4) var(--siset-space-6);
}

.conformity-view .evaluation-badge .material-symbols-outlined {
  font-size: 1rem;
}

.documentation-status {
  display: flex;
  align-items: flex-start;
  gap: var(--siset-space-4);
  padding: var(--siset-space-6);
  color: var(--siset-color-text-muted);
  background: var(--siset-color-surface-muted);
  border-left: var(--siset-space-1) solid var(--siset-color-border-strong);
  border-radius: 0 var(--siset-radius-xl) var(--siset-radius-xl) 0;
}

.documentation-status.is-ready {
  color: var(--siset-color-secondary);
  background: color-mix(in srgb, var(--siset-color-secondary-container) 28%, var(--siset-color-surface));
  border-left-color: var(--siset-color-secondary);
}

.documentation-status > .material-symbols-outlined {
  flex: 0 0 auto;
  font-size: 2rem;
}

.documentation-status h2,
.documentation-status p {
  color: inherit;
}

.documentation-status p {
  margin-top: var(--siset-space-1) !important;
}

.conformity-form-card {
  display: grid;
  align-content: start;
  gap: var(--siset-space-5);
  padding: var(--siset-space-6);
}

.conformity-form-card form {
  display: grid;
  gap: var(--siset-space-5);
}

.conformity-form-card label,
.acta-field {
  display: grid;
  gap: var(--siset-space-2);
  color: var(--siset-color-text-muted);
  font-size: 0.875rem;
  font-weight: 700;
}

.conformity-form-card input,
.conformity-form-card select {
  width: 100%;
  min-height: var(--siset-space-10);
  padding: var(--siset-space-2) var(--siset-space-3);
  color: var(--siset-color-text-muted);
  background: var(--siset-color-surface-muted);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-lg);
}

.conformity-form-card input:disabled,
.conformity-form-card select:disabled {
  cursor: not-allowed;
  opacity: 1;
}

.input-with-icon {
  position: relative;
}

.input-with-icon .material-symbols-outlined {
  position: absolute;
  top: 50%;
  left: var(--siset-space-3);
  color: var(--siset-color-text-muted);
  transform: translateY(-50%);
}

.input-with-icon input {
  padding-left: var(--siset-space-10);
  color: var(--siset-color-primary);
  font-weight: 700;
}

.conformity-dates {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--siset-space-4);
}

.acta-dropzone {
  display: grid;
  min-height: 11rem;
  place-content: center;
  gap: var(--siset-space-2);
  padding: var(--siset-space-5);
  color: var(--siset-color-text-muted);
  text-align: center;
  background: var(--siset-color-surface-muted);
  border: 2px dashed var(--siset-color-border);
  border-radius: var(--siset-radius-xl);
  cursor: pointer;
}

.acta-dropzone.is-dragging {
  color: var(--siset-color-primary);
  background: var(--siset-color-surface);
  border-color: var(--siset-color-primary);
}

.acta-dropzone .material-symbols-outlined {
  justify-self: center;
  font-size: 2.5rem;
}

.acta-dropzone strong {
  color: var(--siset-color-text);
}

.acta-dropzone small {
  font-weight: 400;
}

.acta-file-chip {
  display: inline-flex;
  align-items: center;
  justify-self: center;
  gap: var(--siset-space-1);
  max-width: 100%;
  padding: var(--siset-space-1) var(--siset-space-3);
  overflow: hidden;
  color: var(--siset-color-primary);
  font-size: 0.75rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: var(--siset-color-primary-container);
  border-radius: var(--siset-radius-xl);
}

.acta-file-chip .material-symbols-outlined {
  font-size: 1rem;
}

.acta-error {
  color: var(--siset-color-error);
  font-size: 0.75rem;
}

.conformity-primary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--siset-space-3);
  min-height: 3.5rem;
  color: var(--siset-color-surface);
  font-family: var(--siset-font-heading);
  font-size: 1rem;
  font-weight: 700;
  background: var(--siset-color-primary);
  border: 1px solid var(--siset-color-primary);
  border-radius: var(--siset-radius-xl);
  box-shadow: var(--siset-shadow-sm);
}

.conformity-primary-action:hover:not(:disabled) {
  background: var(--siset-color-primary-container);
  border-color: var(--siset-color-primary-container);
}

.conformity-primary-action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.conformity-observations {
  display: grid;
  gap: var(--siset-space-1);
  padding: 0;
  margin: 0;
  color: var(--siset-color-text-muted);
  list-style: none;
}

.conformity-page {
  width: 100%;
}

.udi-revision:has(.conformity-page) {
  gap: var(--siset-space-4);
}

.udi-revision:has(.conformity-page) .revision-heading {
  min-height: 0;
  padding-bottom: var(--siset-space-1);
}

.udi-revision:has(.conformity-page) .revision-heading h1 {
  font-size: 1.25rem;
  line-height: 1.2;
}

.udi-revision:has(.conformity-page) .revision-heading .intro {
  display: none;
}

@media (max-width: 64rem) {
  .conformity-view .conformity-layout {
    grid-template-columns: 1fr;
  }

  .conformity-form-card {
    position: static;
  }
}

@media (max-width: 48rem) {
  .conformity-card-heading {
    align-items: flex-start;
    flex-direction: column;
    padding: var(--siset-space-4);
  }

  .conformity-view .conformity-table-card th,
  .conformity-view .conformity-table-card td,
  .conformity-form-card {
    padding: var(--siset-space-4);
  }

  .conformity-dates {
    grid-template-columns: 1fr;
  }
}
</style>

<style scoped>
.legacy-view {
  display: none;
}

.udi-revision {
  display: grid;
  width: 100%;
  gap: var(--siset-space-6);
}

.udi-revision h1,
.udi-revision h2,
.udi-revision h3,
.udi-revision p,
.udi-revision dl,
.udi-revision ol {
  margin: 0;
}

.revision-heading,
.heading-actions,
.overview-meta,
.section-heading,
.requirement-heading,
.observation-card-heading,
.action-panel,
.available-actions,
.attempt-actions,
.document-item,
.deadline {
  display: flex;
  align-items: center;
  gap: var(--siset-space-3);
}

.revision-heading,
.section-heading,
.action-panel {
  justify-content: space-between;
}

.revision-heading {
  gap: var(--siset-space-4);
}

.udi-revision h1,
.udi-revision h2,
.udi-revision h3 {
  color: var(--siset-color-primary);
}

.udi-revision h1 {
  font-size: clamp(1.75rem, 3vw, 2.25rem);
}

.udi-revision h2 {
  font-size: 1.25rem;
}

.udi-revision h3 {
  font-size: 1rem;
}

.eyebrow,
.requirement-code {
  color: var(--siset-color-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.intro,
.muted,
.project-summary,
.progress-copy,
.deadline,
.empty-copy,
.evaluation-meta,
.attempt-item p,
.timeline p,
.round-list span,
.document-item small {
  color: var(--siset-color-text-muted);
}

.intro {
  margin-top: var(--siset-space-1) !important;
}

.heading-actions,
.available-actions,
.attempt-actions {
  flex-wrap: wrap;
}

.primary-button,
.outline-button,
.danger-button,
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--siset-space-2);
  min-height: var(--siset-space-10);
  padding: var(--siset-space-2) var(--siset-space-4);
  font-weight: 700;
  border-radius: var(--siset-radius-lg);
}

.primary-button {
  color: var(--siset-color-surface);
  background: var(--siset-color-primary);
  border: 1px solid var(--siset-color-primary);
}

.primary-button:hover {
  background: var(--siset-color-primary-container);
  border-color: var(--siset-color-primary-container);
}

.outline-button {
  color: var(--siset-color-primary);
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border-strong);
}

.outline-button:hover,
.icon-button:hover {
  background: var(--siset-color-surface-muted);
}

.danger-button {
  color: var(--siset-color-surface);
  background: var(--siset-color-error);
  border: 1px solid var(--siset-color-error);
}

.icon-button {
  flex: 0 0 auto;
  min-width: var(--siset-space-10);
  padding: var(--siset-space-2);
  color: var(--siset-color-primary);
  background: transparent;
  border: 1px solid transparent;
}

.primary-button:disabled,
.outline-button:disabled,
.danger-button:disabled,
.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.interface-state,
.expediente-overview,
.workspace-card,
.action-panel {
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-xl);
  box-shadow: var(--siset-shadow-sm);
}

.interface-state {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--siset-space-4);
  min-height: 11rem;
  padding: var(--siset-space-6);
  color: var(--siset-color-text-muted);
  background: var(--siset-color-surface-muted);
}

.interface-state h2,
.error-state h2 {
  color: inherit;
}

.interface-state .primary-button {
  margin-top: var(--siset-space-3);
}

.state-icon {
  color: var(--siset-color-primary);
  font-size: 2rem;
}

.error-state {
  color: var(--siset-color-error);
  background: var(--siset-color-error-container);
  border-color: var(--siset-color-error);
}

.message {
  padding: var(--siset-space-4);
  border-radius: var(--siset-radius-lg);
}

.success-message {
  color: var(--siset-color-success);
  background: var(--siset-color-success-container);
  border: 1px solid var(--siset-color-success);
}

.expediente-overview {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(16rem, 1fr);
  overflow: hidden;
}

.overview-card,
.progress-card {
  display: grid;
  align-content: start;
  gap: var(--siset-space-5);
  padding: var(--siset-space-6);
}

.progress-card {
  justify-items: center;
  text-align: center;
  background: var(--siset-color-surface-muted);
  border-left: 1px solid var(--siset-color-border);
}

.overview-meta {
  flex-wrap: wrap;
}

.stage-label {
  color: var(--siset-color-text-muted);
  font-size: 0.875rem;
  font-weight: 700;
}

.project-summary {
  max-width: 60rem;
  margin-top: var(--siset-space-2) !important;
}

.overview-details {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--siset-space-4);
  padding-top: var(--siset-space-4);
  border-top: 1px solid var(--siset-color-border);
}

.overview-details dt {
  color: var(--siset-color-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.overview-details dd {
  margin: var(--siset-space-1) 0 0;
  color: var(--siset-color-text);
  font-weight: 700;
}

.status-badge,
.evaluation-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--siset-space-2);
  width: fit-content;
  padding: var(--siset-space-1) var(--siset-space-2);
  color: var(--siset-color-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--siset-color-surface-muted);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-xl);
}

.status-badge::before {
  width: 0.5rem;
  height: 0.5rem;
  content: '';
  background: currentcolor;
  border-radius: 50%;
}

.status-badge.is-primary {
  color: var(--siset-color-primary);
}

.status-badge.is-success,
.evaluation-badge.is-conforme {
  color: var(--siset-color-success);
  background: var(--siset-color-success-container);
  border-color: var(--siset-color-success);
}

.status-badge.is-warning,
.evaluation-badge.is-no_presentado,
.evaluation-badge.is-pending {
  color: var(--siset-color-warning);
  background: var(--siset-color-warning-container);
  border-color: var(--siset-color-warning);
}

.status-badge.is-error,
.evaluation-badge.is-observado {
  color: var(--siset-color-error);
  background: var(--siset-color-error-container);
  border-color: var(--siset-color-error);
}

.progress-ring {
  display: grid;
  width: 8.5rem;
  height: 8.5rem;
  place-content: center;
  color: var(--siset-color-secondary);
  border: 0.6rem solid var(--siset-color-secondary-container);
  border-radius: 50%;
}

.progress-ring strong {
  font-family: var(--siset-font-heading);
  font-size: 1.5rem;
}

.progress-ring span {
  color: var(--siset-color-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.progress-ring.is-pending {
  color: var(--siset-color-text-muted);
  border-color: var(--siset-color-border);
}

.progress-track {
  width: 100%;
  height: var(--siset-space-2);
  overflow: hidden;
  background: var(--siset-color-border);
  border-radius: var(--siset-radius-xl);
}

.progress-track span {
  display: block;
  height: 100%;
  background: var(--siset-color-secondary);
  transition: width 160ms ease;
}

.deadline .material-symbols-outlined {
  font-size: 1rem;
}

.action-panel {
  padding: var(--siset-space-5);
}

.available-actions {
  justify-content: flex-end;
}

.workspace-card {
  overflow: hidden;
}

.tabs {
  display: flex;
  gap: var(--siset-space-1);
  min-width: max-content;
  padding: 0 var(--siset-space-4);
  overflow-x: auto;
  background: var(--siset-color-surface-muted);
  border-bottom: 1px solid var(--siset-color-border);
}

.tabs button {
  flex: 0 0 auto;
  padding: var(--siset-space-4) var(--siset-space-3);
  color: var(--siset-color-text-muted);
  font-weight: 700;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
}

.tabs button:hover,
.tabs button.is-active {
  color: var(--siset-color-primary);
}

.tabs button.is-active {
  border-bottom-color: var(--siset-color-primary);
}

.tab-content {
  padding: var(--siset-space-6);
}

.review-layout,
.history-layout,
.conformity-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(17rem, 1fr);
  gap: var(--siset-space-6);
}

.review-column,
.side-column,
.conformity-table-card,
.conformity-summary,
.history-layout > section,
.rounds-card {
  display: grid;
  align-content: start;
  gap: var(--siset-space-4);
}

.section-heading.compact h2 {
  font-size: 1rem;
}

.section-heading.compact > .material-symbols-outlined {
  color: var(--siset-color-secondary);
}

.requirements-list,
.observation-list,
.subsanation-list,
.documents-list,
.attempt-list,
.round-list,
.timeline {
  display: grid;
  gap: var(--siset-space-3);
}

.requirement-card,
.observation-card,
.subsanation-card,
.side-card,
.conformity-summary,
.rounds-card {
  padding: var(--siset-space-5);
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-xl);
}

.requirement-card {
  display: grid;
  gap: var(--siset-space-4);
  border-left: var(--siset-space-1) solid var(--siset-color-primary);
}

.requirement-card.is-inactive {
  opacity: 0.65;
}

.requirement-heading,
.observation-card-heading {
  align-items: start;
  justify-content: space-between;
}

.evaluation-form,
.observation-form {
  display: grid;
  gap: var(--siset-space-3);
  padding: var(--siset-space-4);
  background: var(--siset-color-surface-muted);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-lg);
}

.evaluation-form label,
.observation-form label {
  display: grid;
  gap: var(--siset-space-2);
  color: var(--siset-color-text-muted);
  font-size: 0.875rem;
  font-weight: 700;
}

.evaluation-form select,
.evaluation-form textarea,
.observation-form textarea {
  width: 100%;
  min-height: var(--siset-space-10);
  padding: var(--siset-space-2) var(--siset-space-3);
  color: var(--siset-color-text);
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-lg);
}

.observation-form fieldset {
  display: flex;
  flex-wrap: wrap;
  gap: var(--siset-space-3);
  padding: 0;
  margin: 0;
  border: 0;
}

.observation-form legend {
  width: 100%;
  margin-bottom: var(--siset-space-1);
  color: var(--siset-color-text-muted);
  font-size: 0.875rem;
  font-weight: 700;
}

.observation-form fieldset label {
  display: inline-flex;
  align-items: center;
  gap: var(--siset-space-1);
  color: var(--siset-color-text);
  font-size: 0.875rem;
}

.evaluation-meta {
  font-size: 0.875rem;
}

.comment-box {
  padding: var(--siset-space-3);
  color: var(--siset-color-text);
  background: var(--siset-color-surface-muted);
  border-radius: var(--siset-radius-lg);
}

.inline-success {
  padding: var(--siset-space-3);
  color: var(--siset-color-success);
  background: var(--siset-color-success-container);
  border-radius: var(--siset-radius-lg);
}

.side-column {
  gap: var(--siset-space-4);
}

.side-card {
  display: grid;
  gap: var(--siset-space-4);
  background: var(--siset-color-surface-muted);
}

.document-item {
  align-items: start;
  padding: var(--siset-space-3);
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-lg);
}

.document-item > .material-symbols-outlined {
  color: var(--siset-color-primary);
}

.document-item > div {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: var(--siset-space-1);
}

.document-item strong,
.document-item small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.turnitin-value {
  color: var(--siset-color-primary);
  font-family: var(--siset-font-heading);
  font-size: 2rem;
}

.observation-card,
.subsanation-card {
  display: grid;
  gap: var(--siset-space-3);
}

.subsanation-card > .muted {
  padding-bottom: var(--siset-space-3);
  border-bottom: 1px solid var(--siset-color-border);
}

.attempt-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--siset-space-4);
  padding: var(--siset-space-4);
  background: var(--siset-color-surface-muted);
  border-radius: var(--siset-radius-lg);
}

.attempt-item > div:first-child {
  display: grid;
  gap: var(--siset-space-1);
}

.attempt-actions {
  justify-content: flex-end;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-lg);
}

.conformity-table-card table {
  width: 100%;
  min-width: 38rem;
  border-collapse: collapse;
}

.conformity-table-card th,
.conformity-table-card td {
  padding: var(--siset-space-4);
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid var(--siset-color-border);
}

.conformity-table-card th {
  color: var(--siset-color-primary);
  font-size: 0.75rem;
  text-transform: uppercase;
  background: var(--siset-color-surface-muted);
}

.conformity-table-card tr:last-child td {
  border-bottom: 0;
}

.conformity-table-card td > span:not(.evaluation-badge) {
  display: block;
  margin-top: var(--siset-space-1);
  color: var(--siset-color-text-muted);
  font-size: 0.75rem;
}

.conformity-summary {
  align-content: center;
  color: var(--siset-color-secondary);
  text-align: center;
  background: var(--siset-color-secondary-container);
  border-color: var(--siset-color-secondary);
}

.conformity-summary > .material-symbols-outlined {
  font-size: 2.5rem;
}

.conformity-summary h2,
.conformity-summary p {
  color: var(--siset-color-text);
}

.timeline,
.round-list {
  padding: 0;
  list-style: none;
}

.timeline li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--siset-space-3);
  padding-bottom: var(--siset-space-4);
  border-bottom: 1px solid var(--siset-color-border);
}

.timeline li:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.timeline-dot {
  width: var(--siset-space-3);
  height: var(--siset-space-3);
  margin-top: var(--siset-space-1);
  background: var(--siset-color-primary);
  border-radius: 50%;
}

.rounds-card {
  background: var(--siset-color-surface-muted);
}

.round-list li {
  display: grid;
  gap: var(--siset-space-1);
  padding: var(--siset-space-3);
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-lg);
}

@media (max-width: 64rem) {
  .expediente-overview,
  .review-layout,
  .history-layout,
  .conformity-layout {
    grid-template-columns: 1fr;
  }

  .progress-card {
    border-top: 1px solid var(--siset-color-border);
    border-left: 0;
  }

  .overview-details {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 48rem) {
  .revision-heading,
  .action-panel,
  .requirement-heading,
  .observation-card-heading,
  .attempt-item {
    align-items: stretch;
    flex-direction: column;
  }

  .heading-actions,
  .available-actions,
  .attempt-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .heading-actions .outline-button,
  .available-actions button,
  .attempt-actions button {
    width: 100%;
  }

  .overview-card,
  .progress-card,
  .action-panel,
  .tab-content {
    padding: var(--siset-space-4);
  }

  .overview-details {
    grid-template-columns: 1fr;
  }

  .interface-state {
    grid-template-columns: 1fr;
  }
}

/* Composition ported from Revision_Espacios.html for the active-review state. */
.stitch-review {
  display: grid;
  gap: var(--siset-space-6);
  width: 100%;
}

.stitch-review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--siset-space-5);
  padding: var(--siset-space-2) 0;
}

.stitch-breadcrumb,
.stitch-card-header p,
.stitch-review-header h2,
.stitch-review-header small,
.stitch-requirement p,
.stitch-empty,
.stitch-turnitin-form p,
.stitch-flow-actions p {
  margin: 0;
}

.stitch-breadcrumb {
  color: var(--siset-color-text-muted);
  font-size: var(--siset-font-size-sm);
}

.stitch-breadcrumb span {
  padding: 0 var(--siset-space-1);
  color: var(--siset-color-primary);
}

.stitch-review-header h2 {
  color: var(--siset-color-primary);
  font-size: var(--siset-font-size-2xl);
  line-height: 1.2;
}

.stitch-expediente-selector {
  display: flex;
  align-items: center;
  gap: var(--siset-space-3);
  min-width: 16rem;
  padding: var(--siset-space-3) var(--siset-space-4);
  color: var(--siset-color-text);
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-lg);
  box-shadow: var(--siset-shadow-sm);
}

.stitch-expediente-selector > .material-symbols-outlined {
  color: var(--siset-color-primary);
}

.stitch-expediente-selector span:last-child {
  display: grid;
  gap: 0.125rem;
}

.stitch-expediente-selector small {
  color: var(--siset-color-text-muted);
  font-size: var(--siset-font-size-xs);
}

.stitch-review-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(17rem, 0.9fr);
  gap: var(--siset-space-6);
  align-items: start;
}

.stitch-review-checklist {
  display: grid;
  gap: var(--siset-space-4);
}

.stitch-moment-label {
  display: inline-flex;
  align-items: center;
  gap: var(--siset-space-2);
  width: fit-content;
  padding: var(--siset-space-2) var(--siset-space-3);
  color: var(--siset-color-primary);
  font-size: var(--siset-font-size-sm);
  font-weight: 700;
  background: var(--siset-color-primary-container);
  border-radius: var(--siset-radius-full);
}

.stitch-moment-label .material-symbols-outlined {
  font-size: 1.1rem;
}

.stitch-requirements-card,
.stitch-side-card {
  overflow: hidden;
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-xl);
  box-shadow: var(--siset-shadow-sm);
}

.stitch-card-header,
.stitch-side-card > header,
.stitch-review-status > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--siset-space-3);
}

.stitch-card-header {
  padding: var(--siset-space-5);
  border-bottom: 1px solid var(--siset-color-border);
}

.stitch-card-header p {
  margin-bottom: var(--siset-space-1);
  color: var(--siset-color-text-muted);
  font-size: var(--siset-font-size-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.stitch-card-header h3,
.stitch-side-card h3,
.stitch-review-status h3 {
  margin: 0;
  color: var(--siset-color-text);
  font-size: var(--siset-font-size-lg);
}

.stitch-required {
  padding: 0.25rem var(--siset-space-2);
  color: var(--siset-color-primary);
  font-size: var(--siset-font-size-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  background: var(--siset-color-primary-container);
  border-radius: var(--siset-radius-full);
}

.stitch-requirements-list {
  display: grid;
}

.stitch-requirement {
  display: grid;
  gap: var(--siset-space-4);
  padding: var(--siset-space-5);
  border-bottom: 1px solid var(--siset-color-border);
}

.stitch-requirement:last-child {
  border-bottom: 0;
}

.stitch-requirement.is-inactive {
  opacity: 0.58;
}

.stitch-requirement-copy {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--siset-space-3);
}

.stitch-requirement-number {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  color: var(--siset-color-primary);
  font-size: var(--siset-font-size-xs);
  font-weight: 800;
  background: var(--siset-color-primary-container);
  border-radius: 50%;
}

.stitch-requirement h4 {
  margin: 0 0 var(--siset-space-1);
  color: var(--siset-color-text);
  font-size: var(--siset-font-size-md);
}

.stitch-requirement p {
  color: var(--siset-color-text-muted);
  font-size: var(--siset-font-size-sm);
  line-height: 1.45;
}

.stitch-evaluation-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--siset-space-3);
  padding-left: calc(2rem + var(--siset-space-3));
}

.stitch-decision-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--siset-space-2);
}

.stitch-decision {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.35rem;
  padding: 0.4rem var(--siset-space-3);
  color: var(--siset-color-text-muted);
  font-size: var(--siset-font-size-sm);
  font-weight: 700;
  background: var(--siset-color-surface-muted);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-lg);
  cursor: pointer;
}

.stitch-decision input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.stitch-decision .material-symbols-outlined {
  display: grid;
  place-items: center;
  width: 1.1rem;
  height: 1.1rem;
  font-size: 0.9rem;
  color: var(--siset-color-surface);
  background: var(--siset-color-border-strong);
  border-radius: 50%;
}

.stitch-decision.is-conforme.is-selected {
  color: var(--siset-color-success);
  background: var(--siset-color-success-container);
  border-color: var(--siset-color-success);
}

.stitch-decision.is-observado.is-selected {
  color: var(--siset-color-error);
  background: var(--siset-color-error-container);
  border-color: var(--siset-color-error);
}

.stitch-decision.is-pending.is-selected {
  color: var(--siset-color-warning);
  background: var(--siset-color-warning-container);
  border-color: var(--siset-color-warning);
}

.stitch-decision.is-selected .material-symbols-outlined {
  background: currentColor;
}

.stitch-comment-field {
  grid-column: 1 / -1;
  display: grid;
  gap: var(--siset-space-1);
  color: var(--siset-color-text-muted);
  font-size: var(--siset-font-size-sm);
  font-weight: 600;
}

.stitch-comment-field textarea,
.stitch-observation-form textarea,
.stitch-percent-input input {
  width: 100%;
  box-sizing: border-box;
  color: var(--siset-color-text);
  font: inherit;
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-lg);
}

.stitch-comment-field textarea,
.stitch-observation-form textarea {
  padding: var(--siset-space-2) var(--siset-space-3);
  resize: vertical;
}

.stitch-comment-field textarea:focus,
.stitch-observation-form textarea:focus,
.stitch-percent-input input:focus {
  outline: 2px solid var(--siset-color-primary-container);
  border-color: var(--siset-color-primary);
}

.stitch-save-button,
.stitch-observation-button,
.stitch-primary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--siset-space-2);
  min-height: 2.5rem;
  padding: 0.55rem var(--siset-space-4);
  color: var(--siset-color-on-primary);
  font: inherit;
  font-size: var(--siset-font-size-sm);
  font-weight: 700;
  background: var(--siset-color-primary);
  border: 1px solid var(--siset-color-primary);
  border-radius: var(--siset-radius-lg);
  cursor: pointer;
}

.stitch-save-button:disabled,
.stitch-observation-button:disabled,
.stitch-primary-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.stitch-evaluation-readonly {
  display: flex;
  align-items: center;
  gap: var(--siset-space-2);
  padding-left: calc(2rem + var(--siset-space-3));
  color: var(--siset-color-text-muted);
  font-size: var(--siset-font-size-sm);
}

.stitch-saved-comment {
  margin: 0;
  margin-left: calc(2rem + var(--siset-space-3));
  padding: var(--siset-space-3);
  color: var(--siset-color-text);
  background: var(--siset-color-surface-muted);
  border-radius: var(--siset-radius-lg);
}

.stitch-observation-form {
  display: grid;
  gap: var(--siset-space-3);
  margin-left: calc(2rem + var(--siset-space-3));
  padding: var(--siset-space-4);
  background: var(--siset-color-error-container);
  border: 1px dashed var(--siset-color-error);
  border-radius: var(--siset-radius-lg);
}

.stitch-observation-form > label,
.stitch-observation-form fieldset {
  display: grid;
  gap: var(--siset-space-2);
  margin: 0;
  padding: 0;
  color: var(--siset-color-text);
  font-size: var(--siset-font-size-sm);
  font-weight: 700;
  border: 0;
}

.stitch-observation-form fieldset {
  display: flex;
  flex-wrap: wrap;
}

.stitch-observation-form legend {
  width: 100%;
  margin-bottom: var(--siset-space-1);
}

.stitch-observation-form fieldset label {
  font-weight: 500;
}

.stitch-observation-button {
  justify-self: start;
  color: var(--siset-color-on-error);
  background: var(--siset-color-error);
  border-color: var(--siset-color-error);
}

.stitch-observations-history {
  display: grid;
  gap: var(--siset-space-2);
  margin-left: calc(2rem + var(--siset-space-3));
}

.stitch-observations-history > article {
  padding: var(--siset-space-3);
  background: var(--siset-color-surface-muted);
  border-left: 3px solid var(--siset-color-error);
  border-radius: 0 var(--siset-radius-lg) var(--siset-radius-lg) 0;
}

.stitch-observations-history article > div:first-child {
  display: flex;
  justify-content: space-between;
  gap: var(--siset-space-2);
  color: var(--siset-color-text);
  font-size: var(--siset-font-size-sm);
}

.stitch-observations-history article > div:first-child span {
  color: var(--siset-color-text-muted);
}

.stitch-observations-history p {
  margin: var(--siset-space-2) 0 0;
  color: var(--siset-color-text);
  font-size: var(--siset-font-size-sm);
}

.stitch-subsanacion {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--siset-space-2);
  margin-top: var(--siset-space-3);
  color: var(--siset-color-text-muted);
  font-size: var(--siset-font-size-xs);
}

.stitch-text-button {
  padding: 0;
  color: var(--siset-color-primary);
  font: inherit;
  font-size: inherit;
  font-weight: 700;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.stitch-text-button.is-success { color: var(--siset-color-success); }
.stitch-text-button.is-danger { color: var(--siset-color-error); }

.stitch-empty {
  padding: var(--siset-space-5);
  color: var(--siset-color-text-muted);
}

.stitch-review-sidebar {
  position: sticky;
  top: var(--siset-space-4);
  display: grid;
  gap: var(--siset-space-4);
}

.stitch-side-card > header {
  padding: var(--siset-space-4);
  border-bottom: 1px solid var(--siset-color-border);
}

.stitch-side-card > header .material-symbols-outlined {
  color: var(--siset-color-primary);
}

.stitch-files-list {
  display: grid;
}

.stitch-file-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--siset-space-3);
  padding: var(--siset-space-3) var(--siset-space-4);
  border-bottom: 1px solid var(--siset-color-border);
}

.stitch-file-row:last-child { border-bottom: 0; }

.stitch-file-row > .material-symbols-outlined { color: var(--siset-color-error); }

.stitch-file-row div {
  display: grid;
  min-width: 0;
  gap: 0.125rem;
}

.stitch-file-row strong,
.stitch-file-row small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stitch-file-row strong { color: var(--siset-color-text); font-size: var(--siset-font-size-sm); }
.stitch-file-row small { color: var(--siset-color-text-muted); font-size: var(--siset-font-size-xs); }

.stitch-file-row button {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  color: var(--siset-color-primary);
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.stitch-file-row button:hover { background: var(--siset-color-primary-container); }

.stitch-review-status {
  display: grid;
  gap: var(--siset-space-4);
  padding: var(--siset-space-5);
  color: var(--siset-color-on-primary);
  background: var(--siset-color-primary);
  border-radius: var(--siset-radius-xl);
  box-shadow: var(--siset-shadow-sm);
}

.stitch-review-status > header { justify-content: flex-start; }
.stitch-review-status h3 { color: inherit; }
.stitch-review-status > header .material-symbols-outlined { font-size: 1.5rem; }

.stitch-status-line,
.stitch-turnitin-readout {
  display: flex;
  justify-content: space-between;
  gap: var(--siset-space-3);
  font-size: var(--siset-font-size-sm);
}

.stitch-status-line span,
.stitch-turnitin-readout span { opacity: 0.8; }

.stitch-progress-track {
  height: 0.5rem;
  overflow: hidden;
  background: color-mix(in srgb, var(--siset-color-on-primary) 25%, transparent);
  border-radius: var(--siset-radius-full);
}

.stitch-progress-track span {
  display: block;
  height: 100%;
  background: var(--siset-color-secondary);
  border-radius: inherit;
  transition: width 160ms ease;
}

.stitch-turnitin-readout {
  padding-top: var(--siset-space-3);
  border-top: 1px solid color-mix(in srgb, var(--siset-color-on-primary) 28%, transparent);
}

.stitch-turnitin-form > div {
  display: grid;
  gap: var(--siset-space-3);
  padding: var(--siset-space-4);
}

.stitch-turnitin-form label {
  display: grid;
  gap: var(--siset-space-2);
  color: var(--siset-color-text);
  font-size: var(--siset-font-size-sm);
  font-weight: 700;
}

.stitch-percent-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-lg);
}

.stitch-percent-input input { border: 0; border-radius: 0; }
.stitch-percent-input span { padding: 0 var(--siset-space-3); color: var(--siset-color-text-muted); }
.stitch-turnitin-form p { color: var(--siset-color-text-muted); font-size: var(--siset-font-size-xs); }
.stitch-turnitin-form .stitch-save-button { width: 100%; }

.stitch-flow-actions {
  display: grid;
  gap: var(--siset-space-2);
}

.stitch-primary-action { width: 100%; min-height: 3rem; }
.stitch-flow-actions p { color: var(--siset-color-text-muted); font-size: var(--siset-font-size-xs); text-align: center; }

@media (max-width: 64rem) {
  .stitch-review-layout { grid-template-columns: 1fr; }
  .stitch-review-sidebar { position: static; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stitch-review-status,
  .stitch-flow-actions { grid-column: span 2; }
}

@media (max-width: 48rem) {
  .stitch-review-header { align-items: stretch; flex-direction: column; }
  .stitch-expediente-selector { min-width: 0; }
  .stitch-review-header h2 { font-size: var(--siset-font-size-xl); }
  .stitch-evaluation-form { grid-template-columns: 1fr; padding-left: 0; }
  .stitch-save-button { width: 100%; }
  .stitch-evaluation-readonly,
  .stitch-saved-comment,
  .stitch-observation-form,
  .stitch-observations-history { margin-left: 0; padding-left: 0; }
  .stitch-saved-comment,
  .stitch-observation-form { padding: var(--siset-space-3); }
  .stitch-review-sidebar { grid-template-columns: 1fr; }
  .stitch-review-status,
  .stitch-flow-actions { grid-column: auto; }
}

/* Final visual calibration for the compact Stitch review workspace. */
.stitch-review {
  --siset-font-size-xs: 0.6875rem;
  --siset-font-size-sm: 0.75rem;
  --siset-font-size-md: 0.875rem;
  --siset-font-size-lg: 1rem;
  --siset-font-size-xl: 1.375rem;
  --siset-font-size-2xl: 1.625rem;
  --siset-radius-full: 999px;
  --siset-color-on-primary: #fff;
  --siset-color-on-error: #fff;
  width: 100%;
  gap: var(--siset-space-5);
}

.udi-revision:has(.stitch-review) {
  gap: var(--siset-space-4);
}

.udi-revision:has(.stitch-review) .revision-heading {
  min-height: 0;
  padding-bottom: var(--siset-space-1);
}

.udi-revision:has(.stitch-review) .revision-heading h1 {
  font-size: 1.25rem;
  line-height: 1.2;
}

.udi-revision:has(.stitch-review) .revision-heading .intro {
  display: none;
}

.stitch-review-header {
  min-height: 3.5rem;
  padding: 0;
}

.stitch-review-header h2 {
  margin-top: 0.2rem;
  font-family: var(--siset-font-heading);
  font-size: 1.625rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.stitch-expediente-selector {
  min-width: 13.5rem;
  padding: var(--siset-space-3);
  border-radius: var(--siset-radius-lg);
  box-shadow: 0 2px 4px rgb(25 28 32 / 5%);
}

.stitch-review-layout {
  grid-template-columns: minmax(0, 7fr) minmax(16.5rem, 3fr);
  gap: var(--siset-space-5);
}

.stitch-moment-label {
  min-height: 2.25rem;
  padding: var(--siset-space-2) var(--siset-space-3);
  color: var(--siset-color-primary);
  font-size: 0.75rem;
  background: rgb(40 58 112 / 10%);
  border-radius: var(--siset-radius-md);
}

.stitch-requirements-card,
.stitch-side-card,
.stitch-review-status {
  border-radius: var(--siset-radius-lg);
  box-shadow: 0 2px 4px rgb(25 28 32 / 5%);
}

.stitch-card-header {
  min-height: 3.875rem;
  padding: var(--siset-space-4) var(--siset-space-5);
}

.stitch-card-header h3 {
  color: var(--siset-color-text);
  font-family: var(--siset-font-body);
  font-size: 0.75rem;
  font-weight: 700;
}

.stitch-card-header p {
  margin-bottom: 0.15rem;
  font-size: 0.6875rem;
}

.stitch-required {
  border-radius: var(--siset-radius-md);
  font-size: 0.625rem;
}

.stitch-requirement {
  gap: var(--siset-space-3);
  padding: var(--siset-space-4) var(--siset-space-5);
}

.stitch-requirement-number {
  width: 2.15rem;
  height: 2.15rem;
  padding: 0.2rem;
  color: var(--siset-color-primary);
  font-size: 0.625rem;
  line-height: 1.05;
  text-align: center;
  background: rgb(40 58 112 / 12%);
}

.stitch-requirement h4 {
  margin-bottom: 0.2rem;
  font-family: var(--siset-font-body);
  font-size: 0.8125rem;
  font-weight: 700;
}

.stitch-requirement p {
  font-size: 0.75rem;
}

.stitch-evaluation-form {
  grid-template-columns: 1fr;
  gap: var(--siset-space-2);
  padding-left: calc(2.15rem + var(--siset-space-3));
}

.stitch-decision-options {
  gap: 0.35rem;
}

.stitch-decision {
  min-height: 1.95rem;
  padding: 0.25rem var(--siset-space-2);
  font-size: 0.6875rem;
  border-radius: var(--siset-radius-md);
}

.stitch-decision .material-symbols-outlined {
  width: 0.95rem;
  height: 0.95rem;
  font-size: 0.7rem;
}

.stitch-comment-field {
  gap: 0.2rem;
  font-size: 0.6875rem;
}

.stitch-comment-field textarea,
.stitch-observation-form textarea {
  min-height: 2.75rem;
  padding: var(--siset-space-2);
  font-size: 0.75rem;
  border-radius: var(--siset-radius-md);
}

.stitch-save-button {
  width: 100%;
  min-height: 1.9rem;
  padding: 0.25rem var(--siset-space-3);
  font-size: 0.6875rem;
  border-radius: var(--siset-radius-md);
}

.stitch-evaluation-readonly,
.stitch-saved-comment,
.stitch-observation-form,
.stitch-observations-history {
  margin-left: calc(2.15rem + var(--siset-space-3));
}

.stitch-evaluation-readonly { font-size: 0.6875rem; }
.stitch-saved-comment { padding: var(--siset-space-2) var(--siset-space-3); font-size: 0.75rem; }

.stitch-observation-form {
  gap: var(--siset-space-2);
  padding: var(--siset-space-3);
  border-radius: var(--siset-radius-md);
}

.stitch-observation-button {
  min-height: 2rem;
  padding: 0.3rem var(--siset-space-3);
  font-size: 0.6875rem;
  border-radius: var(--siset-radius-md);
}

.stitch-review-sidebar { gap: var(--siset-space-3); }

.stitch-side-card > header { padding: var(--siset-space-3) var(--siset-space-4); }
.stitch-side-card h3 { font-family: var(--siset-font-body); font-size: 0.75rem; font-weight: 700; }

.stitch-file-row { gap: var(--siset-space-2); padding: var(--siset-space-3) var(--siset-space-4); }
.stitch-file-row strong { font-size: 0.6875rem; }
.stitch-file-row small { font-size: 0.6875rem; }

.stitch-review-status {
  gap: var(--siset-space-3);
  padding: var(--siset-space-4);
  background: var(--siset-color-primary-container);
}

.stitch-review-status h3 { font-family: var(--siset-font-body); font-size: 0.75rem; }
.stitch-status-line, .stitch-turnitin-readout { font-size: 0.6875rem; }
.stitch-progress-track { height: 0.375rem; }

.stitch-turnitin-form > div { display: grid; gap: var(--siset-space-2); padding: var(--siset-space-3) var(--siset-space-4) var(--siset-space-4); }
.stitch-turnitin-form label { font-size: 0.6875rem; }
.stitch-percent-input { border-radius: var(--siset-radius-md); }
.stitch-percent-input input { min-height: 1.95rem; padding: 0.25rem var(--siset-space-2); font-size: 0.75rem; }
.stitch-turnitin-form p { font-size: 0.6875rem; }

.stitch-primary-action {
  min-height: 2.5rem;
  font-size: 0.75rem;
  border-radius: var(--siset-radius-md);
  box-shadow: 0 2px 4px rgb(25 28 32 / 8%);
}

@media (max-width: 64rem) {
  .stitch-review-layout { grid-template-columns: 1fr; }
  .stitch-review-sidebar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 48rem) {
  .stitch-review-header h2 { font-size: 1.375rem; }
  .stitch-evaluation-form { padding-left: 0; }
  .stitch-evaluation-readonly,
  .stitch-saved-comment,
  .stitch-observation-form,
  .stitch-observations-history { margin-left: 0; }
  .stitch-review-sidebar { grid-template-columns: 1fr; }
}
</style>
