<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

import api from '@/services/api'
import type { Expediente, ParticipanteExpediente } from '@/types/api'

const ETAPAS_FILTRO = [
  { codigo: 'registro_expediente_digital', etiqueta: 'Registro de expediente digital' },
  { codigo: 'revision_requisitos_documentarios', etiqueta: 'Revisión de requisitos documentarios' },
]

const ESTADOS_FILTRO = [
  { codigo: 'pendiente_derivacion', etiqueta: 'Pendiente de derivación' },
  { codigo: 'derivado_udi', etiqueta: 'Derivado a UDI' },
  { codigo: 'en_revision', etiqueta: 'En revisión' },
  { codigo: 'observado', etiqueta: 'Observado' },
  { codigo: 'pendiente_subsanacion', etiqueta: 'Pendiente de subsanación' },
  { codigo: 'conforme', etiqueta: 'Conforme' },
]

const router = useRouter()
const expedientes = ref<Expediente[]>([])
const filtros = ref({ codigo: '', etapa: '', estado: '' })
const busquedaTesista = ref('')
const cargando = ref(false)
const mensajeError = ref('')

const opcionesEtapa = computed(() => {
  const opciones = new Map(ETAPAS_FILTRO.map((opcion) => [opcion.codigo, opcion]))

  for (const expediente of expedientes.value) {
    const etapa = expediente.etapa
    if (etapa && !opciones.has(etapa.codigo)) {
      opciones.set(etapa.codigo, { codigo: etapa.codigo, etiqueta: etapa.nombre })
    }
  }

  return [...opciones.values()]
})

const opcionesEstado = computed(() => {
  const opciones = new Map(ESTADOS_FILTRO.map((opcion) => [opcion.codigo, opcion]))

  for (const expediente of expedientes.value) {
    const estado = expediente.estado_actual
    if (estado && !opciones.has(estado.codigo)) {
      opciones.set(estado.codigo, { codigo: estado.codigo, etiqueta: estado.nombre })
    }
  }

  return [...opciones.values()]
})

const expedientesFiltrados = computed(() => {
  const busqueda = normalizarTexto(busquedaTesista.value)

  if (!busqueda) return expedientes.value

  return expedientes.value.filter((expediente) =>
    [expediente.tesista, expediente.co_tesista]
      .filter((participante): participante is ParticipanteExpediente => participante !== null)
      .some((participante) => normalizarTexto(nombreParticipante(participante)).includes(busqueda)),
  )
})

function nombreParticipante(participante: ParticipanteExpediente | null) {
  return participante
    ? [participante.apellido_paterno, participante.apellido_materno, participante.nombres]
        .filter(Boolean)
        .join(' ')
    : 'No registrado'
}

function normalizarTexto(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-PE')
}

function etiquetaEtapa(expediente: Expediente) {
  const etapa = expediente.etapa
  if (!etapa) return 'No disponible'

  return (
    etapa.nombre ??
    ETAPAS_FILTRO.find((opcion) => opcion.codigo === etapa.codigo)?.etiqueta ??
    'No disponible'
  )
}

function etiquetaEstado(expediente: Expediente) {
  const estado = expediente.estado_actual
  if (!estado) return 'No disponible'

  return ESTADOS_FILTRO.find((opcion) => opcion.codigo === estado.codigo)?.etiqueta ?? estado.nombre
}

function claseEstado(codigo: string | undefined) {
  if (codigo === 'conforme') return 'is-success'
  if (codigo === 'observado') return 'is-error'
  if (codigo === 'pendiente_derivacion' || codigo === 'pendiente_subsanacion') return 'is-warning'
  if (codigo === 'derivado_udi' || codigo === 'en_revision') return 'is-primary'
  return 'is-muted'
}

function mensajeDesdeError(error: unknown) {
  if (!axios.isAxiosError(error)) return 'No se pudo cargar la bandeja UDI.'

  switch (error.response?.status) {
    case 401:
      return 'La sesión expiró. Inicie sesión nuevamente.'
    case 403:
      return 'No tiene autorización para consultar la bandeja UDI.'
    case 404:
      return 'Uno de los expedientes ya no está disponible.'
    case 422:
      return error.response.data?.message ?? 'Los filtros enviados no son válidos.'
    default:
      return error.response?.data?.message ?? 'No se pudo cargar la bandeja UDI.'
  }
}

function parametrosFiltros() {
  const parametros: Record<string, string> = {}

  if (filtros.value.codigo !== '') parametros.codigo = filtros.value.codigo
  if (filtros.value.etapa !== '') parametros.etapa = filtros.value.etapa
  if (filtros.value.estado !== '') parametros.estado = filtros.value.estado

  return parametros
}

async function cargarExpedientes() {
  cargando.value = true
  mensajeError.value = ''

  try {
    const { data } = await api.get<Expediente[]>('/expedientes', { params: parametrosFiltros() })
    expedientes.value = data
  } catch (error) {
    expedientes.value = []
    mensajeError.value = mensajeDesdeError(error)
  } finally {
    cargando.value = false
  }
}

function limpiarFiltros() {
  filtros.value = { codigo: '', etapa: '', estado: '' }
  busquedaTesista.value = ''
  cargarExpedientes()
}

onMounted(cargarExpedientes)
</script>

<template>
  <section class="udi-inbox" aria-labelledby="udi-inbox-title">
    <header class="inbox-heading">
      <div>
        <p class="eyebrow">Unidad de Investigación</p>
        <h1 id="udi-inbox-title">Bandeja UDI</h1>
        <p class="intro">Revise los expedientes disponibles y gestione su revisión documentaria.</p>
      </div>
      <button type="button" class="context-action" @click="router.push({ name: 'dashboard' })">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
        Volver al panel
      </button>
    </header>

    <form class="filter-card" @submit.prevent="cargarExpedientes">
      <div class="filters-grid">
        <label class="filter-field">
          <span>N.º de expediente</span>
          <input
            v-model.trim="filtros.codigo"
            type="number"
            min="1"
            inputmode="numeric"
            placeholder="Ej. 123"
            :disabled="cargando"
          />
        </label>

        <label class="filter-field">
          <span>Tesista</span>
          <input
            v-model.trim="busquedaTesista"
            type="search"
            placeholder="Buscar por nombre"
            autocomplete="off"
            :disabled="cargando"
          />
        </label>

        <label class="filter-field">
          <span>Etapa</span>
          <select v-model="filtros.etapa" :disabled="cargando">
            <option value="">Todas las etapas</option>
            <option v-for="opcion in opcionesEtapa" :key="opcion.codigo" :value="opcion.codigo">
              {{ opcion.etiqueta }}
            </option>
          </select>
        </label>

        <label class="filter-field">
          <span>Estado</span>
          <select v-model="filtros.estado" :disabled="cargando">
            <option value="">Todos los estados</option>
            <option v-for="opcion in opcionesEstado" :key="opcion.codigo" :value="opcion.codigo">
              {{ opcion.etiqueta }}
            </option>
          </select>
        </label>

        <div class="filter-actions">
          <button type="submit" class="filter-button" :disabled="cargando">
            <span class="material-symbols-outlined" aria-hidden="true">search</span>
            {{ cargando ? 'Buscando…' : 'Filtrar' }}
          </button>
          <button type="button" class="clear-button" :disabled="cargando" @click="limpiarFiltros">
            Limpiar
          </button>
        </div>
      </div>
    </form>

    <div v-if="cargando" class="interface-state loading-state" role="status" aria-live="polite">
      <span class="state-icon material-symbols-outlined" aria-hidden="true">hourglass_top</span>
      <div>
        <h2>Cargando bandeja UDI</h2>
        <p>Estamos consultando los expedientes disponibles para revisión documentaria.</p>
      </div>
    </div>

    <div v-else-if="mensajeError" class="interface-state error-state" role="alert">
      <span class="state-icon material-symbols-outlined" aria-hidden="true">error</span>
      <div>
        <h2>No se pudo cargar la bandeja</h2>
        <p>{{ mensajeError }}</p>
        <button type="button" class="retry-button" @click="cargarExpedientes">Reintentar</button>
      </div>
    </div>

    <div v-else-if="!expedientes.length" class="interface-state empty-state" role="status">
      <span class="state-icon material-symbols-outlined" aria-hidden="true">inbox</span>
      <div>
        <h2>Sin expedientes disponibles</h2>
        <p>No hay expedientes para los filtros seleccionados.</p>
      </div>
    </div>

    <div v-else-if="!expedientesFiltrados.length" class="interface-state empty-state" role="status">
      <span class="state-icon material-symbols-outlined" aria-hidden="true">person_search</span>
      <div>
        <h2>No se encontraron tesistas</h2>
        <p>
          No hay resultados para “{{ busquedaTesista }}”. Pruebe con otro nombre o limpie la
          búsqueda.
        </p>
        <button type="button" class="text-action" @click="busquedaTesista = ''">
          Limpiar búsqueda
        </button>
      </div>
    </div>

    <section
      v-else
      class="table-card"
      aria-label="Expedientes disponibles para revisión documentaria"
    >
      <div class="table-wrapper">
        <table>
          <caption class="sr-only">
            Expedientes disponibles para revisión documentaria UDI
          </caption>
          <thead>
            <tr>
              <th scope="col">Expediente</th>
              <th scope="col">Tesistas</th>
              <th scope="col">Etapa</th>
              <th scope="col">Estado</th>
              <th scope="col">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="expediente in expedientesFiltrados" :key="expediente.id_expediente">
              <td>
                <strong class="expediente-code">{{ expediente.cod_expediente }}</strong>
              </td>
              <td>
                <div class="tesistas">
                  <div class="tesista">
                    <span class="tesista-label">Tesista 1</span>
                    <span class="tesista-name">{{ nombreParticipante(expediente.tesista) }}</span>
                  </div>
                  <div class="tesista">
                    <span class="tesista-label">Tesista 2</span>
                    <span class="tesista-name">{{
                      nombreParticipante(expediente.co_tesista)
                    }}</span>
                  </div>
                </div>
              </td>
              <td>
                <span class="etapa-label">{{ etiquetaEtapa(expediente) }}</span>
              </td>
              <td>
                <span class="status-badge" :class="claseEstado(expediente.estado_actual?.codigo)">
                  {{ etiquetaEstado(expediente) }}
                </span>
              </td>
              <td class="action-cell">
                <button
                  type="button"
                  class="review-button"
                  @click="
                    router.push({ name: 'udi-revision', params: { id: expediente.id_expediente } })
                  "
                >
                  Revisar
                  <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<style scoped>
.udi-inbox {
  display: grid;
  width: min(100%, 90rem);
  gap: var(--siset-space-6);
  margin: 0 auto;
}

.inbox-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--siset-space-4);
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  color: var(--siset-color-primary);
}

h2 {
  color: var(--siset-color-text);
  font-size: 1.125rem;
}

.eyebrow {
  color: var(--siset-color-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.intro {
  margin-top: var(--siset-space-1);
  color: var(--siset-color-text-muted);
}

.context-action,
.filter-button,
.clear-button,
.retry-button,
.text-action,
.review-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--siset-space-2);
  min-height: var(--siset-space-10);
  padding: var(--siset-space-2) var(--siset-space-4);
  font-weight: 700;
  border-radius: var(--siset-radius-lg);
}

.context-action,
.clear-button {
  color: var(--siset-color-primary);
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border-strong);
}

.context-action:hover,
.clear-button:hover {
  background: var(--siset-color-surface-muted);
}

.filter-card,
.table-card {
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-xl);
  box-shadow: var(--siset-shadow-sm);
}

.filter-card {
  padding: var(--siset-space-5);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: end;
  gap: var(--siset-space-4);
}

.filter-field {
  display: grid;
  min-width: 0;
  gap: var(--siset-space-2);
}

.filter-field > span {
  color: var(--siset-color-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.filter-field input,
.filter-field select {
  width: 100%;
  min-width: 0;
  min-height: var(--siset-space-10);
  padding: var(--siset-space-2) var(--siset-space-3);
  color: var(--siset-color-text);
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-lg);
}

.filter-field input::placeholder {
  color: var(--siset-color-text-muted);
}

.filter-field input:hover,
.filter-field select:hover {
  border-color: var(--siset-color-border-strong);
}

.filter-actions {
  display: flex;
  gap: var(--siset-space-2);
}

.filter-button,
.retry-button,
.review-button {
  color: var(--siset-color-surface);
  background: var(--siset-color-primary);
  border: 1px solid var(--siset-color-primary);
}

.filter-button:hover,
.retry-button:hover,
.review-button:hover {
  background: var(--siset-color-primary-container);
  border-color: var(--siset-color-primary-container);
}

.filter-button:disabled,
.clear-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.interface-state {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: var(--siset-space-4);
  min-height: 10rem;
  padding: var(--siset-space-5);
  color: var(--siset-color-text-muted);
  background: var(--siset-color-surface-muted);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-xl);
}

.interface-state p {
  margin-top: var(--siset-space-1);
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

.error-state h2,
.error-state .state-icon {
  color: var(--siset-color-error);
}

.retry-button,
.text-action {
  margin-top: var(--siset-space-3);
}

.text-action {
  min-height: auto;
  padding: 0;
  color: var(--siset-color-primary);
  background: transparent;
  border: 0;
  border-radius: 0;
}

.text-action:hover {
  text-decoration: underline;
}

.table-card {
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 48rem;
  border-collapse: collapse;
}

th,
td {
  padding: var(--siset-space-4) var(--siset-space-5);
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid var(--siset-color-border);
}

th {
  color: var(--siset-color-primary);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: var(--siset-color-surface-muted);
}

tbody tr {
  transition:
    background-color 160ms ease,
    box-shadow 160ms ease;
}

tbody tr:hover,
tbody tr:focus-within {
  background: var(--siset-color-surface-muted);
  box-shadow: inset var(--siset-space-1) 0 0 var(--siset-color-primary);
}

tbody tr:last-child td {
  border-bottom: 0;
}

.expediente-code {
  color: var(--siset-color-primary);
  font-family: var(--siset-font-heading);
  font-size: 1rem;
  white-space: nowrap;
}

.tesistas {
  display: grid;
  min-width: 14rem;
  gap: var(--siset-space-2);
}

.tesista {
  display: grid;
  gap: var(--siset-space-1);
}

.tesista-label {
  color: var(--siset-color-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.tesista-name,
.etapa-label {
  color: var(--siset-color-text);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--siset-space-2);
  padding: var(--siset-space-1) var(--siset-space-2);
  color: var(--siset-color-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
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

.status-badge.is-success {
  color: var(--siset-color-success);
  background: var(--siset-color-success-container);
  border-color: var(--siset-color-success);
}

.status-badge.is-warning {
  color: var(--siset-color-warning);
  background: var(--siset-color-warning-container);
  border-color: var(--siset-color-warning);
}

.status-badge.is-error {
  color: var(--siset-color-error);
  background: var(--siset-color-error-container);
  border-color: var(--siset-color-error);
}

.action-cell {
  text-align: right;
  white-space: nowrap;
}

.review-button {
  min-height: auto;
}

.review-button .material-symbols-outlined,
.filter-button .material-symbols-outlined,
.context-action .material-symbols-outlined {
  font-size: 1.125rem;
}

@media (max-width: 90rem) {
  .filters-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-actions {
    grid-column: span 2;
  }
}

@media (max-width: 48rem) {
  .inbox-heading,
  .filter-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .context-action,
  .filter-button,
  .clear-button {
    width: 100%;
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    grid-column: auto;
  }

  .filter-card,
  th,
  td {
    padding: var(--siset-space-4);
  }

  .interface-state {
    grid-template-columns: 1fr;
  }
}
</style>
