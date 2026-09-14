<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'

import api, { descargarDocumentoPrivado } from '@/services/api'
import type {
  EvaluarRequisitoPayload,
  EstadoExpedienteActual,
  EtapaExpedienteActual,
  ExpedienteDetalle,
  ExpedienteDetalleResponse,
  ParticipanteExpediente,
  RegistrarObservacionPayload,
  RequisitoRevisionDocumentaria,
  RevisionDocumentariaConsulta,
  RevisionDocumentariaResponse,
  ResultadoEvaluacionRequisito,
} from '@/types/api'

const route = useRoute()
const router = useRouter()
const detalle = ref<ExpedienteDetalle | null>(null)
const revision = ref<RevisionDocumentariaConsulta | null>(null)
const cargando = ref(true)
const accionEnCurso = ref<'recepcion' | 'iniciar' | 'subsanacion' | null>(null)
const operacionEnCurso = ref<string | null>(null)
const descargando = ref<string | null>(null)
const mensajeError = ref('')
const mensajeAccion = ref('')
const confirmaciones = ref<Record<string, string>>({})
const formulariosEvaluacion = ref<Record<number, { resultado: ResultadoEvaluacionRequisito | ''; comentario: string }>>({})
const formulariosObservacion = ref<Record<number, { detalle: string; es_subsanable: boolean }>>({})
const idExpediente = computed(() => Number(route.params.id))
const puedeRecepcionar = computed(() => detalle.value?.estado_actual?.codigo === 'pendiente_derivacion')
const puedeIniciar = computed(() => detalle.value?.estado_actual?.codigo === 'derivado_udi')
const puedeEvaluar = computed(
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
  return estado?.nombre ?? 'No disponible'
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

function puedeRegistrarObservacion(requisito: RequisitoRevisionDocumentaria) {
  const resultado = requisito.evaluacion?.resultado
  return puedeEvaluar.value && (resultado === 'observado' || resultado === 'no_presentado')
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
    sincronizarFormularios(revisionRespuesta.data.data)
  } catch (error) {
    mensajeError.value = mensajeDesdeError(error, 'No se pudo cargar la revisión documentaria.')
  } finally {
    cargando.value = false
  }
}

async function guardarEvaluacion(requisito: RequisitoRevisionDocumentaria) {
  if (operacionEnCurso.value !== null) return

  const formulario = formulariosEvaluacion.value[requisito.id_requisito_documentario]

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
  if (operacionEnCurso.value !== null) return

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

async function ejecutarAccion(accion: 'recepcion' | 'iniciar') {
  if (!Number.isInteger(idExpediente.value) || idExpediente.value < 1) return

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
  if (!Number.isInteger(idExpediente.value) || idExpediente.value < 1 || accionEnCurso.value !== null) return

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
  <section>
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
            :disabled="accionEnCurso !== null"
            @click="ejecutarAccion('recepcion')"
          >
            {{ accionEnCurso === 'recepcion' ? 'Recibiendo…' : 'Recibir expediente' }}
          </button>
          <button
            v-else-if="puedeIniciar"
            type="button"
            :disabled="accionEnCurso !== null"
            @click="ejecutarAccion('iniciar')"
          >
            {{ accionEnCurso === 'iniciar' ? 'Iniciando…' : 'Iniciar revisión' }}
          </button>
          <button
            v-else-if="puedeSolicitarSubsanacion"
            type="button"
            :disabled="accionEnCurso !== null || operacionEnCurso !== null"
            @click="solicitarSubsanacion"
          >
            {{ accionEnCurso === 'subsanacion' ? 'Solicitando…' : 'Solicitar subsanación' }}
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
                <select v-model="formularioEvaluacion(requisito.id_requisito_documentario).resultado" :disabled="operacionEnCurso !== null" required>
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
                  :disabled="operacionEnCurso !== null"
                  rows="3"
                ></textarea>
              </label>
              <button type="submit" :disabled="operacionEnCurso !== null">
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
                      <span>Subsanación {{ subsanacion.numero_intento }} · {{ subsanacion.resultado ?? 'Pendiente' }}</span>
                      <p v-if="subsanacion.detalle">{{ subsanacion.detalle }}</p>
                      <p v-if="subsanacion.archivo_adjunto" class="muted">Archivo adjunto registrado.</p>
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
                    :disabled="operacionEnCurso !== null"
                    rows="3"
                    required
                  ></textarea>
                </label>
                <fieldset :disabled="operacionEnCurso !== null">
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
                <button type="submit" :disabled="operacionEnCurso !== null">
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
