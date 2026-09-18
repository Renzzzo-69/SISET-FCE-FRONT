<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { RouterLink } from 'vue-router'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Expediente, ParticipanteExpediente } from '@/types/api'
const ESTADOS_ATENCION = new Set([
  'pendiente_derivacion',
  'derivado_udi',
  'en_revision',
  'observado',
  'pendiente_subsanacion',
])
const auth = useAuthStore()
const expedientes = ref<Expediente[]>([])
const cargando = ref(false)
const mensajeError = ref('')
const esUdi = computed(() => auth.tieneRol('udi', 'administrador'))
const roles = computed(() => auth.usuario?.roles ?? [])
const metricas = computed(() => ({
  expedientesVisibles: expedientes.value.length,
  requierenAtencion: expedientes.value.filter((expediente) =>
    ESTADOS_ATENCION.has(expediente.estado_actual?.codigo ?? ''),
  ).length,
  enRevision: expedientes.value.filter((expediente) => expediente.estado_actual?.codigo === 'en_revision').length,
  observados: expedientes.value.filter((expediente) => expediente.estado_actual?.codigo === 'observado').length,
}))
const expedientesAtencion = computed(() =>
  expedientes.value.filter((expediente) => ESTADOS_ATENCION.has(expediente.estado_actual?.codigo ?? '')).slice(0, 5),
)
const distribucionEstados = computed(() => {
  const resumen = new Map<string, { codigo: string; etiqueta: string; total: number }>()
  for (const expediente of expedientes.value) {
    const codigo = expediente.estado_actual?.codigo ?? 'sin_estado'
    const existente = resumen.get(codigo)
    if (existente) {
      existente.total += 1
    } else {
      resumen.set(codigo, {
        codigo,
        etiqueta: expediente.estado_actual?.nombre ?? 'Sin estado informado',
        total: 1,
      })
    }
  }
  return [...resumen.values()].sort((primero, segundo) => segundo.total - primero.total)
})
function nombreParticipante(participante: ParticipanteExpediente | null) {
  if (!participante) return 'Sin tesista registrado'
  return [participante.apellido_paterno, participante.apellido_materno, participante.nombres].filter(Boolean).join(' ')
}
function mensajeDesdeError(error: unknown) {
  if (!axios.isAxiosError(error)) return 'No se pudo cargar el panel UDI.'
  if (error.response?.status === 401) {
    return 'La sesión expiró. Inicie sesión nuevamente.'
  }
  if (error.response?.status === 403) {
    return 'No tiene autorización para consultar el panel UDI.'
  }
  return error.response?.data?.message ?? 'No se pudo cargar el panel UDI.'
}
async function cargarDashboard() {
  if (!esUdi.value) return
  cargando.value = true
  mensajeError.value = ''
  try {
    const respuestaExpedientes = await api.get<Expediente[]>('/expedientes')
    expedientes.value = respuestaExpedientes.data
  } catch (error) {
    expedientes.value = []
    mensajeError.value = mensajeDesdeError(error)
  } finally {
    cargando.value = false
  }
}
onMounted(cargarDashboard)
</script>
<template>
  <div class="panel-view">
    <section v-if="esUdi" class="udi-dashboard" aria-labelledby="dashboard-title">
      <header class="dashboard-heading">
        <div>
          <p class="eyebrow">Unidad de Investigación</p>
          <h1 id="dashboard-title">Panel UDI</h1>
          <p class="intro">Gestión de expedientes disponibles para su cuenta.</p>
        </div>
        <button class="dashboard-update" type="button" :disabled="cargando" @click="cargarDashboard">
          <span class="material-symbols-outlined" aria-hidden="true">refresh</span>
          {{ cargando ? 'Actualizando…' : 'Actualizar' }}
        </button>
      </header>
      <p v-if="cargando" class="state" role="status">Cargando información del panel UDI…</p>
      <div v-else-if="mensajeError" class="message error" role="alert">
        <p>{{ mensajeError }}</p>
        <button type="button" @click="cargarDashboard">Reintentar</button>
      </div>
      <template v-else>
        <div class="metrics-grid" aria-label="Métricas del panel UDI">
          <article class="metric-card primary">
            <div class="metric-copy">
              <p>Expedientes visibles</p>
              <strong>{{ metricas.expedientesVisibles }}</strong>
            </div>
            <span class="metric-icon material-symbols-outlined" aria-hidden="true">folder_open</span>
          </article>
          <article class="metric-card secondary">
            <div class="metric-copy">
              <p>Requieren atención</p>
              <strong>{{ metricas.requierenAtencion }}</strong>
            </div>
            <span class="metric-icon material-symbols-outlined" aria-hidden="true">notification_important</span>
          </article>
          <article class="metric-card warning">
            <div class="metric-copy">
              <p>En revisión</p>
              <strong>{{ metricas.enRevision }}</strong>
            </div>
            <span class="metric-icon material-symbols-outlined" aria-hidden="true">rate_review</span>
          </article>
          <article class="metric-card error-card">
            <div class="metric-copy">
              <p>Observados</p>
              <strong>{{ metricas.observados }}</strong>
            </div>
            <span class="metric-icon material-symbols-outlined" aria-hidden="true">report</span>
          </article>
        </div>
        <div class="dashboard-grid">
          <section class="dashboard-panel attention-section" aria-labelledby="attention-title">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Seguimiento operativo</p>
                <h2 id="attention-title">Expedientes que requieren atención</h2>
              </div>
              <RouterLink class="text-action" :to="{ name: 'udi-expedientes' }">Ver todos</RouterLink>
            </div>
            <div v-if="expedientesAtencion.length" class="attention-list">
              <article v-for="expediente in expedientesAtencion" :key="expediente.id_expediente" class="attention-item">
                <span class="expediente-code">{{ expediente.cod_expediente }}</span>
                <div class="attention-details">
                  <h3>Expediente {{ expediente.cod_expediente }}</h3>
                  <p>{{ nombreParticipante(expediente.tesista) }}</p>
                  <span class="status-label">{{ expediente.estado_actual?.nombre ?? 'Sin estado informado' }}</span>
                </div>
                <RouterLink
                  class="manage-action"
                  :to="{ name: 'udi-revision', params: { id: expediente.id_expediente } }"
                >
                  Gestionar
                </RouterLink>
              </article>
            </div>
            <div v-else class="panel-empty">
              <span class="material-symbols-outlined" aria-hidden="true">inbox</span>
              <p>No hay expedientes visibles que requieran atención operativa.</p>
            </div>
          </section>
          <section class="dashboard-panel distribution-section" aria-labelledby="distribution-title">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Resumen del listado</p>
                <h2 id="distribution-title">Distribución por estado</h2>
              </div>
              <span v-if="distribucionEstados.length" class="material-symbols-outlined section-icon" aria-hidden="true">
                donut_small
              </span>
            </div>
            <ul v-if="distribucionEstados.length" class="distribution-list">
              <li v-for="estado in distribucionEstados" :key="estado.codigo">
                <span>{{ estado.etiqueta }}</span>
                <strong>{{ estado.total }}</strong>
              </li>
            </ul>
            <div v-else class="panel-empty">
              <span class="material-symbols-outlined" aria-hidden="true">donut_small</span>
              <p>No hay expedientes visibles para resumir.</p>
            </div>
          </section>
        </div>
      </template>
    </section>
    <section v-else class="session-summary">
      <h1>Dashboard</h1>
      <p class="intro">Bienvenido, {{ auth.usuario?.correo_electronico }}.</p>
      <div class="session-card">
        <h2>Sesión actual</h2>
        <p v-if="roles.length">Roles activos: {{ roles.map((rol) => rol.nombre).join(', ') }}</p>
        <p v-else>No tiene roles activos asignados.</p>
      </div>
    </section>
  </div>
</template>
<style scoped>
.panel-view {
  width: min(100%, 90rem);
  margin: 0 auto;
}
.udi-dashboard,
.session-summary {
  display: grid;
  gap: var(--siset-space-6);
}
.dashboard-heading,
.section-heading,
.attention-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--siset-space-4);
}
h1,
h2,
h3,
p {
  margin: 0;
}
h1 {
  color: var(--siset-color-primary);
}
h2,
h3 {
  color: var(--siset-color-text);
}
.eyebrow {
  color: var(--siset-color-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.intro,
.attention-details p {
  margin-top: var(--siset-space-1);
  color: var(--siset-color-text-muted);
}
button,
.manage-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--siset-space-2);
  padding: var(--siset-space-2) var(--siset-space-4);
  color: var(--siset-color-surface);
  font-weight: 700;
  text-decoration: none;
  background: var(--siset-color-primary);
  border: 0;
  border-radius: var(--siset-radius-lg);
}
button:hover,
.manage-action:hover {
  background: var(--siset-color-primary-container);
}
.dashboard-update {
  color: var(--siset-color-primary);
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border-strong);
}
.dashboard-update:hover {
  background: var(--siset-color-surface-muted);
}
button:disabled {
  opacity: 0.65;
}
.state,
.message,
.session-card {
  padding: var(--siset-space-4);
  border-radius: var(--siset-radius-lg);
}
.state,
.panel-empty {
  color: var(--siset-color-text-muted);
  background: var(--siset-color-surface-muted);
}
.message {
  color: var(--siset-color-error);
  background: var(--siset-color-error-container);
}
.message button {
  margin-top: var(--siset-space-3);
}
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--siset-space-4);
}
.metric-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--siset-space-4);
  padding: var(--siset-space-5);
  background: var(--siset-color-surface);
  border-left: var(--siset-space-1) solid var(--siset-color-primary);
  border-radius: var(--siset-radius-xl);
  box-shadow: var(--siset-shadow-sm);
}
.metric-copy {
  display: grid;
  gap: var(--siset-space-1);
}
.metric-card p {
  color: var(--siset-color-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}
.metric-card strong {
  color: var(--siset-color-text);
  font-family: var(--siset-font-heading);
  font-size: 1.75rem;
}
.metric-icon {
  display: grid;
  flex: 0 0 auto;
  width: var(--siset-space-10);
  height: var(--siset-space-10);
  place-items: center;
  color: var(--siset-color-primary);
  background: var(--siset-color-surface-muted);
  border-radius: var(--siset-radius-xl);
}
.metric-card.secondary {
  border-left-color: var(--siset-color-secondary);
}
.metric-card.secondary .metric-icon {
  color: var(--siset-color-secondary);
  background: var(--siset-color-secondary-container);
}
.metric-card.warning {
  border-left-color: var(--siset-color-warning);
}
.metric-card.warning .metric-icon {
  color: var(--siset-color-warning);
  background: var(--siset-color-warning-container);
}
.metric-card.error-card {
  border-left-color: var(--siset-color-error);
}
.metric-card.error-card .metric-icon {
  color: var(--siset-color-error);
  background: var(--siset-color-error-container);
}
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(16rem, 1fr);
  gap: var(--siset-space-6);
}
.dashboard-panel,
.session-card {
  display: grid;
  gap: var(--siset-space-4);
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-xl);
  box-shadow: var(--siset-shadow-sm);
}
.dashboard-panel {
  padding: var(--siset-space-5);
}
.text-action {
  color: var(--siset-color-primary);
  font-weight: 700;
}
.attention-list {
  display: grid;
  gap: var(--siset-space-3);
}
.attention-item {
  padding: var(--siset-space-4);
  background: var(--siset-color-surface-muted);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-lg);
}
.expediente-code {
  display: grid;
  flex: 0 0 auto;
  width: var(--siset-space-12);
  height: var(--siset-space-12);
  place-items: center;
  color: var(--siset-color-primary);
  font-weight: 700;
  background: var(--siset-color-secondary-container);
  border-radius: var(--siset-radius-lg);
}
.attention-details {
  flex: 1;
  min-width: 0;
}
.status-label {
  display: inline-block;
  margin-top: var(--siset-space-2);
  padding: var(--siset-space-1) var(--siset-space-2);
  color: var(--siset-color-primary);
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--siset-color-surface);
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-xl);
}
.distribution-section {
  align-content: start;
}
.panel-empty {
  display: grid;
  min-height: 12rem;
  place-items: center;
  gap: var(--siset-space-2);
  padding: var(--siset-space-5);
  text-align: center;
  border-radius: var(--siset-radius-lg);
}
.panel-empty .material-symbols-outlined {
  color: var(--siset-color-secondary);
  font-size: 2rem;
}
.section-icon {
  color: var(--siset-color-secondary);
}
.distribution-list {
  display: grid;
  gap: var(--siset-space-2);
  padding: 0;
  margin: 0;
  list-style: none;
}
.distribution-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--siset-space-3);
  padding: var(--siset-space-3) 0;
  color: var(--siset-color-text-muted);
  border-bottom: 1px solid var(--siset-color-border);
}
.distribution-list li:last-child {
  border-bottom: 0;
}
.distribution-list strong {
  color: var(--siset-color-primary);
  font-family: var(--siset-font-heading);
}
.session-summary {
  max-width: 35rem;
}
@media (max-width: 64rem) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 48rem) {
  .dashboard-heading,
  .section-heading,
  .attention-item {
    align-items: stretch;
    flex-direction: column;
  }
  .dashboard-heading button,
  .manage-action {
    width: 100%;
  }
  .metrics-grid,
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .expediente-code {
    width: auto;
  }
}
</style>
