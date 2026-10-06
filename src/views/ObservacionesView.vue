<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { RouterLink, useRoute } from 'vue-router'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type {
  Expediente,
  ObservacionDocumentaria,
  RevisionDocumentariaConsulta,
  RevisionDocumentariaResponse,
} from '@/types/api'

const auth = useAuthStore()
const route = useRoute()
const expedientes = ref<Expediente[]>([])
const idExpediente = ref<number | null>(null)
const ronda = ref<number | null>(null)
const revision = ref<RevisionDocumentariaConsulta | null>(null)
const idObservacion = ref<number | null>(null)
const cargando = ref(true)
const enviando = ref(false)
const error = ref('')
const errorFormulario = ref('')
const aviso = ref('')
const comentarios = ref('')
const archivo = ref<File | null>(null)
const entradaArchivo = ref<HTMLInputElement | null>(null)
const expediente = computed(() =>
  expedientes.value.find((item) => item.id_expediente === idExpediente.value),
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
const actual = computed(() =>
  observaciones.value.find(
    (item) => item.observacion.id_observacion_documentaria === idObservacion.value,
  ),
)
const otras = computed(() => observaciones.value.filter((item) => item !== actual.value))
const ultimaRonda = computed(() =>
  Math.max(0, ...(revision.value?.rondas.map((item) => item.numero_ronda) ?? [])),
)
const puedeEnviar = computed(() => {
  const item = actual.value?.observacion
  const alumno = auth.usuario?.alumno?.id_alumno
  return (
    auth.tieneRol('tesista') &&
    alumno !== undefined &&
    [expediente.value?.id_tesista, expediente.value?.id_co_tesista].includes(alumno) &&
    expediente.value?.etapa?.codigo === 'revision_requisitos_documentarios' &&
    expediente.value?.estado_actual?.codigo === 'pendiente_subsanacion' &&
    revision.value?.revision?.numero_ronda === ultimaRonda.value &&
    Boolean(item?.es_subsanable) &&
    item?.estado === 'pendiente'
  )
})

function etiqueta(estado: ObservacionDocumentaria['estado']) {
  return { pendiente: 'Pendiente', en_subsanacion: 'En revisión', cerrada: 'Cerrada' }[estado]
}
function mensaje(causa: unknown, defecto: string) {
  if (!axios.isAxiosError(causa)) return defecto
  return (
    causa.response?.data?.errors?.archivo_adjunto?.[0] || causa.response?.data?.message || defecto
  )
}
function claveBorrador() {
  return `siset:subsanacion:${auth.usuario?.id_usuario}:${idExpediente.value}:${idObservacion.value}`
}
function seleccionar(id: number | null) {
  idObservacion.value = id
  archivo.value = null
  comentarios.value = ''
  errorFormulario.value = ''
  aviso.value = ''
  if (entradaArchivo.value) entradaArchivo.value.value = ''
  if (id !== null) {
    try {
      comentarios.value = sessionStorage.getItem(claveBorrador()) ?? ''
    } catch {
      /* El almacenamiento local puede estar bloqueado. */
    }
  }
}
function guardarBorrador() {
  try {
    sessionStorage.setItem(claveBorrador(), comentarios.value)
    aviso.value =
      'Comentarios guardados en esta pestaña. El archivo deberá adjuntarse nuevamente si sales del módulo.'
  } catch {
    errorFormulario.value = 'No se pudo guardar el borrador en este navegador.'
  }
}
function validarArchivo(valor: File | null) {
  archivo.value = null
  errorFormulario.value = ''
  if (!valor) return
  if (!/\.(pdf|docx)$/i.test(valor.name)) {
    errorFormulario.value = 'Selecciona un archivo PDF o DOCX.'
  } else if (valor.size > 30 * 1024 * 1024) {
    errorFormulario.value = 'El archivo no puede superar 30 MiB.'
  } else {
    archivo.value = valor
  }
  if (!archivo.value && entradaArchivo.value) entradaArchivo.value.value = ''
}
function soltarArchivo(evento: DragEvent) {
  if (!puedeEnviar.value || enviando.value) return
  validarArchivo(evento.dataTransfer?.files[0] ?? null)
}
async function cargarRevision() {
  if (idExpediente.value === null) return
  cargando.value = true
  error.value = ''
  revision.value = null
  seleccionar(null)
  try {
    const { data } = await api.get<RevisionDocumentariaResponse>(
      `/expedientes/${idExpediente.value}/revision-documentaria`,
      { params: ronda.value ? { ronda: ronda.value } : {} },
    )
    revision.value = data.data
    ronda.value = data.data.revision?.numero_ronda ?? null
    seleccionar(
      (
        observaciones.value.find((item) => item.observacion.estado === 'pendiente') ??
        observaciones.value[0]
      )?.observacion.id_observacion_documentaria ?? null,
    )
  } catch (causa) {
    error.value = mensaje(causa, 'No se pudieron cargar las observaciones.')
  } finally {
    cargando.value = false
  }
}
async function cambiarExpediente() {
  ronda.value = null
  await cargarRevision()
}
async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<Expediente[]>('/expedientes')
    expedientes.value = data
    const solicitado = idExpediente.value ?? Number(route.query.expediente)
    idExpediente.value =
      data.find((item) => item.id_expediente === solicitado)?.id_expediente ??
      data[0]?.id_expediente ??
      null
    await cargarRevision()
  } catch (causa) {
    error.value = mensaje(causa, 'No se pudieron cargar los expedientes.')
  } finally {
    cargando.value = false
  }
}
async function enviar() {
  if (enviando.value || !puedeEnviar.value || !actual.value) return
  errorFormulario.value = ''
  aviso.value = ''
  if (!archivo.value) {
    errorFormulario.value = 'Adjunta el documento corregido para continuar.'
    return
  }
  enviando.value = true
  const borrador = claveBorrador()
  const datos = new FormData()
  datos.append('detalle', comentarios.value.trim())
  datos.append('archivo_adjunto', archivo.value)
  try {
    await api.post(
      `/expedientes/${idExpediente.value}/revision-documentaria/observaciones/${idObservacion.value}/subsanaciones`,
      datos,
    )
    try {
      sessionStorage.removeItem(borrador)
    } catch {
      /* El envío no depende del almacenamiento del borrador. */
    }
    await cargar()
    aviso.value = 'Subsanación enviada correctamente.'
  } catch (causa) {
    errorFormulario.value = mensaje(
      causa,
      'No se pudo enviar la subsanación. Conservamos el formulario para que lo intentes nuevamente.',
    )
  } finally {
    enviando.value = false
  }
}
onMounted(cargar)
</script>

<template>
  <section class="observaciones-view" :aria-busy="cargando">
    <header class="page-heading">
      <div>
        <h1>Observaciones y Subsanaciones</h1>
        <p>
          Gestiona y responde a las observaciones emitidas durante la revisión de tu expediente.
        </p>
      </div>
      <div class="round-badge">
        <span class="material-symbols-outlined" aria-hidden="true">cycle</span
        ><strong>Ronda Actual:</strong><span>{{ ultimaRonda || 'Sin revisión' }}</span>
      </div>
    </header>
    <section class="card filters" aria-label="Filtros de observaciones">
      <span class="filter-label"
        ><span class="material-symbols-outlined" aria-hidden="true">filter_list</span>Filtros</span
      >
      <label v-if="expedientes.length > 1"
        ><span class="sr-only">Expediente</span
        ><select
          v-model="idExpediente"
          :disabled="cargando || enviando"
          @change="cambiarExpediente"
        >
          <option v-for="item in expedientes" :key="item.id_expediente" :value="item.id_expediente">
            {{ item.cod_expediente }}
          </option>
        </select></label
      >
      <label
        ><span class="sr-only">Evaluador</span
        ><select
          disabled
          title="Por ahora están disponibles las observaciones documentarias de UDI"
        >
          <option>UDI · Revisión documentaria</option>
        </select></label
      >
      <label
        ><span class="sr-only">Ronda</span
        ><select
          v-model="ronda"
          :disabled="cargando || enviando || !revision?.rondas.length"
          @change="cargarRevision"
        >
          <option v-if="!revision?.rondas.length" :value="null">Sin rondas registradas</option>
          <option
            v-for="item in revision?.rondas ?? []"
            :key="item.numero_ronda"
            :value="item.numero_ronda"
          >
            Ronda {{ item.numero_ronda }}
          </option>
        </select></label
      >
    </section>
    <p v-if="aviso" class="notice" role="status">{{ aviso }}</p>
    <p v-if="cargando" class="card empty" role="status">Cargando observaciones…</p>
    <div v-else-if="error" class="card empty" role="alert">
      <p>{{ error }}</p>
      <button class="button primary" @click="cargar">Reintentar</button>
    </div>
    <div v-else-if="!expedientes.length" class="card empty">
      <span class="material-symbols-outlined" aria-hidden="true">folder_open</span>
      <p>Aún no tienes expedientes registrados.</p>
      <RouterLink class="button primary" :to="{ name: 'expedientes-nuevo' }"
        >Registrar expediente</RouterLink
      >
    </div>
    <div v-else-if="!actual" class="card empty">
      <span class="material-symbols-outlined" aria-hidden="true">task_alt</span>
      <p>No hay observaciones registradas en esta ronda.</p>
    </div>
    <div v-else class="observations-grid">
      <article class="card active-card">
        <header class="evaluator-heading">
          <div class="evaluator">
            <span class="avatar">UDI</span>
            <div>
              <h2>Unidad de Investigación</h2>
              <p>{{ actual.requisito.nombre }}</p>
            </div>
          </div>
          <span class="status" :class="actual.observacion.estado"
            ><span class="status-dot"></span>{{ etiqueta(actual.observacion.estado) }}</span
          >
        </header>
        <div class="observation-body">
          <h3>Observación Emitida</h3>
          <p class="observation-text">{{ actual.observacion.detalle }}</p>
          <details v-if="actual.observacion.subsanaciones.length" class="attempts">
            <summary>Intentos anteriores ({{ actual.observacion.subsanaciones.length }})</summary>
            <div
              v-for="intento in actual.observacion.subsanaciones"
              :key="intento.id_subsanacion_documentaria"
            >
              <strong
                >Intento {{ intento.numero_intento }} ·
                {{ intento.resultado ?? 'Pendiente de revisión' }}</strong
              >
              <p v-if="intento.detalle">{{ intento.detalle }}</p>
            </div>
          </details>
        </div>
        <form v-if="puedeEnviar" class="correction-panel" @submit.prevent="enviar">
          <h2>
            <span class="material-symbols-outlined" aria-hidden="true">task_alt</span>Panel de
            Subsanación
          </h2>
          <label class="field" for="comentarios"
            >Comentarios al evaluador<textarea
              id="comentarios"
              v-model="comentarios"
              :disabled="enviando"
              placeholder="Detalle los cambios realizados según la observación..."
              rows="3"
            ></textarea>
          </label>
          <div class="field">
            <label for="documento-corregido">Cargar documento corregido</label
            ><label
              class="drop-zone"
              for="documento-corregido"
              @dragover.prevent
              @drop.prevent="soltarArchivo"
              ><span class="upload-icon material-symbols-outlined" aria-hidden="true"
                >cloud_upload</span
              ><span
                >{{ archivo ? archivo.name : 'Arrastra tu archivo aquí o' }}
                <span v-if="!archivo" class="browse">explora</span></span
              ><small>PDF, DOCX hasta 30 MiB</small
              ><input
                id="documento-corregido"
                ref="entradaArchivo"
                class="sr-only"
                type="file"
                accept=".pdf,.docx"
                :disabled="enviando"
                @change="validarArchivo(($event.target as HTMLInputElement).files?.[0] ?? null)"
            /></label>
          </div>
          <p v-if="errorFormulario" class="form-error" role="alert">{{ errorFormulario }}</p>
          <div class="form-actions">
            <button class="button" type="button" :disabled="enviando" @click="guardarBorrador">
              Guardar Borrador</button
            ><button class="button primary" type="submit" :disabled="enviando">
              <span class="material-symbols-outlined" aria-hidden="true">send</span
              >{{ enviando ? 'Enviando…' : 'Enviar Subsanación' }}
            </button>
          </div>
        </form>
        <div v-else class="correction-panel">
          <p>
            {{
              actual.observacion.estado === 'en_subsanacion'
                ? 'La subsanación está pendiente de revisión.'
                : actual.observacion.estado === 'cerrada'
                  ? 'Esta observación está cerrada.'
                  : !actual.observacion.es_subsanable
                    ? 'Esta observación no es subsanable.'
                    : 'El envío de subsanaciones no está habilitado para esta ronda o el estado actual del expediente.'
            }}
          </p>
        </div>
      </article>
      <aside class="other-observations" aria-label="Otras observaciones">
        <button
          v-for="item in otras"
          :key="item.observacion.id_observacion_documentaria"
          class="card other-card"
          :disabled="enviando"
          @click="seleccionar(item.observacion.id_observacion_documentaria)"
        >
          <span class="other-heading"
            ><span class="evaluator"
              ><span class="avatar small">UDI</span
              ><span
                ><strong>{{ item.requisito.nombre }}</strong
                ><small>Unidad de Investigación</small></span
              ></span
            ><span class="status" :class="item.observacion.estado"
              ><span class="status-dot"></span>{{ etiqueta(item.observacion.estado) }}</span
            ></span
          ><span class="other-copy">{{ item.observacion.detalle }}</span>
        </button>
        <div v-if="!otras.length" class="card other-card muted">
          <span class="material-symbols-outlined" aria-hidden="true">fact_check</span>
          <p>No hay otras observaciones en esta ronda.</p>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.observaciones-view {
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
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 32px;
}
h1 {
  font-size: 28px;
  line-height: 36px;
  color: #191c20;
  margin-bottom: 4px;
}
.page-heading p {
  color: #45464f;
}
.round-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border: 1px solid #c5c6d1;
  border-radius: 12px;
  background: white;
  font-size: 12px;
  white-space: nowrap;
  box-shadow: 0 2px 4px #0000000d;
}
.round-badge .material-symbols-outlined {
  color: #283a70;
}
.round-badge > span:last-child {
  background: #dce1ff;
  color: #283a70;
  padding: 4px 8px;
  border-radius: 2px;
}
.card {
  background: white;
  border: 1px solid #c5c6d1;
  border-radius: 8px;
  box-shadow: 0 2px 4px #0000000d;
}
.filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px;
  margin-bottom: 32px;
}
.filter-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 8px;
  color: #45464f;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
.filters label {
  flex: 1;
  min-width: 180px;
}
select {
  width: 100%;
  padding: 8px 16px;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  background: #f9f9ff;
  font-size: 14px;
  color: #191c20;
}
.observations-grid {
  display: grid;
  grid-template-columns: minmax(0, 2.08fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.active-card {
  overflow: hidden;
}
.evaluator-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  background: #f9f9ff;
  border-bottom: 1px solid #c5c6d1;
}
.evaluator {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}
.avatar {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #e8c26d;
  color: #251a00;
  font-weight: 700;
}
h2 {
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}
.evaluator p {
  color: #45464f;
  font-size: 12px;
  line-height: 16px;
}
.status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 4px 12px;
  border: 1px solid #757681;
  border-radius: 12px;
  background: #e2e2e8;
  font-size: 12px;
  line-height: 16px;
  font-weight: 600;
  color: #45464f;
}
.status.pendiente {
  border-color: #5a4300;
  background: #ffdf9b;
  color: #251a00;
}
.status.cerrada {
  border-color: #005045;
  background: #72f8df;
  color: #00201b;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.observation-body {
  padding: 20px;
}
.observation-body h3 {
  font-family: var(--siset-font-body);
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #45464f;
  margin-bottom: 8px;
}
.observation-text {
  padding: 16px;
  background: #ededf3;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.correction-panel {
  padding: 20px;
  background: #f3f3f9;
  border-top: 1px solid #c5c6d1;
}
.correction-panel h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.correction-panel h2 .material-symbols-outlined {
  color: #283a70;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
  font-size: 12px;
  line-height: 16px;
  color: #45464f;
}
textarea {
  width: 100%;
  resize: vertical;
  min-height: 90px;
  padding: 12px;
  background: white;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  font-size: 14px;
  line-height: 20px;
  color: #191c20;
}
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 24px;
  border: 2px dashed #c5c6d1;
  border-radius: 4px;
  background: #f9f9ff;
  cursor: pointer;
  text-align: center;
  font-size: 14px;
  line-height: 20px;
  overflow-wrap: anywhere;
}
.drop-zone:hover {
  background: #ededf3;
}
.drop-zone:focus-within {
  outline: 2px solid #283a70;
  outline-offset: 2px;
}
.upload-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #dce1ff;
  color: #283a70;
  margin-bottom: 8px;
}
.browse {
  color: #283a70;
  font-weight: 500;
  text-decoration: underline;
}
.drop-zone small {
  font-size: 11px;
  line-height: 14px;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 20px;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  background: transparent;
  color: #45464f;
  font-size: 12px;
  line-height: 16px;
  text-decoration: none;
}
.button:hover {
  background: #e2e2e8;
}
.button.primary {
  background: #283a70;
  color: white;
  border-color: #283a70;
}
.button.primary:hover {
  background: #405189;
}
.button .material-symbols-outlined {
  font-size: 18px;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
.other-observations {
  display: grid;
  gap: 24px;
}
.other-card {
  display: block;
  width: 100%;
  padding: 20px;
  text-align: left;
}
button.other-card:hover {
  border-color: #283a70;
}
.other-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}
.other-heading .evaluator {
  gap: 12px;
}
.avatar.small {
  width: 32px;
  height: 32px;
  background: #e2e2e8;
  color: #45464f;
  font-size: 11px;
}
.other-heading strong {
  display: block;
  font-size: 12px;
  line-height: 16px;
}
.other-heading small {
  display: block;
  font-size: 11px;
  line-height: 14px;
  color: #45464f;
}
.other-heading .status {
  font-size: 11px;
  padding: 2px 10px;
}
.other-copy {
  color: #45464f;
  font-size: 14px;
  line-height: 20px;
  font-style: italic;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.empty {
  display: grid;
  justify-items: center;
  gap: 16px;
  padding: 40px 20px;
  text-align: center;
}
.muted {
  color: #757681;
}
.notice,
.form-error {
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
}
.notice {
  color: #005045;
  background: #72f8df40;
}
.form-error {
  color: #93000a;
  background: #ffdad6;
}
.attempts {
  margin-top: 16px;
  font-size: 12px;
}
.attempts summary {
  cursor: pointer;
  color: #283a70;
}
.attempts > div {
  margin-top: 12px;
  padding: 12px;
  background: #f3f3f9;
  border-radius: 4px;
}
@media (max-width: 1199px) {
  .observations-grid {
    grid-template-columns: 1fr;
  }
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
@media (max-width: 600px) {
  .evaluator-heading {
    flex-wrap: wrap;
  }
  h1 {
    font-size: 24px;
    line-height: 32px;
  }
  .form-actions .button {
    flex: 1;
  }
  .filters label {
    flex-basis: 100%;
  }
}
</style>
