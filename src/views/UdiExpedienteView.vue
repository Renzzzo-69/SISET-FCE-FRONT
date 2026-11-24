<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import { RouterLink, useRoute } from 'vue-router'
import api, { descargarDocumentoPrivado } from '@/services/api'
import PlazosExpediente from '@/components/PlazosExpediente.vue'
import HistorialCambios from '@/components/HistorialCambios.vue'
import { documentosSubsanadosUdi, progresoRevisionUdi } from '@/utils/udiExpedientes'
import type {
  ExpedienteDetalle,
  ExpedienteDetalleResponse,
  InformeExpediente,
  ParticipanteExpediente,
  RevisionDocumentariaConsulta,
  RevisionDocumentariaResponse,
} from '@/types/api'

interface DocenteResumen {
  nombres: string
  apellido_paterno: string
  apellido_materno: string
}
interface JuradoResumen {
  id_jurado: number
  id_expediente: number
  id_designacion: number
  cargo: string
  estado: number
  docente: DocenteResumen | null
  designacion: { estado: string; version: number } | null
}
type Seccion = 'revision' | 'observaciones' | 'subsanaciones' | 'conformidad' | 'historial'
const secciones: { codigo: Seccion; nombre: string }[] = [
  { codigo: 'revision', nombre: 'Revisión y observación' },
  { codigo: 'observaciones', nombre: 'Observaciones' },
  { codigo: 'subsanaciones', nombre: 'Subsanaciones' },
  { codigo: 'conformidad', nombre: 'Conformidad' },
  { codigo: 'historial', nombre: 'Historial' },
]
const route = useRoute()
const id = computed(() => Number(route.params.id))
const detalle = ref<ExpedienteDetalle | null>(null)
const revision = ref<RevisionDocumentariaConsulta | null>(null)
const asesor = ref<DocenteResumen | null>(null)
const coasesor = ref<DocenteResumen | null>(null)
const jurados = ref<JuradoResumen[]>([])
const cargando = ref(true)
const error = ref('')
const errorEquipo = ref('')
const errorDescarga = ref('')
const descargando = ref(false)
const seccion = ref<Seccion>('revision')
const avance = computed(() => (detalle.value ? progresoRevisionUdi(detalle.value) : null))
const puedeAbrirRevision = computed(() =>
  ['derivado_udi', 'en_revision', 'conforme'].includes(detalle.value?.estado_actual?.codigo ?? ''),
)
const informe = computed(
  () =>
    [...(detalle.value?.informes ?? [])]
      .filter((item) => item.estado === 1 && item.es_tesis === 0)
      .sort((a, b) => b.version - a.version)[0] as
      | (InformeExpediente & { resumen?: string | null })
      | undefined,
)
const observaciones = computed(
  () =>
    revision.value?.revision?.requisitos.flatMap((requisito) =>
      (requisito.evaluacion?.observaciones ?? []).map((observacion) => ({
        requisito,
        observacion,
      })),
    ) ?? [],
)
const subsanaciones = computed(() =>
  observaciones.value.flatMap(({ requisito, observacion }) =>
    observacion.subsanaciones.map((subsanacion) => ({ requisito, observacion, subsanacion })),
  ),
)
const documentosSubsanados = computed(() => documentosSubsanadosUdi(detalle.value, revision.value))
const versionProyecto = computed(() => Math.max(
  informe.value?.version ?? 1,
  ...documentosSubsanados.value.filter((item) => item.nombre === 'Proyecto de tesis').map((item) => item.version),
))
const ultimasObservaciones = computed(() =>
  [...observaciones.value]
    .sort(
      (a, b) =>
        b.observacion.fecha_emision.localeCompare(a.observacion.fecha_emision) ||
        b.observacion.id_observacion_documentaria - a.observacion.id_observacion_documentaria,
    )
    .slice(0, 2),
)
const historial = computed(() =>
  [...(detalle.value?.historial ?? [])]
    .filter((evento) => evento.accion_realizada !== 'requisito_documentario_evaluado')
    .sort(
      (a, b) => b.fecha_cambio.localeCompare(a.fecha_cambio) || b.id_historial - a.id_historial,
    ),
)
const recibido = computed(
  () =>
    detalle.value?.historial.find((evento) => evento.estado_nuevo?.codigo === 'derivado_udi')
      ?.fecha_cambio,
)
const tribunal = computed(() => {
  const activos = jurados.value.filter(
    (item) =>
      Number(item.id_expediente) === id.value &&
      Number(item.estado) === 1 &&
      ['propuesta', 'vigente'].includes(item.designacion?.estado ?? ''),
  )
  const ultima = [...activos].sort(
    (a, b) =>
      (b.designacion?.version ?? 0) - (a.designacion?.version ?? 0) ||
      b.id_designacion - a.id_designacion,
  )[0]?.id_designacion
  return activos.filter((item) => item.id_designacion === ultima)
})
const documentos = computed(() => {
  const items: { nombre: string; ruta: string; tipo?: string; version?: number }[] = []
  if (detalle.value?.solicitud_adjunta)
    items.push({ nombre: 'Solicitud · versión 1', ruta: detalle.value.solicitud_adjunta, tipo: 'Solicitud', version: 1 })
  for (const item of detalle.value?.informes ?? []) {
    if (!item.archivo_adjunto || item.estado !== 1) continue
    const tipo = item.es_tesis ? 'Tesis' : 'Proyecto de tesis'
    items.push({ nombre: `${tipo} · versión ${item.version}`, ruta: item.archivo_adjunto, tipo, version: item.version })
  }
  for (const item of documentosSubsanados.value) {
    items.push({
      nombre: `${item.nombre} · versión ${item.version} · Subsanado`,
      ruta: item.subsanacion.archivo_adjunto!, tipo: item.nombre, version: item.version,
    })
  }
  items.sort((a, b) => (a.tipo ?? '').localeCompare(b.tipo ?? '', 'es') || (b.version ?? 0) - (a.version ?? 0))
  if (informe.value?.carta_aceptacion_asesor)
    items.push({
      nombre: 'Carta de aceptación del asesor',
      ruta: informe.value.carta_aceptacion_asesor,
    })
  const paquete = revision.value?.documentos_derivacion
  if (paquete?.conformidad_tecnica)
    items.push({ nombre: 'Conformidad técnica', ruta: paquete.conformidad_tecnica })
  if (paquete?.informe_turnitin)
    items.push({ nombre: 'Informe de Turnitin', ruta: paquete.informe_turnitin })
  if (paquete?.propuesta_jurados)
    items.push({ nombre: 'Propuesta de jurados', ruta: paquete.propuesta_jurados })
  return items
})
function nombre(persona: DocenteResumen | ParticipanteExpediente | null | undefined) {
  return persona
    ? [persona.apellido_paterno, persona.apellido_materno, persona.nombres]
        .filter(Boolean)
        .join(' ')
    : 'No registrado'
}
function fecha(valor: string | null | undefined) {
  if (!valor) return 'Sin fecha'
  const date = new Date(valor)
  return Number.isNaN(date.getTime())
    ? valor
    : new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
function accion(texto: string) {
  const nombre = texto.replaceAll('_', ' ')
  return nombre.charAt(0).toUpperCase() + nombre.slice(1)
}
async function cargar() {
  cargando.value = true
  error.value = ''
  errorEquipo.value = ''
  errorDescarga.value = ''
  detalle.value = null
  revision.value = null
  asesor.value = null
  coasesor.value = null
  jurados.value = []
  seccion.value = secciones.some((item) => item.codigo === route.query.seccion)
    ? route.query.seccion as Seccion : 'revision'
  if (!Number.isInteger(id.value) || id.value < 1) {
    error.value = 'El identificador del expediente no es válido.'
    cargando.value = false
    return
  }
  try {
    const [respuestaDetalle, respuestaRevision] = await Promise.all([
      api.get<ExpedienteDetalleResponse>(`/expedientes/${id.value}`),
      api.get<RevisionDocumentariaResponse>(`/expedientes/${id.value}/revision-documentaria`),
    ])
    detalle.value = respuestaDetalle.data.data
    revision.value = respuestaRevision.data.data
    if (!detalle.value) {
      error.value = 'El expediente no contiene información de detalle.'
      return
    }
    const [respuestaAsesor, respuestaCoasesor, respuestaJurados] = await Promise.allSettled([
      informe.value?.id_asesor
        ? api.get<DocenteResumen>(`/docentes/${informe.value.id_asesor}`)
        : Promise.resolve(null),
      informe.value?.id_coasesor
        ? api.get<DocenteResumen>(`/docentes/${informe.value.id_coasesor}`)
        : Promise.resolve(null),
      api.get<JuradoResumen[]>('/jurados-expediente'),
    ])
    if (respuestaAsesor.status === 'fulfilled') asesor.value = respuestaAsesor.value?.data ?? null
    else errorEquipo.value += 'No se pudo consultar el asesor. '
    if (respuestaCoasesor.status === 'fulfilled')
      coasesor.value = respuestaCoasesor.value?.data ?? null
    else errorEquipo.value += 'No se pudo consultar el coasesor. '
    if (respuestaJurados.status === 'fulfilled') jurados.value = respuestaJurados.value.data
    else errorEquipo.value += 'No se pudieron consultar los jurados.'
  } catch (causa) {
    error.value = axios.isAxiosError(causa)
      ? causa.response?.status === 403
        ? 'No tiene autorización para consultar este expediente.'
        : causa.response?.data?.message || 'No se pudo cargar el expediente.'
      : 'No se pudo cargar el expediente.'
  } finally {
    cargando.value = false
  }
}
async function descargar(ruta: string, nombreArchivo: string) {
  descargando.value = true
  errorDescarga.value = ''
  try {
    await descargarDocumentoPrivado(ruta, nombreArchivo)
  } catch {
    errorDescarga.value = 'No se pudo descargar el documento. Inténtelo nuevamente.'
  } finally {
    descargando.value = false
  }
}
onMounted(cargar)
watch(() => route.params.id, cargar)
</script>

<template>
  <PlazosExpediente v-if="detalle" :expediente="id" />
  <section class="udi-file" aria-label="Detalle del expediente · Gestión UDI" :aria-busy="cargando">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Unidad de Investigación</p>
        <h1>Detalle del expediente</h1>
      </div>
      <RouterLink
        class="button secondary"
        :to="{
          name: avance?.revisado ? 'udi-expedientes-revisados' : 'udi-expedientes-por-revisar',
        }"
      >
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>Volver a la
        bandeja
      </RouterLink>
    </header>
    <p v-if="cargando" class="card empty" role="status">Cargando expediente…</p>
    <div v-else-if="error" class="card empty" role="alert">
      <p>{{ error }}</p>
      <button class="button" @click="cargar">Reintentar</button>
    </div>
    <template v-else-if="detalle && avance">
      <div class="overview">
        <article class="card summary-card">
          <div class="summary-meta">
            <span
              class="status"
              :class="{
                complete: avance.revisado,
                observed: ['observado', 'pendiente_subsanacion'].includes(
                  detalle.estado_actual?.codigo ?? '',
                ),
              }"
              >{{ detalle.estado_actual?.nombre ?? 'Sin estado informado' }}</span
            >
            <small v-if="recibido">Recibido: {{ fecha(recibido) }}</small>
          </div>
          <p class="eyebrow">{{ detalle.cod_expediente }}</p>
          <h2>{{ informe?.titulo || 'Expediente de tesis' }}</h2>
          <p class="project-summary">{{ informe?.resumen || 'Sin resumen registrado.' }}</p>
          <dl class="participants">
            <div>
              <dt>Tesistas</dt>
              <dd>{{ nombre(detalle.tesista_1) }}</dd>
              <dd v-if="detalle.tesista_2">{{ nombre(detalle.tesista_2) }}</dd>
            </div>
            <div>
              <dt>Asesor</dt>
              <dd>{{ nombre(asesor) }}</dd>
              <template v-if="informe?.id_coasesor"
                ><dt>Coasesor</dt>
                <dd>{{ nombre(coasesor) }}</dd></template
              >
            </div>
          </dl>
          <p class="current-stage">
            <span class="material-symbols-outlined" aria-hidden="true">flag</span
            ><span
              ><strong>Etapa actual</strong
              >{{ detalle.etapa_actual?.nombre ?? 'No disponible' }}</span
            >
          </p>
        </article>
        <aside class="card semaphore" aria-label="Semáforo de gestión UDI">
          <h2 class="eyebrow">Semáforo de gestión</h2>
          <div
            class="progress-ring"
            :style="{ '--progress': `${avance.porcentaje}%` }"
            :class="{
              complete: avance.revisado,
              observed: ['observado', 'pendiente_subsanacion'].includes(
                detalle.estado_actual?.codigo ?? '',
              ),
            }"
            role="progressbar"
            aria-label="Avance de la gestión UDI"
            :aria-valuenow="avance.completados"
            :aria-valuemin="0"
            :aria-valuemax="3"
            :aria-valuetext="`${avance.completados} de 3 hitos: ${avance.etiqueta}`"
          >
            <div>
              <strong>{{ avance.porcentaje }}%</strong><span>{{ avance.completados }}/3 hitos</span>
            </div>
          </div>
          <p>{{ avance.etiqueta }}</p>
          <ol class="milestones">
            <li
              v-for="(hito, indice) in [
                'Revisión iniciada',
                'Conformidad técnica',
                'Derivación a Decanatura',
              ]"
              :key="hito"
              :class="{ done: avance.completados > indice }"
            >
              <span class="material-symbols-outlined" aria-hidden="true">{{
                avance.completados > indice ? 'check_circle' : 'radio_button_unchecked'
              }}</span
              >{{ hito }}
            </li>
          </ol>
        </aside>
      </div>
      <p v-if="errorEquipo" class="notice" role="alert">
        {{ errorEquipo }} <button class="text-button" @click="cargar">Reintentar</button>
      </p>
      <p v-if="errorDescarga" class="notice" role="alert">{{ errorDescarga }}</p>
      <section class="card workspace" aria-label="Gestión del expediente">
        <div class="tabs" role="tablist" aria-label="Secciones del expediente UDI">
          <button
            v-for="tab in secciones"
            :id="`udi-tab-${tab.codigo}`"
            :key="tab.codigo"
            role="tab"
            :aria-selected="seccion === tab.codigo"
            aria-controls="udi-file-panel"
            :class="{ active: seccion === tab.codigo }"
            @click="seccion = tab.codigo"
          >
            {{ tab.nombre }}
          </button>
        </div>
        <div class="workspace-layout">
          <div
            id="udi-file-panel"
            class="main-panel"
            role="tabpanel"
            :aria-labelledby="`udi-tab-${seccion}`"
          >
            <div v-if="!avance.revisado" class="action-bar">
              <RouterLink v-if="puedeAbrirRevision" class="button" :to="{ name: 'udi-revision', params: { id } }"
                ><span class="material-symbols-outlined" aria-hidden="true">rate_review</span
                >{{
                  detalle.estado_actual?.codigo === 'derivado_udi'
                    ? 'Revisar'
                    : 'Continuar revisión'
                }}</RouterLink
              >
              <span>{{ puedeAbrirRevision ? 'Evaluación documentaria, observaciones y conformidad' : 'Esperando subsanación del tesista' }}</span>
            </div>
            <p v-else class="readonly-label">
              <span class="material-symbols-outlined" aria-hidden="true">lock</span>Revisado · Solo
              consulta
            </p>
            <template v-if="seccion === 'revision'">
              <h2>Cuerpo de jurados propuestos</h2>
              <div v-if="tribunal.length" class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Rol</th>
                      <th scope="col">Nombre propuesto</th>
                      <th scope="col">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="jurado in tribunal" :key="jurado.id_jurado">
                      <td>
                        <span class="role-badge">{{ jurado.cargo }}</span>
                      </td>
                      <td>{{ nombre(jurado.docente) }}</td>
                      <td>
                        {{ jurado.designacion?.estado === 'vigente' ? 'Designado' : 'Propuesto' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-else class="empty-copy">
                {{
                  errorEquipo.includes('jurados')
                    ? 'No se pudo consultar la propuesta de jurados.'
                    : 'Aún no se ha registrado una propuesta de jurados.'
                }}
              </p>
            </template>
            <template v-else-if="seccion === 'observaciones'">
              <h2>Observaciones documentarias</h2>
              <article
                v-for="item in observaciones"
                :key="item.observacion.id_observacion_documentaria"
                class="record"
              >
                <div class="record-heading">
                  <h3>{{ item.requisito.nombre }}</h3>
                  <span class="role-badge">{{ accion(item.observacion.estado) }}</span>
                </div>
                <p>{{ item.observacion.detalle }}</p>
                <small>{{ fecha(item.observacion.fecha_emision) }}</small>
              </article>
              <p v-if="!observaciones.length" class="empty-copy">
                No hay observaciones registradas.
              </p>
            </template>
            <template v-else-if="seccion === 'subsanaciones'">
              <h2>Subsanaciones presentadas</h2>
              <article
                v-for="item in subsanaciones"
                :key="item.subsanacion.id_subsanacion_documentaria"
                class="record"
              >
                <div class="record-heading">
                  <h3>
                    {{ item.requisito.nombre }} · Intento {{ item.subsanacion.numero_intento }}
                  </h3>
                  <span class="role-badge">{{
                    item.subsanacion.resultado
                      ? accion(item.subsanacion.resultado)
                      : 'Pendiente de revisión'
                  }}</span>
                </div>
                <p>{{ item.subsanacion.detalle || 'Sin comentario adicional.' }}</p>
                <small>{{ fecha(item.subsanacion.fecha_presentacion) }}</small
                ><button
                  v-if="item.subsanacion.archivo_adjunto"
                  class="text-button"
                  :disabled="descargando"
                  @click="
                    descargar(
                      item.subsanacion.archivo_adjunto,
                      `subsanacion-${item.subsanacion.id_subsanacion_documentaria}`,
                    )
                  "
                >
                  Descargar documento
                </button>
              </article>
              <p v-if="!subsanaciones.length" class="empty-copy">
                No hay subsanaciones presentadas.
              </p>
            </template>
            <template v-else-if="seccion === 'conformidad'">
              <h2>Conformidad técnica</h2>
              <div v-if="revision?.revision?.resultado_final === 'conforme'" class="record">
                <p class="success">Conformidad técnica emitida</p>
                <p>
                  Ronda {{ revision.revision.numero_ronda }} ·
                  {{ fecha(revision.revision.fecha_cierre) }}
                </p>
                <p>Los documentos del expediente están disponibles en la columna lateral.</p>
              </div>
              <p v-else class="empty-copy">La conformidad técnica aún no ha sido emitida.</p>
            </template>
            <template v-else>
              <HistorialCambios :expediente="id" />
              <h2>Historial de movimientos</h2>
              <ol class="history">
                <li v-for="evento in historial" :key="evento.id_historial">
                  <span class="history-dot"></span>
                  <div>
                    <h3>{{ accion(evento.accion_realizada) }}</h3>
                    <small>{{ fecha(evento.fecha_cambio) }}</small>
                    <p>{{ evento.responsable?.nombre ?? 'Sistema' }}</p>
                  </div>
                </li>
              </ol>
              <p v-if="!historial.length" class="empty-copy">No hay movimientos registrados.</p>
            </template>
          </div>
          <aside class="context-column">
            <section class="side-card">
              <h2>Reporte de similitud</h2>
              <template v-if="informe?.turnitin != null"
                ><strong class="similarity-value">{{ informe.turnitin }}%</strong
                ><span class="muted">Similitud registrada</span>
                <div class="similarity-track" aria-hidden="true">
                  <span :style="{ width: `${informe.turnitin}%` }"></span>
                </div>
                <small>Proyecto · versión {{ versionProyecto }}</small></template
              >
              <p v-else class="empty-copy">Sin porcentaje registrado.</p>
            </section>
            <section class="side-card">
              <h2>Últimas observaciones</h2>
              <article
                v-for="item in ultimasObservaciones"
                :key="item.observacion.id_observacion_documentaria"
                class="mini-observation"
              >
                <h3>{{ item.requisito.nombre }}</h3>
                <p>{{ item.observacion.detalle }}</p>
              </article>
              <p v-if="!observaciones.length" class="empty-copy">Sin observaciones registradas.</p>
              <button v-else class="text-button" @click="seccion = 'observaciones'">
                Ver todas ({{ observaciones.length }})
              </button>
            </section>
            <section class="side-card">
              <h2>Documentos clave</h2>
              <ul class="documents">
                <li v-for="documento in documentos" :key="documento.ruta">
                  <button
                    :disabled="descargando"
                    @click="descargar(documento.ruta, documento.nombre)"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">description</span
                    ><span>{{ documento.nombre }}</span
                    ><span class="material-symbols-outlined" aria-hidden="true">download</span>
                  </button>
                </li>
              </ul>
              <p v-if="!documentos.length" class="empty-copy">No hay documentos disponibles.</p>
              <small v-if="descargando" role="status">Descargando documento…</small>
            </section>
          </aside>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.udi-file {
  display: grid;
  gap: 20px;
  max-width: 1440px;
  margin: 0 auto;
  color: #191c20;
  font-size: 13px;
  line-height: 1.5;
}
h1,
h2,
h3,
p,
dl,
dd {
  margin: 0;
}
h1 {
  font-size: 23px;
  font-weight: 500;
  color: #324583;
}
h2 {
  color: #324583;
  font-size: 15px;
  font-weight: 600;
}
h3 {
  font-size: 13px;
  font-weight: 600;
}
small,
.muted {
  color: #757681;
  font-size: 11px;
}
.page-heading,
.summary-meta,
.record-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.eyebrow {
  color: #62636d;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.card {
  background: #f9f9ff;
  border: 1px solid #e2e2e8;
  border-radius: 10px;
  box-shadow: 0 2px 4px #0000000a;
}
.overview {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(250px, 1fr);
  gap: 20px;
}
.summary-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
}
.summary-card h2 {
  font-size: 22px;
  line-height: 1.35;
}
.project-summary {
  color: #62636d;
  font-size: 12px;
  white-space: pre-line;
}
.status {
  padding: 4px 10px;
  color: #324583;
  background: #e7ebfa;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
}
.status.complete {
  color: #006b5c;
  background: #d1f2e9;
}
.status.observed {
  color: #93000a;
  background: #ffdad6;
}
.participants {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e2e8;
}
dt {
  color: #757681;
  font-size: 10px;
  text-transform: uppercase;
}
dd {
  margin-bottom: 5px;
  font-size: 12px;
  font-weight: 500;
}
.current-stage {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  color: #324583;
  font-size: 11px;
}
.current-stage > .material-symbols-outlined {
  font-size: 18px;
  color: #469b93;
}
.current-stage strong {
  display: block;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.semaphore {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px;
}
.semaphore > p {
  font-size: 12px;
  color: #62636d;
}
.progress-ring {
  --ring-color: #8b7300;
  width: 132px;
  height: 132px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: conic-gradient(var(--ring-color) var(--progress), #e2e2e8 0);
}
.progress-ring.complete {
  --ring-color: #469b93;
}
.progress-ring.observed {
  --ring-color: #ba1a1a;
}
.progress-ring > div {
  display: grid;
  place-content: center;
  text-align: center;
  width: 116px;
  height: 116px;
  border-radius: 50%;
  background: #f9f9ff;
  color: var(--ring-color);
}
.progress-ring strong {
  font-size: 28px;
}
.progress-ring span {
  font-size: 11px;
  color: #757681;
}
.milestones {
  display: grid;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 11px;
  color: #757681;
}
.milestones li {
  display: flex;
  gap: 6px;
  align-items: center;
}
.milestones .material-symbols-outlined {
  font-size: 15px;
}
.done,
.success {
  color: #006b5c;
}
.workspace {
  overflow: hidden;
}
.tabs {
  display: flex;
  overflow-x: auto;
  border-bottom: 1px solid #e2e2e8;
  padding: 0 16px;
}
.tabs button {
  flex-shrink: 0;
  padding: 16px 14px;
  border: 0;
  border-bottom: 2px solid transparent;
  color: #62636d;
  background: transparent;
  font-size: 12px;
  cursor: pointer;
}
.tabs button.active {
  color: #324583;
  border-bottom-color: #324583;
  font-weight: 600;
}
.workspace-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(235px, 1fr);
  gap: 24px;
  padding: 24px;
}
.main-panel {
  min-width: 0;
}
.main-panel > h2 {
  margin-bottom: 16px;
}
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 14px;
  border: 1px solid #283a70;
  border-radius: 6px;
  background: #283a70;
  color: white;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}
.button.secondary {
  background: #f9f9ff;
  color: #283a70;
  border-color: #c5c6d1;
}
.button .material-symbols-outlined {
  font-size: 18px;
}
.button:hover {
  filter: brightness(0.94);
}
.action-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
  padding: 14px;
  background: #e5e9fc;
  border: 1px solid #d8def6;
  border-radius: 6px;
}
.action-bar > span {
  color: #62636d;
  font-size: 11px;
}
.readonly-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 24px;
  padding: 12px;
  background: #eaf5f1;
  color: #006b5c;
  border-radius: 6px;
}
.readonly-label .material-symbols-outlined {
  font-size: 16px;
}
.table-wrapper {
  overflow-x: auto;
  border: 1px solid #e2e2e8;
  border-radius: 6px;
}
table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 12px;
}
th {
  background: #ededf4;
  color: #757681;
  font-size: 9px;
  text-transform: uppercase;
}
th,
td {
  padding: 14px 10px;
  border-bottom: 1px solid #e2e2e8;
}
tbody tr:last-child td {
  border-bottom: 0;
}
.role-badge {
  display: inline-block;
  padding: 3px 6px;
  border-radius: 4px;
  background: #e7ebfa;
  color: #324583;
  font-size: 10px;
}
.context-column {
  display: grid;
  align-content: start;
  gap: 16px;
}
.side-card {
  padding: 16px;
  background: #f3f3fa;
  border: 1px solid #e2e2e8;
  border-radius: 6px;
}
.side-card h2 {
  margin-bottom: 12px;
  color: #62636d;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.similarity-value {
  margin-right: 8px;
  color: #324583;
  font-size: 25px;
}
.similarity-track {
  height: 4px;
  margin: 10px 0;
  background: #e2e2e8;
  border-radius: 4px;
  overflow: hidden;
}
.similarity-track span {
  display: block;
  height: 100%;
  background: #469b93;
}
.documents {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 6px;
}
.documents button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 8px 0;
  background: transparent;
  border: 0;
  color: #324583;
  text-align: left;
  font-size: 11px;
  cursor: pointer;
}
.documents .material-symbols-outlined {
  font-size: 17px;
}
.documents button:disabled,
button:disabled {
  opacity: 0.6;
  cursor: wait;
}
.record {
  padding: 16px 0;
  border-bottom: 1px solid #e2e2e8;
}
.record p {
  margin: 8px 0;
  white-space: pre-line;
}
.record .text-button {
  display: block;
  margin-top: 8px;
}
.mini-observation {
  padding: 10px 0;
  border-bottom: 1px solid #e2e2e8;
}
.mini-observation h3 {
  font-size: 11px;
  color: #324583;
}
.mini-observation p {
  margin-top: 4px;
  color: #62636d;
  font-size: 11px;
  white-space: pre-line;
}
.text-button {
  background: transparent;
  border: 0;
  padding: 0;
  color: #324583;
  font-size: 11px;
  text-decoration: underline;
  cursor: pointer;
}
.side-card > .text-button {
  margin-top: 12px;
}
.history {
  padding: 0;
  margin: 0;
  list-style: none;
}
.history li {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #e2e2e8;
}
.history p {
  color: #757681;
  font-size: 11px;
}
.history-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #469b93;
  margin-top: 6px;
}
.notice {
  padding: 12px 16px;
  background: #fff2df;
  color: #725513;
  border-radius: 6px;
}
.empty {
  display: grid;
  gap: 12px;
  justify-items: center;
  padding: 32px;
}
.empty-copy {
  color: #757681;
  font-size: 12px;
  padding: 12px 0;
}
@media (max-width: 1000px) {
  .overview,
  .workspace-layout {
    grid-template-columns: 1fr;
  }
  .context-column {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
}
@media (max-width: 600px) {
  .participants {
    grid-template-columns: 1fr;
  }
  .workspace-layout,
  .summary-card,
  .semaphore {
    padding: 16px;
  }
  .summary-card h2 {
    font-size: 19px;
  }
}
</style>
