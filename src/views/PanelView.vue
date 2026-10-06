<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { RouterLink } from 'vue-router'
import TesistaPanel from '@/components/TesistaPanel.vue'
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
          <h1 id="dashboard-title">Bienvenido al Panel UDI</h1>
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
              <strong>{{ metricas.expedientesVisibles }}</strong><small><span class="material-symbols-outlined" aria-hidden="true">folder_open</span> Total disponible</small>
            </div>
            <span class="metric-icon material-symbols-outlined" aria-hidden="true">assignment</span>
          </article>
          <article class="metric-card secondary">
            <div class="metric-copy">
              <p>Requieren atención</p>
              <strong>{{ metricas.requierenAtencion }}</strong><small><span class="material-symbols-outlined" aria-hidden="true">pending_actions</span> Pendientes de gesti?n</small>
            </div>
            <span class="metric-icon material-symbols-outlined" aria-hidden="true">school</span>
          </article>
          <article class="metric-card warning">
            <div class="metric-copy">
              <p>En revisión</p>
              <strong>{{ metricas.enRevision }}</strong><small><span class="material-symbols-outlined" aria-hidden="true">sync</span> Proceso activo</small>
            </div>
            <span class="metric-icon material-symbols-outlined" aria-hidden="true">visibility</span>
          </article>
          <article class="metric-card error-card">
            <div class="metric-copy">
              <p>Observados</p>
              <strong>{{ metricas.observados }}</strong><small><span class="material-symbols-outlined" aria-hidden="true">warning</span> Requiere atenci?n</small>
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
              <RouterLink v-for="expediente in expedientesAtencion" :key="expediente.id_expediente" class="attention-item" :to="{ name: 'udi-revision', params: { id: expediente.id_expediente } }">
                <span class="expediente-code material-symbols-outlined" aria-hidden="true">description</span>
                <div class="attention-details">
                  <h3>{{ expediente.cod_expediente }}: {{ expediente.etapa?.nombre ?? 'Revisi?n de expediente' }}</h3>
                  <p>Tesista: {{ nombreParticipante(expediente.tesista) }}</p>
                  <span class="status-label">{{ expediente.estado_actual?.nombre ?? 'Sin estado informado' }}</span>
                </div>
              </RouterLink>
            </div>
            <div v-else class="panel-empty">
              <span class="material-symbols-outlined" aria-hidden="true">inbox</span>
              <p>No hay expedientes visibles que requieran atención operativa.</p>
            </div>
          </section>
          <section class="dashboard-panel activity-section" aria-labelledby="activity-title">
            <h2 id="activity-title"><span class="material-symbols-outlined" aria-hidden="true">history</span> Actividad reciente</h2>
            <div class="activity-empty">
              <span class="material-symbols-outlined" aria-hidden="true">history</span>
              <p>La actividad reciente a?n no est? disponible.</p>
              <small>Puede consultar el historial dentro de cada expediente.</small>
            </div>
            <RouterLink class="activity-action" :to="{ name: 'udi-expedientes' }">Consultar expedientes</RouterLink>
          </section>
        </div>
      </template>
    </section>
    <TesistaPanel v-else-if="auth.tieneRol('tesista')" />
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
.panel-view { width: 100%; }
.udi-dashboard, .session-summary { display: grid; gap: 32px; }
h1, h2, h3, p { margin: 0; }
h1 { color: #283a70; font-size: 28px; line-height: 36px; }
.intro { color: #45464f; font-size: 14px; line-height: 20px; }
.dashboard-heading, .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.dashboard-update { display: inline-flex; align-items: center; gap: 6px; padding: 6px; color: #283a70; background: transparent; border: 0; font-size: 12px; }
.dashboard-update .material-symbols-outlined { font-size: 18px; }
.metrics-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; margin-bottom: 8px; }
.metric-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 156px; padding: 24px; background: white; border-left: 4px solid #283a70; border-radius: 8px; box-shadow: 0 2px 4px #0000000d; }
.metric-copy { min-width: 0; }
.metric-copy p { color: #45464f; font-size: 12px; line-height: 16px; font-weight: 700; text-transform: uppercase; }
.metric-copy strong { display: block; font-family: var(--siset-font-heading); font-size: 28px; line-height: 36px; }
.metric-copy small { display: flex; align-items: center; gap: 4px; margin-top: 8px; font-size: 11px; line-height: 14px; color: #006b5c; font-weight: 700; }
.metric-copy small .material-symbols-outlined { font-size: 16px; }
.metric-icon { display: grid; place-items: center; flex: 0 0 56px; height: 56px; font-size: 32px; border-radius: 12px; color: #283a70; background: #283a701a; }
.secondary { border-left-color: #006b5c; }
.secondary .metric-icon { color: #006b5c; background: #006b5c1a; }
.warning { border-left-color: #e8c26d; }
.warning .metric-icon { color: #4e3a00; background: #ffdf9b4d; }
.warning small { color: #45464f; }
.error-card { border-left-color: #ba1a1a; }
.error-card .metric-icon { color: #ba1a1a; background: #ffdad6; }
.error-card small { color: #ba1a1a; }
.dashboard-grid { display: grid; grid-template-columns: minmax(0, 2.1fr) minmax(260px, 1fr); gap: 32px; align-items: start; }
h2 { display: flex; align-items: center; gap: 8px; font-size: 16px; line-height: 24px; font-weight: 600; }
h2 .material-symbols-outlined { color: #283a70; }
.text-action { color: #283a70; font-size: 12px; font-weight: 700; text-decoration: none; white-space: nowrap; }
.attention-list { display: grid; gap: 16px; margin-top: 16px; }
.attention-item { display: flex; align-items: flex-start; gap: 16px; padding: 20px; min-height: 112px; border: 1px solid #c5c6d1; border-radius: 8px; background: white; box-shadow: 0 1px 2px #0000000d; text-decoration: none; }
.attention-item:hover { border-color: #283a70; }
.expediente-code { display: grid; place-items: center; flex: 0 0 48px; height: 48px; background: #dce1ff; color: #283a70; border-radius: 4px; }
.attention-details { min-width: 0; }
h3 { font-size: 16px; line-height: 24px; overflow-wrap: anywhere; }
.attention-details p { color: #45464f; font-size: 14px; line-height: 20px; margin-top: 2px; }
.status-label { display: inline-block; margin-top: 8px; padding: 2px 10px; background: #283a701a; color: #283a70; border: 1px solid #c5c6d1; border-radius: 12px; font-size: 11px; line-height: 14px; font-weight: 700; }
.activity-section { display: flex; flex-direction: column; gap: 32px; min-height: 420px; padding: 24px; background: white; border: 1px solid #c5c6d1; border-radius: 8px; box-shadow: 0 1px 2px #0000000d; }
.activity-section h2 .material-symbols-outlined { color: #006b5c; }
.activity-empty { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 12px; color: #45464f; font-size: 14px; }
.activity-empty > span { color: #006b5c; font-size: 32px; }
.activity-empty small { font-size: 12px; }
.activity-action { padding: 12px; border: 1px solid #757681; border-radius: 8px; text-align: center; text-decoration: none; font-size: 12px; font-weight: 700; }
.activity-action:hover { background: #f3f3f9; }
.panel-empty, .state, .message, .session-card { padding: 24px; border-radius: 8px; }
.panel-empty { margin-top: 16px; background: white; color: #45464f; border: 1px solid #c5c6d1; }
.message { color: #ba1a1a; background: #ffdad6; }
.session-summary { max-width: 560px; }
@media (max-width: 1150px) { .metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 900px) { .dashboard-grid { grid-template-columns: 1fr; } .activity-section { min-height: 280px; } }
@media (max-width: 540px) {
  .udi-dashboard { gap: 24px; }
  .dashboard-heading { align-items: flex-start; flex-direction: column; gap: 8px; }
  h1 { font-size: 24px; line-height: 30px; }
  .metrics-grid { gap: 12px; }
  .metric-card { padding: 16px 12px; min-height: 150px; gap: 8px; flex-wrap: wrap; }
  .metric-icon { flex-basis: 36px; height: 36px; font-size: 24px; }
  .attention-item { padding: 16px; gap: 12px; }
  h3 { font-size: 14px; line-height: 20px; }
}
</style>
