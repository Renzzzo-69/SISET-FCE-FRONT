<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { RouterLink } from 'vue-router'
import api, { descargarDocumentoPrivado } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type {
  Expediente,
  ExpedienteDetalle,
  ExpedienteDetalleResponse,
  ParticipanteExpediente,
} from '@/types/api'

const expedientes = ref<Expediente[]>([])
const auth = useAuthStore()
interface DocenteResumen {
  nombres: string
  apellido_paterno: string
  apellido_materno: string
  escuela?: { nombre: string } | null
}
interface JuradoResumen {
  id_expediente: number
  id_designacion: number
  cargo: string
  estado: number
  docente: DocenteResumen | null
  designacion: { estado: string; version: number } | null
}
const asesor = ref<DocenteResumen | null>(null)
const jurados = ref<JuradoResumen[]>([])
const errorEquipo = ref('')
const cargos = ['Presidente', 'Secretario', 'Vocal']
const tribunal = computed(() => {
  const vigentes = jurados.value.filter(
    (item) =>
      Number(item.id_expediente) === seleccionado.value &&
      Number(item.estado) === 1 &&
      item.designacion?.estado === 'vigente',
  )
  const ultima = [...vigentes].sort(
    (a, b) => (b.designacion?.version ?? 0) - (a.designacion?.version ?? 0),
  )[0]?.id_designacion
  return vigentes.filter((item) => item.id_designacion === ultima)
})
function nombreDocente(persona: DocenteResumen | null) {
  return persona
    ? [persona.apellido_paterno, persona.apellido_materno, persona.nombres]
        .filter(Boolean)
        .join(' ')
    : 'No disponible'
}
function jurado(cargo: string) {
  return tribunal.value.find((item) => item.cargo.toLowerCase() === cargo.toLowerCase())
}
const seleccionado = ref<number | null>(null)
const detalle = ref<ExpedienteDetalle | null>(null)
const cargando = ref(true)
const error = ref('')
const errorDescarga = ref('')
const descargando = ref(false)
const verTodosArchivos = ref(false)
const verTodoHistorial = ref(false)
const informe = computed(
  () =>
    [...(detalle.value?.informes ?? [])]
      .filter((item) => item.estado === 1)
      .sort((a, b) => b.es_tesis - a.es_tesis || b.version - a.version)[0],
)
const similitud = computed(() => informe.value?.turnitin ?? null)
const observado = computed(() =>
  ['observado', 'pendiente_subsanacion'].includes(detalle.value?.estado_actual?.codigo ?? ''),
)
const historial = computed(() =>
  [...(detalle.value?.historial ?? [])].sort((a, b) =>
    b.fecha_cambio.localeCompare(a.fecha_cambio),
  ),
)
const archivos = computed(() => {
  const documentos: { nombre: string; detalle: string; ruta: string; icono: string }[] = []
  for (const item of [...(detalle.value?.informes ?? [])].reverse()) {
    if (item.estado !== 1) continue
    if (item.archivo_adjunto)
      documentos.push({
        nombre: `${item.es_tesis ? 'Tesis' : 'Proyecto'}_v${item.version}`,
        detalle: item.titulo,
        ruta: item.archivo_adjunto,
        icono: 'picture_as_pdf',
      })
    if (item.carta_aceptacion_asesor)
      documentos.push({
        nombre: `Carta_aceptacion_v${item.version}`,
        detalle: 'Aceptación de asesor',
        ruta: item.carta_aceptacion_asesor,
        icono: 'description',
      })
  }
  if (detalle.value?.solicitud_adjunta && detalle.value.estado === 1)
    documentos.push({
      nombre: `Solicitud_${detalle.value.cod_expediente}`,
      detalle: 'Solicitud de registro',
      ruta: detalle.value.solicitud_adjunta,
      icono: 'description',
    })
  return documentos
})

function nombre(persona: ParticipanteExpediente | null) {
  return persona
    ? [persona.nombres, persona.apellido_paterno, persona.apellido_materno]
        .filter(Boolean)
        .join(' ')
    : 'No disponible'
}
function fecha(valor: string) {
  const date = new Date(valor)
  return Number.isNaN(date.getTime())
    ? valor
    : new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
async function cargarDetalle() {
  if (seleccionado.value === null) return
  cargando.value = true
  error.value = ''
  errorDescarga.value = ''
  detalle.value = null
  asesor.value = null
  jurados.value = []
  errorEquipo.value = ''
  verTodosArchivos.value = false
  verTodoHistorial.value = false
  try {
    const { data } = await api.get<ExpedienteDetalleResponse>(`/expedientes/${seleccionado.value}`)
    detalle.value = data.data
    if (!data.data) error.value = 'El expediente no contiene información de detalle.'
    if (data.data) {
      const [respuestaAsesor, respuestaJurados] = await Promise.allSettled([
        informe.value?.id_asesor
          ? api.get<DocenteResumen>(`/docentes/${informe.value.id_asesor}`)
          : Promise.resolve(null),
        api.get<JuradoResumen[]>('/jurados-expediente'),
      ])
      if (respuestaAsesor.status === 'fulfilled') asesor.value = respuestaAsesor.value?.data ?? null
      else errorEquipo.value = 'No se pudo consultar el asesor.'
      if (respuestaJurados.status === 'fulfilled')
        jurados.value = respuestaJurados.value.data.filter(
          (item) => Number(item.id_expediente) === seleccionado.value,
        )
      else errorEquipo.value += ' No se pudieron consultar los jurados.'
    }
  } catch (causa) {
    error.value = axios.isAxiosError(causa)
      ? causa.response?.data?.message || 'No se pudo cargar el expediente.'
      : 'No se pudo cargar el expediente.'
  } finally {
    cargando.value = false
  }
}
async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<Expediente[]>('/expedientes')
    expedientes.value = data
    seleccionado.value =
      data.find((item) => item.id_expediente === seleccionado.value)?.id_expediente ??
      data[0]?.id_expediente ??
      null
    await cargarDetalle()
  } catch (causa) {
    error.value = axios.isAxiosError(causa)
      ? causa.response?.data?.message || 'No se pudieron cargar los expedientes.'
      : 'No se pudieron cargar los expedientes.'
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
    errorDescarga.value = 'No se pudo descargar el documento. Inténtalo nuevamente.'
  } finally {
    descargando.value = false
  }
}
onMounted(cargar)
</script>
<template>
  <section class="mi-expediente" aria-label="Mi Expediente" :aria-busy="cargando">
    <label v-if="expedientes.length > 1" class="file-picker"
      >Mi Expediente<select v-model="seleccionado" :disabled="cargando" @change="cargarDetalle">
        <option v-for="item in expedientes" :key="item.id_expediente" :value="item.id_expediente">
          {{ item.cod_expediente }}
        </option>
      </select></label
    >
    <p v-if="cargando" class="card empty" role="status">Cargando expediente…</p>
    <div v-else-if="error" class="card empty" role="alert">
      <p>{{ error }}</p>
      <button class="button" @click="cargar">Reintentar</button>
    </div>
    <div v-else-if="!detalle" class="card empty">
      <h1>Mi Expediente</h1>
      <p>Aún no tienes expedientes registrados.</p>
      <RouterLink class="button primary" :to="{ name: 'expedientes-nuevo' }"
        >Registrar expediente</RouterLink
      >
    </div>
    <template v-else>
      <header class="card expediente-heading">
        <div class="heading-copy">
          <div class="eyebrow">
            <span class="code">{{ detalle.cod_expediente }}</span
            ><span v-if="observado" class="deadline"
              ><span class="material-symbols-outlined" aria-hidden="true">warning</span>Plazo no
              disponible</span
            >
          </div>
          <h1>{{ informe?.titulo || 'Expediente de tesis' }}</h1>
        </div>
        <div class="heading-actions">
          <span class="status" :class="{ observed: observado }"
            ><span aria-hidden="true">●</span
            >{{ detalle.estado_actual?.nombre ?? 'Sin estado informado' }}</span
          ><RouterLink
            class="button primary"
            :to="{ name: 'observaciones', query: { expediente: detalle.id_expediente } }"
            >Subsanar Expediente</RouterLink
          >
        </div>
      </header>
      <p v-if="errorDescarga" class="error" role="alert">{{ errorDescarga }}</p>
      <p v-if="errorEquipo" class="error" role="alert">
        {{ errorEquipo }} <button @click="cargarDetalle">Reintentar</button>
      </p>
      <div class="expediente-grid">
        <div class="info-column">
          <div class="people-grid">
            <section class="card">
              <h2>
                <span class="material-symbols-outlined" aria-hidden="true">person</span>Datos del
                Tesista
              </h2>
              <div
                v-for="(tesista, indice) in [detalle.tesista_1, detalle.tesista_2].filter(Boolean)"
                :key="tesista!.id_alumno"
                class="person"
              >
                <span class="avatar initials" aria-hidden="true">{{
                  `${tesista!.apellido_paterno?.charAt(0) ?? ''}${tesista!.apellido_materno?.charAt(0) ?? ''}` ||
                  'T'
                }}</span>
                <div>
                  <h3>{{ nombre(tesista) }}</h3>
                  <small v-if="indice">Segundo tesista</small><small>Código: no disponible</small>
                  <p class="contact">
                    <span class="material-symbols-outlined" aria-hidden="true">mail</span
                    >{{
                      tesista!.id_alumno === auth.usuario?.alumno?.id_alumno
                        ? auth.usuario?.correo_electronico
                        : 'Correo no disponible'
                    }}
                  </p>
                  <p class="contact">
                    <span class="material-symbols-outlined" aria-hidden="true">call</span>Teléfono
                    no disponible
                  </p>
                </div>
              </div>
              <p v-if="!detalle.tesista_1 && !detalle.tesista_2" class="muted">
                No hay datos de tesistas disponibles.
              </p>
            </section>
            <section class="card">
              <h2>
                <span class="material-symbols-outlined" aria-hidden="true">history_edu</span>Asesor
                Asignado
              </h2>
              <div class="person">
                <span class="avatar material-symbols-outlined" aria-hidden="true"
                  >person_search</span
                >
                <div>
                  <h3>{{ nombreDocente(asesor) }}</h3>
                  <small>{{ asesor?.escuela?.nombre ?? 'Escuela no disponible' }}</small
                  ><span v-if="informe?.carta_aceptacion_asesor" class="acceptance"
                    ><span class="material-symbols-outlined" aria-hidden="true">check_circle</span
                    >Carta de aceptación disponible</span
                  ><small v-else class="approval-pending">Aprobación final no disponible</small>
                </div>
              </div>
            </section>
          </div>
          <div class="documents-grid">
            <section class="card similarity">
              <h2>Índice de Similitud</h2>
              <div
                class="similarity-ring"
                :aria-label="
                  similitud === null ? 'Sin evaluación registrada' : `Similitud ${similitud}%`
                "
              >
                <svg viewBox="0 0 36 36" aria-hidden="true">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#e2e2e8"
                    stroke-width="3"
                  />
                  <circle
                    v-if="similitud !== null"
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    :stroke="similitud < 20 ? '#006b5c' : '#ba1a1a'"
                    stroke-width="3"
                    :stroke-dasharray="`${Math.max(0, Math.min(100, similitud))} 100`"
                    transform="rotate(-90 18 18)"
                  /></svg
                ><strong :class="{ elevated: similitud !== null && similitud >= 20 }">{{
                  similitud === null ? '—' : `${similitud}%`
                }}</strong>
              </div>
              <p
                class="similarity-caption"
                :class="{ elevated: similitud !== null && similitud >= 20 }"
              >
                {{
                  similitud === null
                    ? 'Sin evaluación registrada'
                    : similitud < 20
                      ? 'Dentro del límite permitido (< 20%)'
                      : 'Requiere revisión (≥ 20%)'
                }}
              </p>
            </section>
            <section class="card files-card">
              <div class="section-heading">
                <h2>
                  <span class="material-symbols-outlined" aria-hidden="true">folder_open</span
                  >Documentos Activos
                </h2>
                <button
                  class="text-button"
                  :aria-expanded="verTodosArchivos"
                  @click="verTodosArchivos = !verTodosArchivos"
                >
                  {{ verTodosArchivos ? 'Ver menos' : 'Ver todos' }}
                </button>
              </div>
              <ul v-if="archivos.length" class="files-list">
                <li
                  v-for="archivo in verTodosArchivos ? archivos : archivos.slice(0, 3)"
                  :key="archivo.ruta"
                >
                  <span
                    class="file-icon material-symbols-outlined"
                    :class="{ pdf: archivo.icono === 'picture_as_pdf' }"
                    aria-hidden="true"
                    >{{ archivo.icono }}</span
                  >
                  <div class="file-copy">
                    <h3 :title="archivo.nombre">{{ archivo.nombre }}</h3>
                    <small>{{ archivo.detalle }}</small>
                  </div>
                  <button
                    class="icon-button"
                    :disabled="descargando"
                    :aria-label="`Descargar ${archivo.nombre}`"
                    @click="descargar(archivo.ruta, archivo.nombre)"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">download</span>
                  </button>
                </li>
              </ul>
              <p v-else class="muted">No hay documentos activos disponibles.</p>
              <p v-if="descargando" role="status">Descargando documento…</p>
            </section>
          </div>
          <section class="card committee">
            <h2>
              <span class="material-symbols-outlined" aria-hidden="true">gavel</span>Comité
              Dictaminador (Jurados)
            </h2>
            <div class="committee-grid">
              <div v-for="cargo in cargos" :key="cargo" class="member">
                <span
                  class="avatar"
                  :class="{ president: cargo === 'Presidente' }"
                  aria-hidden="true"
                  >{{ cargo.charAt(0) }}</span
                >
                <div>
                  <small>{{ cargo }}</small>
                  <p>
                    {{
                      jurado(cargo)
                        ? nombreDocente(jurado(cargo)?.docente ?? null)
                        : errorEquipo.includes('jurados')
                          ? 'No disponible'
                          : 'Por asignar'
                    }}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
        <section class="card timeline-card">
          <h2>
            <span class="material-symbols-outlined" aria-hidden="true">track_changes</span
            >Trazabilidad del Expediente
          </h2>
          <ol v-if="historial.length" class="timeline">
            <li
              v-for="(evento, indice) in verTodoHistorial ? historial : historial.slice(0, 5)"
              :key="evento.id_historial"
              :class="{ attention: indice === 0 && observado }"
            >
              <span class="timeline-marker material-symbols-outlined" aria-hidden="true">{{
                indice === 0 && observado ? 'priority_high' : 'check'
              }}</span>
              <div class="timeline-copy">
                <h3>
                  {{
                    evento.estado_nuevo?.nombre ??
                    evento.etapa_nueva?.nombre ??
                    'Movimiento registrado'
                  }}
                </h3>
                <time :datetime="evento.fecha_cambio">{{ fecha(evento.fecha_cambio) }}</time>
                <p>{{ evento.accion_realizada }}</p>
              </div>
            </li>
          </ol>
          <p v-else class="muted">No hay movimientos registrados.</p>
          <button
            v-if="historial.length > 5"
            class="text-button history-toggle"
            :aria-expanded="verTodoHistorial"
            @click="verTodoHistorial = !verTodoHistorial"
          >
            {{ verTodoHistorial ? 'Ver menos' : 'Ver historial completo' }}
          </button>
        </section>
      </div>
    </template>
  </section>
</template>
<style scoped>
.mi-expediente {
  max-width: 1440px;
  margin: 0 auto;
  font-size: 14px;
  line-height: 20px;
}
h1,
h2,
h3,
p {
  margin: 0;
}
a {
  text-decoration: none;
}
.card {
  padding: 16px;
  border: 1px solid #e2e2e8;
  border-radius: 8px;
  background: #f9f9ff;
  box-shadow: 0 2px 4px #0000000d;
}
.expediente-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}
.heading-copy {
  flex: 1;
  min-width: 0;
}
.eyebrow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 12px;
  line-height: 16px;
}
.code {
  padding: 4px 8px;
  background: #ededf3;
  border-radius: 4px;
}
.deadline {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid #e8c26d;
  background: #ffdf9b26;
  color: #6b5000;
  border-radius: 4px;
}
.deadline .material-symbols-outlined {
  font-size: 16px;
}
h1 {
  color: #283a70;
  font-size: 22px;
  line-height: 28px;
  font-weight: 700;
}
.heading-actions {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}
.status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid #c5c6d1;
  border-radius: 12px;
  font-size: 11px;
  line-height: 14px;
  text-transform: uppercase;
  color: #283a70;
}
.status.observed {
  color: #6b5000;
  background: #ffdf9b33;
  border-color: #a88c54;
}
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  background: white;
  font-size: 14px;
  line-height: 20px;
}
.button.primary {
  background: #283a70;
  color: white;
  border-color: #283a70;
}
.expediente-grid {
  display: grid;
  grid-template-columns: minmax(0, 2.08fr) minmax(0, 1fr);
  gap: 20px;
  align-items: stretch;
}
.info-column {
  display: grid;
  gap: 20px;
  align-content: start;
}
.people-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e2e2e880;
  color: #283a70;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}
h2 .material-symbols-outlined {
  font-size: 24px;
}
.person {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.person + .person {
  margin-top: 16px;
}
.person > div {
  min-width: 0;
}
h3 {
  font-size: 16px;
  line-height: 20px;
  font-weight: 600;
}
small {
  font-size: 11px;
  line-height: 16px;
  color: #45464f;
}
.avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #e2e2e8;
  color: #45464f;
}
.avatar.initials {
  background: #dce1ff;
  color: #00164d;
  font-size: 20px;
  font-weight: 600;
}
.contact {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  margin-top: 6px;
  color: #45464f;
  font-size: 12px;
  line-height: 16px;
  overflow-wrap: anywhere;
}
.contact .material-symbols-outlined {
  font-size: 14px;
  flex-shrink: 0;
}
.acceptance {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  margin-top: 12px;
  background: #6ff5dc;
  border-radius: 4px;
  color: #006b5c;
  font-size: 11px;
  line-height: 14px;
}
.acceptance .material-symbols-outlined {
  font-size: 12px;
}
.approval-pending {
  display: block;
  margin-top: 12px;
  color: #757681;
}
.documents-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.72fr);
  gap: 20px;
}
.similarity {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 258px;
  background-image: radial-gradient(#c5c6d140 1px, transparent 1px);
  background-size: 16px 16px;
}
.similarity h2 {
  margin: 0;
  padding: 0;
  border: 0;
  color: #45464f;
  text-transform: uppercase;
  font-size: 12px;
  line-height: 16px;
  letter-spacing: 0.5px;
}
.similarity-ring {
  width: 96px;
  height: 96px;
  position: relative;
}
.similarity-ring strong {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 28px;
  line-height: 36px;
  font-family: var(--siset-font-heading);
  color: #006b5c;
}
.similarity-caption {
  margin-top: 8px;
  color: #006b5c;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
}
.similarity .elevated {
  color: #ba1a1a;
}
.section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid #e2e2e880;
  margin-bottom: 12px;
}
.section-heading h2 {
  border: 0;
  margin: 0;
}
.text-button {
  padding: 0;
  background: transparent;
  border: 0;
  color: #283a70;
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
}
.files-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.files-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #e2e2e880;
}
.files-list li:last-child {
  border-bottom: 0;
}
.file-icon {
  color: #283a70;
  font-size: 24px;
}
.file-icon.pdf {
  color: #ba1a1a;
}
.file-copy {
  min-width: 0;
  flex: 1;
}
.file-copy h3 {
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-copy small {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.icon-button {
  padding: 4px;
  background: transparent;
  border: 0;
  color: #45464f;
}
.icon-button .material-symbols-outlined {
  font-size: 18px;
}
button:disabled {
  opacity: 0.5;
}
.committee-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.member {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e2e2e8;
  background: #f3f3f9;
  border-radius: 4px;
}
.member .avatar {
  width: 40px;
  height: 40px;
  font-size: 14px;
}
.avatar.president {
  background: #b5c4ff;
  color: #283a70;
}
.member small {
  text-transform: uppercase;
  font-size: 10px;
  line-height: 14px;
}
.member p {
  font-size: 12px;
  line-height: 16px;
  overflow-wrap: anywhere;
}
.timeline-card {
  display: flex;
  flex-direction: column;
}
.timeline {
  position: relative;
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  flex: 1;
}
.timeline::before {
  content: '';
  position: absolute;
  top: 12px;
  bottom: 0;
  left: 16px;
  width: 1px;
  background: #e2e2e8;
}
.timeline li {
  position: relative;
  padding: 0 8px 24px 48px;
}
.timeline-marker {
  position: absolute;
  top: 2px;
  left: 0;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  background: #469b93;
  color: white;
  border-radius: 12px;
  font-size: 16px;
}
.attention .timeline-marker {
  border: 1px solid #e8ad25;
  color: #6b5000;
  background: #f9f9ff;
}
.timeline h3 {
  color: #45464f;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
}
.timeline time {
  display: block;
  margin-top: 4px;
  color: #757681;
  font-size: 11px;
  line-height: 16px;
}
.timeline p {
  margin-top: 4px;
  color: #757681;
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}
.attention .timeline-copy {
  padding: 12px;
  border: 1px solid #ffdf9b;
  background: #ffdf9b1a;
  border-radius: 4px;
}
.attention h3 {
  color: #191c20;
}
.history-toggle {
  margin-top: 16px;
}
.muted {
  color: #757681;
}
.empty {
  display: grid;
  justify-items: center;
  gap: 16px;
  padding: 40px 24px;
  text-align: center;
}
.error {
  padding: 12px;
  margin-bottom: 16px;
  background: #ffdad6;
  color: #93000a;
  border-radius: 4px;
}
.file-picker {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.file-picker select {
  padding: 8px;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  background: white;
}
@media (max-width: 1199px) {
  .expediente-grid {
    grid-template-columns: 1fr;
  }
  .expediente-heading {
    align-items: flex-start;
  }
  .heading-actions {
    max-width: 220px;
  }
}
@media (max-width: 600px) {
  .people-grid,
  .documents-grid,
  .committee-grid {
    grid-template-columns: 1fr;
  }
  .expediente-heading {
    flex-direction: column;
  }
  .heading-actions {
    align-items: flex-start;
    max-width: none;
  }
  .person h3 {
    overflow-wrap: anywhere;
  }
}
</style>
