<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'

import api, { descargarDocumentoPrivado } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { documentosSubsanadosUdi, progresoRevisionUdi } from '@/utils/udiExpedientes'
import type {
  EstadoExpedienteActual,
  ExpedienteDetalle,
  ExpedienteDetalleResponse,
  InformeExpediente,
  ParticipanteExpediente,
  RequisitoRevisionDocumentaria,
  RevisionDocumentariaConsulta,
  RevisionDocumentariaResponse,
  ResultadoEvaluacionRequisito,
} from '@/types/api'

type InformeConContexto = InformeExpediente & { resumen?: string | null }

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const detalle = ref<ExpedienteDetalle | null>(null)
const revision = ref<RevisionDocumentariaConsulta | null>(null)
const cargando = ref(true)
const accionEnCurso = ref<
  'conformidad' | 'derivacion' | null
>(null)
const operacionEnCurso = ref<string | null>(null)
const descargando = ref<string | null>(null)
const porcentajeTurnitin = ref<number | null>(null)
const actaConformidad = ref<File | null>(null)
const informeTurnitinArchivo = ref<File | null>(null)
const arrastrandoActa = ref(false)
const errorActa = ref('')
const mensajeError = ref('')
const mensajeAccion = ref('')
const mostrarConformidad = ref(false)
const formulariosEvaluacion = ref<
  Record<number, { resultado: ResultadoEvaluacionRequisito | ''; comentario: string }>
>({})
const idExpediente = computed(() => Number(route.params.id))
const estaGestionando = computed(
  () => accionEnCurso.value !== null || operacionEnCurso.value !== null,
)
const puedeEvaluar = computed(
  () =>
    detalle.value?.etapa_actual?.codigo === 'revision_requisitos_documentarios' &&
    detalle.value.estado_actual?.codigo === 'en_revision' &&
    revision.value?.revision != null,
)
const requisitosActivos = computed(
  () => revision.value?.revision?.requisitos.filter((requisito) => requisito.estado === 1) ?? [],
)
const puedeDerivarDecanatura = computed(
  () =>
    detalle.value?.etapa_actual?.codigo === 'revision_requisitos_documentarios' &&
    detalle.value.estado_actual?.codigo === 'conforme' &&
    revision.value?.revision?.resultado_final === 'conforme' &&
    revision.value?.revision?.fecha_cierre !== null &&
    Boolean(revision.value?.documentos_derivacion.conformidad_tecnica) &&
    Boolean(revision.value?.documentos_derivacion.informe_turnitin) &&
    Boolean(revision.value?.documentos_derivacion.propuesta_jurados),
)
const informeContexto = computed<InformeConContexto | null>(() => {
  const informes = [...(detalle.value?.informes ?? [])]
    .filter((informe) => informe.estado === 1)
    .sort((a, b) => b.version - a.version)
  return (informes.find((informe) => informe.es_tesis === 0) ??
    informes[0] ??
    null) as InformeConContexto | null
})
const fechaRegistroConformidad = new Date()
const fechaEmision = new Intl.DateTimeFormat('es-PE', { dateStyle: 'short' }).format(
  fechaRegistroConformidad,
)
const horaRegistro = new Intl.DateTimeFormat('es-PE', { timeStyle: 'short', hour12: false }).format(
  fechaRegistroConformidad,
)
const responsableTecnico = computed(() => auth.usuario?.correo_electronico ?? 'Usuario registrado')
const turnitinActual = computed(
  () => porcentajeTurnitin.value ?? informeContexto.value?.turnitin ?? null,
)
const turnitinValido = computed(
  () =>
    turnitinActual.value !== null &&
    Number.isInteger(turnitinActual.value) &&
    turnitinActual.value >= 0 &&
    turnitinActual.value <= 100,
)
const todosEvaluados = computed(
  () =>
    requisitosActivos.value.length > 0 &&
    requisitosActivos.value.every((requisito) => resultadoChecklist(requisito) !== null),
)
const hayIncumplimientos = computed(() =>
  requisitosActivos.value.some((requisito) => {
    const resultado = resultadoChecklist(requisito)
    return resultado === 'observado' || resultado === 'no_presentado'
  }),
)
const requiereNotificarObservaciones = computed(
  () =>
    hayIncumplimientos.value ||
    (turnitinValido.value && turnitinActual.value !== null && turnitinActual.value > 50),
)
const puedeSiguienteEtapa = computed(
  () =>
    todosEvaluados.value &&
    !requiereNotificarObservaciones.value &&
    turnitinValido.value,
)
const puedeNotificarObservaciones = computed(
  () => todosEvaluados.value && requiereNotificarObservaciones.value && turnitinValido.value,
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
  const evaluados = requisitos.filter((requisito) => resultadoChecklist(requisito) !== null).length
  const porcentaje = requisitos.length ? Math.round((evaluados / requisitos.length) * 100) : null

  return { evaluados, total: requisitos.length, porcentaje }
})
const observaciones = computed(
  () =>
    revision.value?.revision?.requisitos.flatMap((requisito) =>
      (requisito.evaluacion?.observaciones ?? []).map((observacion) => ({
        requisito,
        observacion,
      })),
    ) ?? [],
)
const adjuntosSubsanados = computed(() => documentosSubsanadosUdi(detalle.value, revision.value))
const versionInforme = computed(() => Math.max(
  informeContexto.value?.version ?? 1,
  ...adjuntosSubsanados.value
    .filter((item) => item.nombre === (informeContexto.value?.es_tesis ? 'Tesis' : 'Proyecto de tesis'))
    .map((item) => item.version),
))
const revisandoSubsanaciones = computed(() =>
  observaciones.value.some(({ observacion }) =>
    observacion.subsanaciones.some((subsanacion) => subsanacion.resultado === null),
  ),
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

function nombreEstado(estado: EstadoExpedienteActual | null) {
  if (!estado) return 'Sin informaci\u00f3n'

  return ETIQUETAS_ESTADO[estado.codigo] ?? estado.nombre ?? 'Sin informaci\u00f3n'
}

function etiquetaResultado(resultado: ResultadoEvaluacionRequisito | null | undefined) {
  if (resultado === 'conforme') return 'Conforme'
  if (resultado === 'observado') return 'Observado'
  if (resultado === 'no_presentado') return 'No presentado'
  return 'Pendiente'
}

function estaEnSubsanacion(requisito: RequisitoRevisionDocumentaria) {
  return requisito.evaluacion?.observaciones.some(
    (observacion) => observacion.estado === 'en_subsanacion',
  ) ?? false
}

function fechaTexto(fecha: string | null) {
  if (fecha === null) return 'Sin fecha'

  const fechaLocal = new Date(fecha)
  return Number.isNaN(fechaLocal.getTime())
    ? fecha
    : new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(
        fechaLocal,
      )
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
      return (
        error.response.data?.message ??
        'La acción no está permitida para el estado actual del expediente.'
      )
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
}

function formularioEvaluacion(idRequisito: number) {
  return (formulariosEvaluacion.value[idRequisito] ??= { resultado: '', comentario: '' })
}

function resultadoChecklist(requisito: RequisitoRevisionDocumentaria) {
  return formularioEvaluacion(requisito.id_requisito_documentario).resultado ||
    requisito.evaluacion?.resultado ||
    null
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

function seleccionarInformeTurnitin(event: Event) {
  const archivo = (event.target as HTMLInputElement).files?.[0] ?? null
  if (!archivo) return
  if (archivo.type !== 'application/pdf' && !archivo.name.toLowerCase().endsWith('.pdf')) {
    mensajeError.value = 'El informe de Turnitin debe ser un archivo PDF.'
    return
  }
  informeTurnitinArchivo.value = archivo
}

function soltarActaConformidad(event: DragEvent) {
  arrastrandoActa.value = false
  asignarActaConformidad(event.dataTransfer?.files[0] ?? null)
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
    let detalleRespuesta = await api.get<ExpedienteDetalleResponse>(`/expedientes/${idExpediente.value}`)
    const estado = detalleRespuesta.data.data?.estado_actual?.codigo
    if (detalleRespuesta.data.data && (
      progresoRevisionUdi(detalleRespuesta.data.data).revisado ||
      !['derivado_udi', 'en_revision', 'conforme'].includes(estado ?? '') ||
      route.query.seccion === 'subsanaciones'
    )) {
      await router.replace({
        name: 'udi-expediente',
        params: { id: idExpediente.value },
        ...(route.query.seccion === 'subsanaciones' ? { query: { seccion: 'subsanaciones' } } : {}),
      })
      return
    }
    if (detalleRespuesta.data.data?.estado_actual?.codigo === 'derivado_udi') {
      const { data } = await api.post<{ message?: string }>(
        `/expedientes/${idExpediente.value}/revision-documentaria/iniciar`,
      )
      mensajeAccion.value = data.message ?? 'Revisión documentaria iniciada.'
      detalleRespuesta = await api.get<ExpedienteDetalleResponse>(`/expedientes/${idExpediente.value}`)
    }
    const revisionRespuesta = await api.get<RevisionDocumentariaResponse>(
      `/expedientes/${idExpediente.value}/revision-documentaria`,
    )
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

async function enviarEvaluacionCompleta(notificarObservaciones: boolean) {
  const informe = informeContexto.value

  if (
    !informe ||
    !Number.isInteger(idExpediente.value) ||
    idExpediente.value < 1 ||
    estaGestionando.value
  ) {
    return
  }

  const puedeEnviar = notificarObservaciones
    ? puedeNotificarObservaciones.value
    : puedeSiguienteEtapa.value
  if (!puedeEnviar || turnitinActual.value === null) return

  operacionEnCurso.value = 'evaluacion-completa'
  mensajeError.value = ''
  mensajeAccion.value = ''

  try {
    await api.post(
      `/expedientes/${idExpediente.value}/revision-documentaria/evaluacion-completa`,
      {
        id_informe: informe.id_informe_proyecto_tesis,
        turnitin: turnitinActual.value,
        notificar_observaciones: notificarObservaciones,
        evaluaciones: requisitosActivos.value.map((requisito) => {
          const formulario = formularioEvaluacion(requisito.id_requisito_documentario)
          return {
            id_requisito_documentario: requisito.id_requisito_documentario,
            resultado: formulario.resultado,
            comentario:
              formulario.resultado === 'conforme' ? null : formulario.comentario.trim() || null,
          }
        }),
      },
    )

    if (notificarObservaciones) {
      await router.replace({ name: 'udi-expediente', params: { id: idExpediente.value } })
    } else {
      await cargarInformacion()
      mostrarConformidad.value = true
    }
  } catch (error) {
    mensajeError.value = mensajeDesdeError(
      error,
      notificarObservaciones
        ? 'No se pudieron notificar las observaciones.'
        : 'No se pudo guardar la revisión.',
    )
  } finally {
    operacionEnCurso.value = null
  }
}

async function declararConformidad() {
  if (
    !Number.isInteger(idExpediente.value) ||
    idExpediente.value < 1 ||
    estaGestionando.value ||
    !puedeDeclararConformidad.value
  ) {
    return
  }

  if (!actaConformidad.value || !informeTurnitinArchivo.value) {
    errorActa.value = 'Adjunte la conformidad técnica y el informe de Turnitin.'
    return
  }

  if (!window.confirm('¿Desea declarar la conformidad técnica de esta revisión?')) return

  accionEnCurso.value = 'conformidad'
  mensajeError.value = ''
  mensajeAccion.value = ''

  try {
    const formulario = new FormData()
    formulario.append('acta_conformidad', actaConformidad.value)
    formulario.append('informe_turnitin', informeTurnitinArchivo.value)
    await api.post(
      `/expedientes/${idExpediente.value}/revision-documentaria/conformidad`,
      formulario,
    )
    mensajeAccion.value = 'Conformidad técnica declarada.'
    await cargarInformacion()
  } catch (error) {
    mensajeError.value = mensajeDesdeError(error, 'No se pudo declarar la conformidad técnica.')
  } finally {
    accionEnCurso.value = null
  }
}

async function derivarDecanatura() {
  if (
    !Number.isInteger(idExpediente.value) ||
    idExpediente.value < 1 ||
    estaGestionando.value ||
    !puedeDerivarDecanatura.value
  ) {
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
        <h1 id="revision-title">Revisi?n documentaria</h1>
        <p class="intro">Eval?e los requisitos y registre las observaciones del expediente.</p>
      </div>
      <div class="heading-actions">
        <button
          type="button"
          class="outline-button"
          :disabled="cargando"
          @click="cargarInformacion"
        >
          <span class="material-symbols-outlined" aria-hidden="true">refresh</span>
          {{ cargando ? 'Actualizando…' : 'Actualizar' }}
        </button>
        <button
          type="button"
          class="outline-button"
          @click="router.push({ name: 'udi-expediente', params: { id: idExpediente } })"
        >
          <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          Volver al expediente
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
        <p v-if="mensajeAccion" class="message success-message" role="status">
          {{ mensajeAccion }}
        </p>

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
                    <thead>
                      <tr>
                        <th>Requisito</th>
                        <th>Estado</th>
                        <th>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="requisito in revision?.revision?.requisitos ?? []"
                        :key="requisito.id_requisito_documentario"
                      >
                        <td>
                          <strong>{{ requisito.nombre }}</strong
                          ><span>{{ requisito.codigo }}</span>
                        </td>
                        <td>
                          <span
                            class="evaluation-badge"
                            :class="`is-${resultadoChecklist(requisito) ?? 'pending'}`"
                            ><span class="material-symbols-outlined" aria-hidden="true">{{
                              resultadoChecklist(requisito) === 'conforme'
                                ? 'check_circle'
                                : resultadoChecklist(requisito) === 'observado'
                                  ? 'error'
                                  : 'pending'
                            }}</span
                            >{{ etiquetaResultado(resultadoChecklist(requisito)) }}</span
                          >
                        </td>
                        <td>
                          <ul
                            v-if="requisito.evaluacion?.observaciones.length"
                            class="conformity-observations"
                          >
                            <li
                              v-for="observacion in requisito.evaluacion.observaciones"
                              :key="observacion.id_observacion_documentaria"
                            >
                              {{ observacion.detalle }}
                            </li>
                          </ul>
                          <span v-else>Sin observaciones pendientes</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Informe de similitud (Turnitin)</strong
                          ><span>{{
                            informeContexto
                              ? `${informeContexto.es_tesis ? 'Tesis final' : 'Proyecto'} · Versi\u00f3n ${versionInforme}`
                              : 'Sin informe registrado'
                          }}</span>
                        </td>
                        <td>
                          <span
                            class="evaluation-badge"
                            :class="turnitinActual === null ? 'is-pending' : 'is-conforme'"
                            ><span class="material-symbols-outlined" aria-hidden="true">{{
                              turnitinActual === null ? 'pending' : 'check_circle'
                            }}</span
                            >{{
                              turnitinActual === null ? 'Pendiente' : `${turnitinActual}%`
                            }}</span
                          >
                        </td>
                        <td>
                          {{ turnitinActual === null ? 'Sin registrar' : 'Porcentaje registrado' }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section class="documentation-status is-ready">
                <span class="material-symbols-outlined" aria-hidden="true">verified</span>
                <div>
                  <h2>Estado de Documentaci&#243;n</h2>
                  <p>
                    {{
                      detalle.estado_actual?.codigo === 'conforme'
                        ? 'La revisi&#243;n documentaria fue cerrada como conforme. No existen bloqueos t&#233;cnicos pendientes.'
                        : 'Todos los requisitos activos est&#225;n conformes y no existen observaciones abiertas.'
                    }}
                  </p>
                </div>
              </section>
            </div>

            <aside class="conformity-form-card">
              <h2>Formulario de Conformidad</h2>
              <form @submit.prevent>
                <label>
                  C&#243;digo de Conformidad
                  <span class="input-with-icon"
                    ><span class="material-symbols-outlined" aria-hidden="true">tag</span
                    ><input value="Pendiente de implementaci&#243;n" disabled
                  /></span>
                </label>
                <div class="conformity-dates">
                  <label
                    >Fecha de Emisi&#243;n<input type="text" :value="fechaEmision" disabled
                  /></label>
                  <label>Hora Registro<input type="text" :value="horaRegistro" disabled /></label>
                </div>
                <label>
                  Responsable T&#233;cnico
                  <select disabled>
                    <option>{{ responsableTecnico }}</option>
                  </select>
                </label>
                <div v-if="puedeDeclararConformidad" class="acta-field">
                  <span>Acta de conformidad t&#233;cnica (PDF)</span>
                  <label
                    class="acta-dropzone"
                    :class="{ 'is-dragging': arrastrandoActa }"
                    @dragover.prevent="arrastrandoActa = true"
                    @dragleave.prevent="arrastrandoActa = false"
                    @drop.prevent="soltarActaConformidad"
                  >
                    <input
                      class="sr-only"
                      type="file"
                      accept="application/pdf,.pdf"
                      @change="seleccionarActaConformidad"
                    />
                    <span class="material-symbols-outlined" aria-hidden="true">upload_file</span>
                    <strong>{{
                      actaConformidad ? 'Acta seleccionada' : 'Arrastra aqu&#237; el documento'
                    }}</strong>
                    <small>{{
                      actaConformidad
                        ? 'Archivo listo para la conformidad t&#233;cnica.'
                        : 'O haz clic para seleccionar un PDF.'
                    }}</small>
                    <span v-if="actaConformidad" class="acta-file-chip"
                      ><span class="material-symbols-outlined" aria-hidden="true">attach_file</span
                      >{{ actaConformidad.name }}</span
                    >
                  </label>
                  <small v-if="errorActa" class="acta-error">{{ errorActa }}</small>
                </div>
                <div v-if="puedeDeclararConformidad" class="acta-field">
                  <span>Informe de Turnitin (PDF)</span>
                  <label class="acta-dropzone">
                    <input
                      class="sr-only"
                      type="file"
                      accept="application/pdf,.pdf"
                      @change="seleccionarInformeTurnitin"
                    />
                    <span class="material-symbols-outlined" aria-hidden="true">plagiarism</span>
                    <strong>{{
                      informeTurnitinArchivo ? 'Informe seleccionado' : 'Selecciona el informe'
                    }}</strong>
                    <small>Documento que sustenta el porcentaje registrado.</small>
                    <span v-if="informeTurnitinArchivo" class="acta-file-chip"
                      ><span class="material-symbols-outlined" aria-hidden="true">attach_file</span
                      >{{ informeTurnitinArchivo.name }}</span
                    >
                  </label>
                </div>
                <div
                  v-if="detalle.estado_actual?.codigo === 'conforme'"
                  class="derivation-documents"
                >
                  <p class="eyebrow">Paquete para Decanatura</p>
                  <button
                    v-for="documento in [
                      {
                        clave: 'conformidad',
                        nombre: 'Conformidad técnica',
                        ruta: revision?.documentos_derivacion.conformidad_tecnica,
                      },
                      {
                        clave: 'turnitin',
                        nombre: 'Informe de Turnitin',
                        ruta: revision?.documentos_derivacion.informe_turnitin,
                      },
                      {
                        clave: 'propuesta',
                        nombre: 'Propuesta de jurados',
                        ruta: revision?.documentos_derivacion.propuesta_jurados,
                      },
                    ]"
                    :key="documento.clave"
                    type="button"
                    class="derivation-document-row"
                    :disabled="!documento.ruta"
                    @click="
                      documento.ruta &&
                      descargarDocumento(documento.ruta, documento.clave, documento.clave)
                    "
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">{{
                      documento.ruta ? 'check_circle' : 'pending'
                    }}</span>
                    <strong>{{ documento.nombre }}</strong>
                    <small>{{ documento.ruta ? 'Listo' : 'Pendiente' }}</small>
                  </button>
                </div>
                <button
                  v-if="puedeDeclararConformidad"
                  type="button"
                  class="conformity-primary-action"
                  :disabled="estaGestionando || !actaConformidad || !informeTurnitinArchivo"
                  @click="declararConformidad"
                >
                  <span class="material-symbols-outlined" aria-hidden="true">verified_user</span
                  >{{
                    accionEnCurso === 'conformidad'
                      ? 'Declarando...'
                      : 'Emitir conformidad t&#233;cnica'
                  }}
                </button>
                <button
                  v-else-if="
                    detalle.estado_actual?.codigo === 'conforme' &&
                    !revision?.documentos_derivacion.propuesta_jurados
                  "
                  type="button"
                  class="conformity-primary-action"
                  @click="
                    router.push({
                      name: 'udi-jurados-propuesta',
                      params: { id: detalle.id_expediente },
                    })
                  "
                >
                  <span class="material-symbols-outlined" aria-hidden="true">group_add</span>
                  Registrar propuesta de jurados
                </button>
                <button
                  v-else-if="puedeDerivarDecanatura"
                  type="button"
                  class="conformity-primary-action"
                  @click="router.push({ name: 'udi-jurados' })"
                >
                  <span class="material-symbols-outlined" aria-hidden="true">inventory_2</span>
                  Ver expediente listo para derivar
                </button>
                <button v-else type="button" class="conformity-primary-action" disabled>
                  <span class="material-symbols-outlined" aria-hidden="true">verified_user</span
                  >Emitir conformidad t&#233;cnica
                </button>
              </form>
            </aside>
          </div>
        </section>
      </template>

      <template
        v-else-if="
          detalle.estado_actual?.codigo === 'en_revision'
        "
      >
        <p v-if="mensajeAccion" class="message success-message" role="status">
          {{ mensajeAccion }}
        </p>

        <section class="stitch-review" aria-labelledby="revision-module-title">
          <header class="stitch-review-header">
            <div>
              <p class="stitch-breadcrumb">
                {{ revisandoSubsanaciones ? 'Subsanación recibida' : 'Revisión en curso' }}
                <span aria-hidden="true">›</span> Momento
                {{ revision?.revision?.numero_ronda ?? 1 }}:
                {{ informeContexto?.es_tesis ? 'Tesis' : 'Proyecto' }}
              </p>
              <h2 id="revision-module-title">
                {{
                  revisandoSubsanaciones
                    ? 'Revisión de documentos corregidos'
                    : 'Módulo de Revisión y Observaciones'
                }}
              </h2>
            </div>
            <div class="stitch-expediente-selector" aria-label="Expediente en revisi&#243;n">
              <span class="material-symbols-outlined" aria-hidden="true">folder_open</span>
              <span
                ><strong>{{ detalle.cod_expediente }}</strong
                ><small>{{ nombreParticipante(detalle.tesista_1) }}</small></span
              >
            </div>
          </header>

          <div class="stitch-review-layout">
            <main class="stitch-review-checklist">
              <div class="stitch-moment-label">
                <span class="material-symbols-outlined" aria-hidden="true">fact_check</span>
                Momento {{ revision?.revision?.numero_ronda ?? 1 }}:
                {{ informeContexto?.es_tesis ? 'Tesis' : 'Proyecto' }}
              </div>

              <section class="stitch-requirements-card">
                <header class="stitch-card-header">
                  <div>
                    <p>Checklist documentario</p>
                    <h3>Requisitos de revisi&#243;n</h3>
                  </div>
                  <span class="stitch-required">OBLIGATORIO</span>
                </header>

                <p v-if="revision?.revision === null" class="stitch-empty">
                  Inicie la revisi&#243;n documentaria para habilitar los requisitos.
                </p>
                <div
                  v-else-if="revision?.revision.requisitos.length"
                  class="stitch-requirements-list"
                >
                  <article
                    v-for="requisito in revision.revision.requisitos"
                    :key="requisito.id_requisito_documentario"
                    class="stitch-requirement"
                    :class="{ 'is-inactive': requisito.estado !== 1 }"
                  >
                    <div class="stitch-requirement-main">
                      <div class="stitch-requirement-copy">
                        <span class="stitch-requirement-number">{{ requisito.codigo }}</span>
                        <div>
                          <h4>
                            {{ requisito.nombre }}
                            <span v-if="estaEnSubsanacion(requisito)" class="stitch-correction-label">En subsanación</span>
                          </h4>
                          <p v-if="requisito.descripcion">{{ requisito.descripcion }}</p>
                          <p v-else>Sin informaci&#243;n adicional.</p>
                        </div>
                      </div>

                      <div
                        v-if="puedeEvaluar && requisito.estado === 1"
                        class="stitch-evaluation-form"
                      >
                        <div
                          class="stitch-decision-options"
                          role="radiogroup"
                          :aria-label="`Resultado para ${requisito.nombre}`"
                        >
                          <label
                            class="stitch-decision is-conforme"
                            :class="{
                              'is-selected':
                                formularioEvaluacion(requisito.id_requisito_documentario)
                                  .resultado === 'conforme',
                            }"
                          >
                            <input
                              v-model="
                                formularioEvaluacion(requisito.id_requisito_documentario).resultado
                              "
                              type="radio"
                              value="conforme"
                              :disabled="estaGestionando"
                            />
                            <span class="material-symbols-outlined" aria-hidden="true">check</span>
                            Cumple
                          </label>
                          <label
                            class="stitch-decision is-observado"
                            :class="{
                              'is-selected':
                                formularioEvaluacion(requisito.id_requisito_documentario)
                                  .resultado === 'observado',
                            }"
                          >
                            <input
                              v-model="
                                formularioEvaluacion(requisito.id_requisito_documentario).resultado
                              "
                              type="radio"
                              value="observado"
                              :disabled="estaGestionando"
                            />
                            <span class="material-symbols-outlined" aria-hidden="true">close</span>
                            No cumple
                          </label>
                        </div>
                        <label
                          v-if="
                            formularioEvaluacion(requisito.id_requisito_documentario).resultado ===
                            'observado'
                          "
                          class="stitch-comment-field"
                        >
                          <span>Observaci&#243;n para el tesista (opcional)</span>
                          <textarea
                            v-model="
                              formularioEvaluacion(requisito.id_requisito_documentario).comentario
                            "
                            rows="3"
                            maxlength="1000"
                            :disabled="estaGestionando"
                            placeholder="Puede agregar una indicaci&#243;n adicional."
                          ></textarea>
                        </label>
                      </div>

                      <div v-else class="stitch-evaluation-readonly">
                        <span
                          class="evaluation-badge"
                          :class="`is-${requisito.evaluacion?.resultado ?? 'pending'}`"
                          >{{ etiquetaResultado(requisito.evaluacion?.resultado) }}</span
                        >
                        <span v-if="requisito.evaluacion"
                          >Evaluado {{ fechaTexto(requisito.evaluacion.fecha_evaluacion) }}</span
                        >
                        <span v-else>Pendiente de evaluaci&#243;n</span>
                      </div>

                      <template v-if="requisito.evaluacion">
                        <p v-if="requisito.evaluacion.comentario" class="stitch-saved-comment">
                          {{ requisito.evaluacion.comentario }}
                        </p>


                      </template>
                    </div>
                  </article>
                </div>
                <p v-else class="stitch-empty">No hay requisitos activos para esta ronda.</p>
              </section>
            </main>

            <aside class="stitch-review-sidebar">
              <section class="stitch-side-card">
                <header>
                  <h3>Archivos adjuntos</h3>
                  <span class="material-symbols-outlined" aria-hidden="true">attach_file</span>
                </header>
                <div class="stitch-files-list">
                  <article
                    v-for="item in adjuntosSubsanados"
                    :key="item.subsanacion.id_subsanacion_documentaria"
                    class="stitch-file-row"
                    :class="{ 'is-new': item.subsanacion.resultado === null }"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">description</span>
                    <div>
                      <strong>{{ item.nombre }}</strong>
                      <small>Versión {{ item.version }} · Subsanado</small>
                      <span v-if="item.subsanacion.resultado === null" class="stitch-new-file">Nuevo · Por revisar</span>
                    </div>
                    <button
                      type="button"
                      :disabled="descargando === `subsanacion-${item.subsanacion.id_subsanacion_documentaria}`"
                      aria-label="Descargar documento corregido"
                      @click="descargarDocumento(item.subsanacion.archivo_adjunto!, `correccion-${item.requisito.codigo}`, `subsanacion-${item.subsanacion.id_subsanacion_documentaria}`)"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">download</span>
                    </button>
                  </article>
                  <article class="stitch-file-row">
                    <span class="material-symbols-outlined" aria-hidden="true">description</span>
                    <div>
                      <strong>Solicitud</strong
                      ><small>{{
                        detalle.solicitud_adjunta ? 'Versión 1 · Original' : 'Sin informaci&#243;n'
                      }}</small>
                    </div>
                    <button
                      v-if="detalle.solicitud_adjunta"
                      type="button"
                      :disabled="descargando === 'solicitud'"
                      aria-label="Descargar solicitud"
                      @click="
                        descargarDocumento(
                          detalle.solicitud_adjunta,
                          `solicitud-${detalle.cod_expediente}`,
                          'solicitud',
                        )
                      "
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">download</span>
                    </button>
                  </article>
                  <article
                    v-for="informe in detalle.informes"
                    :key="informe.id_informe_proyecto_tesis"
                    class="stitch-file-row"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">picture_as_pdf</span>
                    <div>
                      <strong>{{ informe.es_tesis ? 'Tesis' : 'Proyecto de tesis' }}</strong
                      ><small
                        >Versi&#243;n {{ informe.version ?? 'Sin registrar' }} · Original</small
                      >
                    </div>
                    <button
                      v-if="informe.archivo_adjunto"
                      type="button"
                      :disabled="descargando === `informe-${informe.id_informe_proyecto_tesis}`"
                      :aria-label="`Descargar ${informe.es_tesis ? 'tesis' : 'proyecto de tesis'}, versión ${informe.version}`"
                      @click="
                        descargarDocumento(
                          informe.archivo_adjunto,
                          `informe-${informe.id_informe_proyecto_tesis}`,
                          `informe-${informe.id_informe_proyecto_tesis}`,
                        )
                      "
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">download</span>
                    </button>
                  </article>
                </div>
                <p
                  v-if="!detalle.informes.length && !detalle.solicitud_adjunta"
                  class="stitch-empty"
                >
                  Sin archivos adjuntos.
                </p>
              </section>

              <section class="stitch-review-status">
                <header>
                  <span class="material-symbols-outlined" aria-hidden="true">analytics</span>
                  <h3>Estado de la revisi&#243;n</h3>
                </header>
                <div class="stitch-status-line">
                  <span>Estado actual</span
                  ><strong>{{ nombreEstado(detalle.estado_actual) }}</strong>
                </div>
                <div class="stitch-status-line">
                  <span>Progreso</span
                  ><strong>{{ avanceRevision.evaluados }} de {{ avanceRevision.total }}</strong>
                </div>
                <div class="stitch-progress-track" aria-hidden="true">
                  <span :style="{ width: `${avanceRevision.porcentaje ?? 0}%` }"></span>
                </div>
                <div class="stitch-turnitin-readout">
                  <span>Similitud Turnitin</span
                  ><strong>{{
                    turnitinActual === null ? 'Pendiente' : `${turnitinActual}%`
                  }}</strong>
                </div>
              </section>

              <section class="stitch-side-card stitch-turnitin-form">
                <header>
                  <h3>Porcentaje de similitud</h3>
                  <span class="material-symbols-outlined" aria-hidden="true">percent</span>
                </header>

                <div>
                  <label>
                    Registrar porcentaje
                    <span class="stitch-percent-input">
                      <input
                        v-model.number="porcentajeTurnitin"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        inputmode="numeric"
                        placeholder="0"
                        :disabled="estaGestionando || !informeContexto"
                      />
                      <span>%</span>
                    </span>
                  </label>

                  <p>
                    {{
                      informeContexto
                        ? `${informeContexto.es_tesis ? 'Tesis' : 'Proyecto'} · Versión ${versionInforme}`
                        : 'Sin informe registrado'
                    }}
                  </p>

                </div>
              </section>

              <div class="stitch-flow-actions">
                <button
                  v-if="requiereNotificarObservaciones"
                  type="button"
                  class="stitch-primary-action stitch-notify-action"
                  :disabled="!puedeNotificarObservaciones || estaGestionando"
                  @click="enviarEvaluacionCompleta(true)"
                >
                  <span class="material-symbols-outlined" aria-hidden="true">notifications</span>
                  {{
                    operacionEnCurso === 'evaluacion-completa'
                      ? 'Notificando...'
                      : 'Notificar observaciones'
                  }}
                </button>
                <button
                  v-else
                  type="button"
                  class="stitch-primary-action"
                  :disabled="!puedeSiguienteEtapa || estaGestionando"
                  @click="enviarEvaluacionCompleta(false)"
                >
                  <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                  {{
                    operacionEnCurso === 'evaluacion-completa'
                      ? 'Guardando...'
                      : 'Siguiente etapa'
                  }}
                </button>
                <p v-if="!todosEvaluados">
                  Complete la evaluaci&#243;n de todos los requisitos.
                </p>
                <p v-else-if="!turnitinValido">
                  Ingrese un porcentaje entero entre 0 y 100.
                </p>
                <p v-else-if="turnitinActual !== null && turnitinActual > 50">
                  El porcentaje supera el 50%; notifique la observaci&#243;n al tesista.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </template>

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
.stitch-requirement-main {
  display: grid;
  min-width: 0;
  gap: var(--siset-space-2);
}

.stitch-observations-history article > div:first-child {
  flex-wrap: wrap;
}

.stitch-file-row.is-new {
  background: color-mix(in srgb, var(--siset-color-secondary) 12%, var(--siset-color-surface));
  box-shadow: inset 3px 0 var(--siset-color-primary);
}

.stitch-new-file {
  justify-self: start;
  padding: 0.15rem 0.4rem;
  color: var(--siset-color-on-primary);
  font-size: 0.625rem;
  font-weight: 700;
  background: var(--siset-color-primary);
  border-radius: var(--siset-radius-md);
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
  background: color-mix(
    in srgb,
    var(--siset-color-secondary-container) 28%,
    var(--siset-color-surface)
  );
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

.derivation-documents {
  display: grid;
  gap: var(--siset-space-2);
  padding: var(--siset-space-4);
  background: var(--siset-color-surface-container-low);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-lg);
}

.derivation-documents .eyebrow {
  margin: 0 0 var(--siset-space-1);
}

.derivation-document-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--siset-space-2);
  width: 100%;
  padding: var(--siset-space-3);
  color: var(--siset-color-primary);
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-md);
  text-align: left;
  cursor: pointer;
}

.derivation-document-row small {
  color: var(--siset-color-success, #006b5c);
  font-weight: 800;
}

.derivation-document-row:disabled,
.derivation-document-row:disabled small {
  color: var(--siset-color-text-muted);
}

.derivation-document-row:disabled {
  cursor: default;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--siset-space-3);
  margin: 0 0 var(--siset-space-1);
  color: var(--siset-color-text);
  font-size: var(--siset-font-size-md);
}

.stitch-correction-label {
  color: var(--siset-color-error);
  font-size: 0.6875rem;
  font-weight: 600;
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

.stitch-text-button.is-success {
  color: var(--siset-color-success);
}
.stitch-text-button.is-danger {
  color: var(--siset-color-error);
}

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

.stitch-file-row:last-child {
  border-bottom: 0;
}

.stitch-file-row > .material-symbols-outlined {
  color: var(--siset-color-error);
}

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

.stitch-file-row strong {
  color: var(--siset-color-text);
  font-size: var(--siset-font-size-sm);
}
.stitch-file-row small {
  color: var(--siset-color-text-muted);
  font-size: var(--siset-font-size-xs);
}

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

.stitch-file-row button:hover {
  background: var(--siset-color-primary-container);
}

.stitch-review-status {
  display: grid;
  gap: var(--siset-space-4);
  padding: var(--siset-space-5);
  color: var(--siset-color-on-primary);
  background: var(--siset-color-primary);
  border-radius: var(--siset-radius-xl);
  box-shadow: var(--siset-shadow-sm);
}

.stitch-review-status > header {
  justify-content: flex-start;
}
.stitch-review-status h3 {
  color: inherit;
}
.stitch-review-status > header .material-symbols-outlined {
  font-size: 1.5rem;
}

.stitch-status-line,
.stitch-turnitin-readout {
  display: flex;
  justify-content: space-between;
  gap: var(--siset-space-3);
  font-size: var(--siset-font-size-sm);
}

.stitch-status-line span,
.stitch-turnitin-readout span {
  opacity: 0.8;
}

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

.stitch-percent-input input {
  border: 0;
  border-radius: 0;
}
.stitch-percent-input span {
  padding: 0 var(--siset-space-3);
  color: var(--siset-color-text-muted);
}
.stitch-turnitin-form p {
  color: var(--siset-color-text-muted);
  font-size: var(--siset-font-size-xs);
}
.stitch-turnitin-form .stitch-save-button {
  width: 100%;
}

.stitch-turnitin-observations {
  display: grid;
  gap: var(--siset-space-2);
  padding-top: var(--siset-space-3);
  border-top: 1px solid var(--siset-color-border);
}

.stitch-turnitin-observations article {
  display: grid;
  gap: var(--siset-space-2);
  padding: var(--siset-space-3);
  background: var(--siset-color-error-container);
  border-left: 3px solid var(--siset-color-error);
  border-radius: var(--siset-radius-md);
}

.stitch-turnitin-observation-heading,
.stitch-turnitin-correction,
.stitch-turnitin-correction > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--siset-space-2);
}

.stitch-turnitin-observation-heading span,
.stitch-turnitin-correction > span {
  color: var(--siset-color-text-muted);
  font-size: var(--siset-font-size-xs);
}

.stitch-turnitin-correction {
  flex-wrap: wrap;
  padding-top: var(--siset-space-2);
  border-top: 1px solid color-mix(in srgb, var(--siset-color-error) 20%, transparent);
}

.stitch-flow-actions {
  display: grid;
  gap: var(--siset-space-2);
}

.stitch-primary-action {
  width: 100%;
  min-height: 3rem;
}
.stitch-flow-actions p {
  color: var(--siset-color-text-muted);
  font-size: var(--siset-font-size-xs);
  text-align: center;
}

@media (max-width: 64rem) {
  .stitch-review-layout {
    grid-template-columns: 1fr;
  }
  .stitch-review-sidebar {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .stitch-review-status,
  .stitch-flow-actions {
    grid-column: span 2;
  }
}

@media (max-width: 48rem) {
  .stitch-review-header {
    align-items: stretch;
    flex-direction: column;
  }
  .stitch-expediente-selector {
    min-width: 0;
  }
  .stitch-review-header h2 {
    font-size: var(--siset-font-size-xl);
  }
  .stitch-evaluation-form {
    grid-template-columns: 1fr;
    padding-left: 0;
  }
  .stitch-save-button {
    width: 100%;
  }
  .stitch-evaluation-readonly,
  .stitch-saved-comment,
  .stitch-observation-form,
  .stitch-observations-history {
    margin-left: 0;
    padding-left: 0;
  }
  .stitch-saved-comment,
  .stitch-observation-form {
    padding: var(--siset-space-3);
  }
  .stitch-review-sidebar {
    grid-template-columns: 1fr;
  }
  .stitch-review-status,
  .stitch-flow-actions {
    grid-column: auto;
  }
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

.stitch-evaluation-readonly {
  font-size: 0.6875rem;
}
.stitch-saved-comment {
  padding: var(--siset-space-2) var(--siset-space-3);
  font-size: 0.75rem;
}

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

.stitch-review-sidebar {
  gap: var(--siset-space-3);
}

.stitch-side-card > header {
  padding: var(--siset-space-3) var(--siset-space-4);
}
.stitch-side-card h3 {
  font-family: var(--siset-font-body);
  font-size: 0.75rem;
  font-weight: 700;
}

.stitch-file-row {
  gap: var(--siset-space-2);
  padding: var(--siset-space-3) var(--siset-space-4);
}
.stitch-file-row strong {
  font-size: 0.6875rem;
}
.stitch-file-row small {
  font-size: 0.6875rem;
}

.stitch-review-status {
  gap: var(--siset-space-3);
  padding: var(--siset-space-4);
  background: var(--siset-color-primary-container);
}

.stitch-review-status h3 {
  font-family: var(--siset-font-body);
  font-size: 0.75rem;
}
.stitch-status-line,
.stitch-turnitin-readout {
  font-size: 0.6875rem;
}
.stitch-progress-track {
  height: 0.375rem;
}

.stitch-turnitin-form > div {
  display: grid;
  gap: var(--siset-space-2);
  padding: var(--siset-space-3) var(--siset-space-4) var(--siset-space-4);
}
.stitch-turnitin-form label {
  font-size: 0.6875rem;
}
.stitch-percent-input {
  border-radius: var(--siset-radius-md);
}
.stitch-percent-input input {
  min-height: 1.95rem;
  padding: 0.25rem var(--siset-space-2);
  font-size: 0.75rem;
}
.stitch-turnitin-form p {
  font-size: 0.6875rem;
}

.stitch-primary-action {
  min-height: 2.5rem;
  font-size: 0.75rem;
  border-radius: var(--siset-radius-md);
  box-shadow: 0 2px 4px rgb(25 28 32 / 8%);
}

@media (max-width: 64rem) {
  .stitch-review-layout {
    grid-template-columns: 1fr;
  }
  .stitch-review-sidebar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 48rem) {
  .stitch-review-header h2 {
    font-size: 1.375rem;
  }
  .stitch-evaluation-form {
    padding-left: 0;
  }
  .stitch-evaluation-readonly,
  .stitch-saved-comment,
  .stitch-observation-form,
  .stitch-observations-history {
    margin-left: 0;
  }
  .stitch-review-sidebar {
    grid-template-columns: 1fr;
  }
}

.subsanation-version-list {
  display: grid;
  gap: var(--siset-space-3);
}

.subsanation-version-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--siset-space-4);
  padding: var(--siset-space-4);
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border);
  border-left: 4px solid var(--siset-color-border-strong);
  border-radius: var(--siset-radius-lg);
}

.subsanation-version-item.is-pending {
  background: color-mix(in srgb, var(--siset-color-error-container) 48%, var(--siset-color-surface));
  border-left-color: var(--siset-color-error);
}

.subsanation-version-icon {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  color: var(--siset-color-primary);
  background: var(--siset-color-primary-container);
  border-radius: var(--siset-radius-lg);
}

.subsanation-version-copy,
.subsanation-version-copy > div {
  display: flex;
  align-items: center;
  gap: var(--siset-space-2);
}

.subsanation-version-copy {
  align-items: flex-start;
  flex-direction: column;
}

.subsanation-version-copy strong,
.subsanation-version-copy p,
.subsanation-version-copy small {
  margin: 0;
}

.subsanation-version-copy p,
.subsanation-version-copy small {
  color: var(--siset-color-text-muted);
}

.version-label {
  color: var(--siset-color-primary);
  font-size: var(--siset-font-size-sm);
  font-weight: 800;
}

.subsanation-version-open,
.version-file-button,
.version-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--siset-color-primary);
  background: transparent;
  border: 0;
  cursor: pointer;
}

.subsanation-version-open,
.version-file-button {
  width: 2.5rem;
  height: 2.5rem;
  background: var(--siset-color-primary-container);
  border-radius: 50%;
}

.version-review {
  display: grid;
  gap: var(--siset-space-5);
}

.version-review-header,
.version-review-layout,
.corrected-version-card,
.corrected-version-card > div {
  display: flex;
  align-items: center;
  gap: var(--siset-space-4);
}

.version-review-header {
  justify-content: space-between;
}

.version-review-header h2,
.previous-error-card h3,
.corrected-version-card h3 {
  margin: 0;
  color: var(--siset-color-text);
}

.version-back {
  gap: var(--siset-space-1);
  padding: 0;
  margin-bottom: var(--siset-space-3);
  font-weight: 700;
}

.version-review-layout {
  align-items: stretch;
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(18rem, 1fr);
}

.version-review-main,
.version-review-panel {
  display: grid;
  align-content: start;
  gap: var(--siset-space-4);
}

.previous-error-card,
.corrected-version-card,
.version-review-panel {
  padding: var(--siset-space-5);
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-xl);
  box-shadow: var(--siset-shadow-sm);
}

.previous-error-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--siset-space-3);
  background: color-mix(in srgb, var(--siset-color-error-container) 55%, var(--siset-color-surface));
  border-left: 4px solid var(--siset-color-error);
}

.previous-error-card > .material-symbols-outlined {
  color: var(--siset-color-error);
}

.previous-error-card p,
.corrected-version-card p {
  margin: var(--siset-space-1) 0 0;
  color: var(--siset-color-text-muted);
}

.corrected-version-card {
  justify-content: space-between;
}

.corrected-version-card > div > .material-symbols-outlined {
  color: var(--siset-color-primary);
  font-size: 2rem;
}

.version-review-panel label {
  display: grid;
  gap: var(--siset-space-2);
  font-weight: 700;
}

.version-review-actions {
  display: grid;
  gap: var(--siset-space-3);
}

.version-reject-action {
  color: var(--siset-color-error);
  border-color: var(--siset-color-error);
}

@media (max-width: 56rem) {
  .version-review-layout {
    grid-template-columns: 1fr;
  }

  .version-review-header,
  .corrected-version-card {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
