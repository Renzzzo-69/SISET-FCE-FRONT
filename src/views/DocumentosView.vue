<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import { useRoute } from 'vue-router'
import api, { descargarDocumentoPrivado } from '@/services/api'
import type { Expediente, ExpedienteDetalle, ExpedienteDetalleResponse } from '@/types/api'

interface Resolucion {
  id_resolucion: number
  id_expediente: number
  numero_resolucion: string
  tipo_resolucion: string | null
  fecha_emision: string | null
  estado: string
  archivo_pdf: string | null
}
interface Documento {
  id: string
  ruta: string
  fecha: string | null
  responsable: string | null
  nombre: string
  tipo: string
  formato: 'pdf' | 'docx' | null
  version: number | null
  activo: boolean
  origen?: string
  ronda?: number
  intento?: number
}
const route = useRoute()
const expedientes = ref<Expediente[]>([])
const seleccionado = ref<number | null>(null)
const detalle = ref<ExpedienteDetalle | null>(null)
const resoluciones = ref<Resolucion[]>([])
const cargando = ref(true)
const error = ref('')
const errorResoluciones = ref('')
const errorArchivo = ref('')
const ocupado = ref(false)
const tipo = ref('')
const estado = ref('')
const orden = ref('recientes')
const pagina = ref(1)
const porPagina = 5
const visor = ref<HTMLDialogElement | null>(null)
const vista = ref<{ url: string; nombre: string } | null>(null)
const documentos = ref<Documento[]>([])
const filtrados = computed(() => {
  const lista = documentos.value.filter(
    (item) =>
      (!tipo.value || item.tipo === tipo.value) &&
      (!estado.value || item.activo === (estado.value === 'activo')),
  )
  if (orden.value !== 'tramite')
    lista.sort((a, b) => {
      if (!a.fecha) return b.fecha ? 1 : 0
      if (!b.fecha) return -1
      return a.fecha.localeCompare(b.fecha) * (orden.value === 'recientes' ? -1 : 1)
    })
  return lista
})
const paginas = computed(() => Math.max(1, Math.ceil(filtrados.value.length / porPagina)))
const visibles = computed(() =>
  filtrados.value.slice((pagina.value - 1) * porPagina, pagina.value * porPagina),
)
watch([tipo, estado, orden], () => {
  pagina.value = 1
})
function limpiar() {
  tipo.value = ''
  estado.value = ''
  orden.value = 'recientes'
  pagina.value = 1
}
function fecha(valor: string | null) {
  if (!valor) return 'Fecha no disponible'
  const fecha = new Date(valor.slice(0, 10) + 'T12:00:00')
  return Number.isNaN(fecha.getTime())
    ? 'Fecha no disponible'
    : new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(fecha)
}
function tituloResolucion(valor: string | null) {
  return (
    (
      {
        designacion_jurados: 'Designación de jurados',
        aprobacion_proyecto: 'Aprobación del proyecto de tesis',
        aprobacion_tesis_final: 'Aprobación de tesis final',
        conformidad: 'Resolución de conformidad',
      } as Record<string, string>
    )[valor ?? ''] ??
    valor?.replaceAll('_', ' ') ??
    'Resolución institucional'
  )
}
async function cargarResoluciones() {
  errorResoluciones.value = ''
  resoluciones.value = []
  try {
    const { data } = await api.get<{ data: Resolucion[] }>('/resoluciones', {
      params: { id_expediente: seleccionado.value },
    })
    resoluciones.value = data.data
      .filter((item) => Number(item.id_expediente) === seleccionado.value)
      .map((item) => ({
        ...item,
        archivo_pdf:
          documentos.value.find(
            (documento) =>
              documento.id === `resolucion-${item.id_resolucion}` && documento.formato === 'pdf',
          )?.ruta ?? null,
      }))
  } catch {
    errorResoluciones.value = 'No se pudieron consultar las resoluciones de este expediente.'
  }
}
async function cargarDetalle() {
  if (seleccionado.value === null) return
  cargando.value = true
  error.value = ''
  errorArchivo.value = ''
  detalle.value = null
  resoluciones.value = []
  documentos.value = []
  limpiar()
  try {
    const { data } = await api.get<ExpedienteDetalleResponse>(`/expedientes/${seleccionado.value}`)
    detalle.value = data.data
    if (!data.data) throw new Error('Sin detalle')
    const biblioteca = await api.get<{ data: Documento[] }>(
      `/expedientes/${seleccionado.value}/documentos`,
    )
    documentos.value = biblioteca.data.data
    await cargarResoluciones()
  } catch (causa) {
    error.value = axios.isAxiosError(causa)
      ? causa.response?.data?.message || 'No se pudo cargar el expediente.'
      : 'No hay información de detalle disponible.'
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
    const solicitado = seleccionado.value ?? Number(route.query.expediente)
    seleccionado.value =
      data.find((item) => item.id_expediente === solicitado)?.id_expediente ??
      data[0]?.id_expediente ??
      null
    await cargarDetalle()
  } catch {
    error.value = 'No se pudieron cargar los expedientes.'
  } finally {
    cargando.value = false
  }
}
function cerrarVista() {
  visor.value?.close()
  if (vista.value?.url) URL.revokeObjectURL(vista.value.url)
  vista.value = null
}
async function abrirArchivo(ruta: string, nombre: string, descargar = false) {
  if (ocupado.value) return
  ocupado.value = true
  errorArchivo.value = ''
  try {
    const origen = new URL(import.meta.env.VITE_API_URL, window.location.origin).origin
    const url = new URL(ruta, origen)
    if (url.origin !== origen) throw new Error('Origen de documento no permitido')
    if (descargar) {
      await descargarDocumentoPrivado(url.toString(), nombre)
    } else {
      const { data } = await api.get<Blob>(url.toString(), { responseType: 'blob' })
      if (data.type.split(';')[0] === 'application/pdf') {
        cerrarVista()
        vista.value = { url: URL.createObjectURL(data), nombre }
        visor.value?.showModal()
      } else {
        throw new Error('Formato no compatible')
      }
    }
  } catch (causa) {
    errorArchivo.value =
      'No se pudo abrir el documento. Comprueba que esté disponible e inténtalo nuevamente.'
    if (axios.isAxiosError(causa)) {
      const respuesta = causa.response?.data
      if (respuesta instanceof Blob && respuesta.type.includes('json')) {
        try {
          const contenido = JSON.parse(await respuesta.text())
          if (typeof contenido.message === 'string') errorArchivo.value = contenido.message
        } catch {
          // Conserva el mensaje de respaldo si el servidor no devuelve un JSON válido.
        }
      }
    }
  } finally {
    ocupado.value = false
  }
}
onMounted(cargar)
onBeforeUnmount(cerrarVista)
</script>

<template>
  <section class="documents-view" :aria-busy="cargando">
    <header class="page-heading">
      <div>
        <h1>Documentos y Resoluciones</h1>
        <p>
          Consulte y descargue las solicitudes, informes de proyecto, informes de tesis,
          resoluciones y demás documentos tramitados en su expediente.
        </p>
      </div>
    </header>
    <label v-if="expedientes.length > 1" class="file-picker"
      >Expediente<select
        v-model="seleccionado"
        :disabled="cargando || ocupado"
        @change="cargarDetalle"
      >
        <option v-for="item in expedientes" :key="item.id_expediente" :value="item.id_expediente">
          {{ item.cod_expediente }}
        </option>
      </select></label
    >
    <div class="card filters">
      <span
        ><span class="material-symbols-outlined" aria-hidden="true">filter_list</span>Filtros:</span
      ><label
        ><span class="sr-only">Tipo de Documento</span
        ><select v-model="tipo">
          <option value="">Tipo de Documento</option>
          <option value="proyecto">Informe de proyecto</option>
          <option value="tesis">Informe de tesis</option>
          <option value="carta">Carta de aceptación</option>
          <option value="solicitud">Solicitud</option>
          <option value="subsanacion">Subsanación</option>
          <option value="conformidad">Conformidad técnica</option>
          <option value="turnitin">Informe Turnitin</option>
          <option value="propuesta">Propuesta de jurados</option>
          <option value="observacion_jurado">Observaciones de jurados</option>
          <option value="resolucion">Resolución</option>
        </select></label
      ><label
        ><span class="sr-only">Estado</span
        ><select v-model="estado">
          <option value="">Estado</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select></label
      ><label
        ><span class="sr-only">Orden de documentos</span
        ><select v-model="orden">
          <option value="tramite">Orden del trámite</option>
          <option value="recientes">Más recientes primero</option>
          <option value="antiguos">Más antiguos primero</option>
        </select></label
      ><button class="clear-button" @click="limpiar">Limpiar</button>
    </div>
    <p v-if="ocupado" role="status">Abriendo documento…</p>
    <p v-if="errorArchivo" class="error" role="alert">{{ errorArchivo }}</p>
    <p v-if="cargando" class="card empty" role="status">Cargando documentos…</p>
    <div v-else-if="error" class="card empty" role="alert">
      <p>{{ error }}</p>
      <button class="button" @click="cargar">Reintentar</button>
    </div>
    <div v-else-if="!detalle" class="card empty">
      <p>Aún no hay documentos para consultar porque no tienes un expediente registrado.</p>
    </div>
    <template v-else>
      <p class="library-context">
        {{ detalle.cod_expediente }} · {{ detalle.etapa_actual?.nombre }} ·
        {{ detalle.estado_actual?.nombre }}. Se muestran los archivos registrados en cada etapa,
        incluidas sus correcciones y versiones anteriores.
      </p>
      <h2>
        <span class="material-symbols-outlined" aria-hidden="true">folder_open</span>Archivos del
        Expediente
      </h2>
      <div class="card table-card">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nombre del Documento</th>
                <th>Formato</th>
                <th>Versión</th>
                <th>Fecha de Subida</th>
                <th>Responsable</th>
                <th class="actions-title">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in visibles" :key="item.id">
                <td>
                  <span class="document-name"
                    ><span class="material-symbols-outlined" aria-hidden="true">description</span
                    >{{ item.nombre }}</span
                  >
                  <small class="document-context">
                    {{ item.origen || 'Expediente'
                    }}<template v-if="item.ronda"> · Ronda {{ item.ronda }}</template
                    ><template v-if="item.intento"> · Intento {{ item.intento }}</template>
                  </small>
                </td>
                <td>{{ item.formato?.toUpperCase() || 'No disponible' }}</td>
                <td>
                  <span
                    v-if="item.version != null"
                    class="version"
                    :class="{ active: item.activo }"
                    title="Versión del documento"
                    >V{{ item.version }}</span
                  >
                  <span
                    v-else
                    class="muted"
                    title="Este registro tiene ronda de revisión, sin versión documental"
                    >—</span
                  >
                </td>
                <td class="muted">{{ item.fecha ? fecha(item.fecha) : 'No disponible' }}</td>
                <td class="muted">{{ item.responsable || 'No disponible' }}</td>
                <td>
                  <div class="actions">
                    <button
                      v-if="item.formato === 'pdf'"
                      :disabled="ocupado"
                      :aria-label="`Ver ${item.nombre}`"
                      title="Previsualizar documento"
                      @click="abrirArchivo(item.ruta, item.nombre)"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true"
                        >visibility</span
                      ></button
                    ><button
                      :disabled="ocupado"
                      :aria-label="`Descargar ${item.nombre}`"
                      title="Descargar"
                      @click="abrirArchivo(item.ruta, item.nombre, true)"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">download</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!visibles.length">
                <td colspan="6" class="empty">
                  {{
                    documentos.length
                      ? 'No hay documentos que coincidan con los filtros.'
                      : 'No hay archivos adjuntos disponibles.'
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="table-footer">
          <span
            >Mostrando {{ filtrados.length ? (pagina - 1) * porPagina + 1 : 0 }} a
            {{ Math.min(pagina * porPagina, filtrados.length) }} de
            {{ filtrados.length }} registros</span
          >
          <nav aria-label="Paginación de archivos">
            <button :disabled="pagina === 1" @click="pagina--">Anterior</button
            ><span class="current-page" aria-current="page">{{ pagina }}</span
            ><button :disabled="pagina >= paginas" @click="pagina++">Siguiente</button>
          </nav>
        </div>
      </div>
      <h2 class="resolutions-heading">
        <span class="material-symbols-outlined" aria-hidden="true">gavel</span>Resoluciones
        Institucionales
      </h2>
      <div v-if="errorResoluciones" class="card empty" role="alert">
        <p>{{ errorResoluciones }}</p>
        <button class="button" @click="cargarResoluciones">Reintentar</button>
      </div>
      <div v-else class="resolutions-grid">
        <article
          v-for="resolucion in resoluciones"
          :key="resolucion.id_resolucion"
          class="card resolution"
        >
          <div class="resolution-meta">
            <span class="badge" :class="{ approved: resolucion.estado === 'vigente' }"
              ><span class="material-symbols-outlined" aria-hidden="true">{{
                resolucion.estado === 'vigente' ? 'verified' : 'info'
              }}</span
              >{{ resolucion.estado || 'Sin estado' }}</span
            ><time>{{ fecha(resolucion.fecha_emision) }}</time>
          </div>
          <h3>Resolución {{ resolucion.numero_resolucion }}</h3>
          <p>{{ tituloResolucion(resolucion.tipo_resolucion) }}</p>
          <div class="resolution-action">
            <button
              class="button"
              :disabled="ocupado || !resolucion.archivo_pdf"
              @click="
                resolucion.archivo_pdf &&
                abrirArchivo(resolucion.archivo_pdf, resolucion.numero_resolucion)
              "
            >
              <span class="material-symbols-outlined" aria-hidden="true">{{
                resolucion.archivo_pdf ? 'visibility' : 'hourglass_empty'
              }}</span
              >{{ resolucion.archivo_pdf ? 'Ver Documento' : 'Documento no disponible' }}
            </button>
          </div>
        </article>
        <div class="card empty resolution-placeholder">
          <span class="placeholder-icon material-symbols-outlined" aria-hidden="true"
            >history_edu</span
          >
          <p>
            {{
              resoluciones.length
                ? 'No hay más resoluciones vinculadas a este expediente por el momento.'
                : 'No hay resoluciones vinculadas a este expediente por el momento.'
            }}
          </p>
        </div>
      </div>
    </template>
    <dialog
      ref="visor"
      class="document-dialog"
      aria-labelledby="preview-title"
      @close="cerrarVista"
    >
      <header>
        <h2 id="preview-title">{{ vista?.nombre }}</h2>
        <button class="button" @click="cerrarVista">Cerrar</button>
      </header>
      <iframe v-if="vista?.url" :src="vista.url" :title="vista.nombre"></iframe>
    </dialog>
  </section>
</template>

<style scoped>
.library-context {
  margin-bottom: 20px;
  color: #45464f;
}
.document-context {
  display: block;
  margin: 4px 0 0 36px;
  color: #757681;
  font-size: 12px;
}
.documents-view {
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
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 32px;
}
h1 {
  color: #283a70;
  font-size: 28px;
  line-height: 36px;
  margin-bottom: 4px;
}
.page-heading p {
  color: #45464f;
}
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  color: #191c20;
  background: #f9f9ff;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  font-size: 12px;
  line-height: 16px;
  text-decoration: none;
}
.button .material-symbols-outlined {
  font-size: 18px;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.card {
  border: 1px solid #c5c6d1;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 4px #0000000d;
}
.filters {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  margin-bottom: 24px;
}
.filters > span {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #45464f;
  font-size: 12px;
}
.filters .material-symbols-outlined {
  font-size: 18px;
}
.filters label {
  flex: 1;
  min-width: 0;
}
select {
  width: 100%;
  padding: 8px 12px;
  background: #f9f9ff;
  color: #191c20;
  border: 1px solid #c5c6d1;
  border-radius: 2px;
  font-size: 14px;
}
.clear-button {
  padding: 8px 16px;
  border: 0;
  background: transparent;
  color: #283a70;
  font-size: 12px;
}
h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  margin-bottom: 16px;
}
h2 .material-symbols-outlined {
  color: #283a70;
}
.table-card {
  overflow: hidden;
}
.table-scroll {
  overflow-x: auto;
}
table {
  border-collapse: collapse;
  width: 100%;
  text-align: left;
}
th {
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #45464f;
  background: #ededf3;
}
th,
td {
  padding: 16px 24px;
  border-bottom: 1px solid #c5c6d1;
}
.document-name {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 220px;
  font-weight: 500;
  overflow-wrap: anywhere;
}
.document-name .material-symbols-outlined {
  color: #ba1a1a;
}
.muted {
  color: #757681;
}
.version {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  background: #e7e8ee;
  color: #45464f;
  font-size: 11px;
  line-height: 14px;
}
.version.active {
  border: 1px solid #283a70;
  color: #283a70;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.actions button {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #45464f;
}
.actions button:hover {
  background: #ededf3;
  color: #283a70;
}
.actions .material-symbols-outlined {
  font-size: 20px;
}
.actions-title {
  text-align: right;
}
.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px;
  color: #45464f;
}
.table-footer nav {
  display: flex;
  align-items: center;
  gap: 4px;
}
.table-footer button {
  padding: 4px 12px;
  border: 1px solid #c5c6d1;
  border-radius: 2px;
  background: white;
  font-size: 14px;
}
.current-page {
  padding: 4px 12px;
  background: #283a70;
  color: white;
  border-radius: 2px;
}
.resolutions-heading {
  margin-top: 40px;
}
.resolutions-heading .material-symbols-outlined {
  color: #6b5000;
}
.resolutions-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}
.resolution {
  display: flex;
  flex-direction: column;
  padding: 24px;
  min-height: 280px;
}
.resolution-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 11px;
  line-height: 14px;
  color: #45464f;
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #6b5000;
  border-radius: 12px;
  padding: 4px 10px;
  color: #6b5000;
  background: #6b50001a;
  text-transform: capitalize;
}
.badge.approved {
  background: #006b5c1a;
  color: #006b5c;
  border-color: #006b5c;
}
.badge .material-symbols-outlined {
  font-size: 14px;
}
.resolution h3 {
  color: #283a70;
  font-size: 16px;
  line-height: 24px;
  margin-bottom: 8px;
}
.resolution > p {
  flex: 1;
  margin-bottom: 24px;
  color: #45464f;
}
.resolution-action {
  padding-top: 16px;
  border-top: 1px solid #c5c6d1;
}
.resolution-action .button {
  width: 100%;
}
.empty {
  padding: 32px 24px;
  text-align: center;
}
div.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.resolution-placeholder {
  min-height: 220px;
  border-style: dashed;
  color: #45464f;
}
.placeholder-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  background: #ededf3;
  border-radius: 12px;
  color: #757681;
}
.file-picker {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.file-picker select {
  width: auto;
}
.error {
  padding: 16px;
  margin-bottom: 16px;
  background: #ffdad6;
  color: #93000a;
  border-radius: 4px;
}
.document-dialog {
  width: min(1000px, 95vw);
  height: 85dvh;
  padding: 16px;
  border: 1px solid #c5c6d1;
  border-radius: 8px;
}
.document-dialog::backdrop {
  background: #191c2080;
}
.document-dialog header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.document-dialog h2 {
  margin: 0;
  overflow-wrap: anywhere;
}
.document-dialog iframe {
  width: 100%;
  height: calc(100% - 64px);
  border: 0;
}
@media (max-width: 1100px) {
  .resolutions-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
@media (max-width: 600px) {
  .filters {
    flex-wrap: wrap;
  }
  .filters label {
    flex-basis: 100%;
  }
  .resolutions-grid {
    grid-template-columns: 1fr;
  }
  .table-footer {
    flex-wrap: wrap;
  }
  h1 {
    font-size: 24px;
    line-height: 32px;
  }
}
</style>
