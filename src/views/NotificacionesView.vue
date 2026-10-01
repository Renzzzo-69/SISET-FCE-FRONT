<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

const filtro = ref('Todas')
const filtros = ['Todas', 'Plazos Próximos', 'Observaciones', 'Resoluciones']
// Avisos ilustrativos de Notificaciones.html; pendientes de conexión con la API.
const notificaciones = ref([
  {
    id: 1,
    titulo: 'Vencimiento de subsanación',
    texto:
      'Te restan 48 horas para subir el documento de subsanación de la revisión de plan de tesis. Si no se entrega, el trámite será anulado.',
    fecha: 'Hace 2 horas',
    categoria: 'Plazos Próximos',
    etiqueta: 'Plazo Crítico',
    tono: 'urgent',
    icono: 'schedule',
    leida: false,
    ruta: 'observaciones',
  },
  {
    id: 2,
    titulo: 'Revisión de Asesor completada',
    texto:
      'Tu asesor ha dejado 3 nuevas observaciones en el Capítulo II de tu borrador. Por favor revisa y corrige para continuar.',
    fecha: 'Ayer, 15:30',
    categoria: 'Observaciones',
    etiqueta: 'Nueva Observación',
    tono: 'warning',
    icono: 'rate_review',
    leida: false,
    ruta: 'observaciones',
  },
  {
    id: 3,
    titulo: 'Resolución Decanal Emitida',
    texto:
      'Se ha cargado la resolución de nombramiento de jurados para tu sustentación. Ya puedes descargar el documento en la sección de Documentos y Resoluciones.',
    fecha: '24 Oct, 09:15',
    categoria: 'Resoluciones',
    etiqueta: 'Resolución',
    tono: 'success',
    icono: 'task',
    leida: true,
    ruta: 'documentos',
  },
  {
    id: 4,
    titulo: 'Mantenimiento Programado',
    texto:
      'El sistema SISET-FCE estará en mantenimiento el día sábado 28 de octubre desde las 00:00 hasta las 04:00 horas.',
    fecha: '20 Oct, 11:00',
    categoria: 'Sistema',
    etiqueta: 'Aviso del Sistema',
    tono: 'system',
    icono: 'info',
    leida: true,
    ruta: null,
  },
])
const visibles = computed(() =>
  notificaciones.value.filter(
    (item) => filtro.value === 'Todas' || item.categoria === filtro.value,
  ),
)
const sinLeer = computed(() => notificaciones.value.some((item) => !item.leida))
const detalleAbierto = ref<number | null>(null)
const aviso = ref('')
function marcarTodas() {
  notificaciones.value.forEach((item) => {
    item.leida = true
  })
  aviso.value = 'Todos los avisos de ejemplo se marcaron como leídos en esta vista.'
}
function verDetalle(id: number) {
  detalleAbierto.value = detalleAbierto.value === id ? null : id
  const item = notificaciones.value.find((notificacion) => notificacion.id === id)
  if (item) item.leida = true
}
</script>

<template>
  <section class="notifications-view" aria-labelledby="notifications-title">
    <header class="page-heading">
      <div>
        <h1 id="notifications-title">Notificaciones</h1>
        <p>Buzón de alertas y avisos del sistema.</p>
      </div>
      <button class="mark-read" :disabled="!sinLeer" @click="marcarTodas">
        <span class="material-symbols-outlined" aria-hidden="true">done_all</span>Marcar todo como
        leído
      </button>
    </header>
    <p v-if="aviso" class="sr-only" role="status">{{ aviso }}</p>
    <div class="notifications-grid">
      <section aria-label="Buzón de notificaciones">
        <div class="filters" role="group" aria-label="Filtrar notificaciones">
          <button
            v-for="item in filtros"
            :key="item"
            :class="{ active: filtro === item }"
            :aria-pressed="filtro === item"
            @click="filtro = item"
          >
            <span
              v-if="item !== 'Todas'"
              class="filter-dot"
              :class="{ urgent: item === 'Plazos Próximos', success: item === 'Resoluciones' }"
              aria-hidden="true"
            ></span
            >{{ item }}{{ item === 'Todas' ? ` (${notificaciones.length})` : '' }}
          </button>
        </div>
        <ul class="notification-list">
          <li
            v-for="item in visibles"
            :key="item.id"
            class="notification-card"
            :class="[item.tono, { read: item.leida }]"
          >
            <span class="notification-icon material-symbols-outlined" aria-hidden="true">{{
              item.icono
            }}</span>
            <div class="notification-copy">
              <div class="notification-meta">
                <span class="notification-label">{{ item.etiqueta }}</span
                ><span class="timestamp">{{ item.fecha }}</span>
              </div>
              <button
                class="notification-title"
                :aria-expanded="detalleAbierto === item.id"
                :aria-controls="`notification-detail-${item.id}`"
                @click="verDetalle(item.id)"
              >
                <span v-if="!item.leida" class="unread-dot" aria-hidden="true"></span
                >{{ item.titulo
                }}<span class="sr-only">{{ item.leida ? ', leída' : ', sin leer' }}</span>
              </button>
              <p :class="{ truncated: detalleAbierto !== item.id }">{{ item.texto }}</p>
              <div
                v-if="detalleAbierto === item.id"
                :id="`notification-detail-${item.id}`"
                class="notification-detail"
              >
                <p>
                  Aviso de ejemplo; consulta la información real de tu expediente en el módulo
                  correspondiente.
                </p>
                <RouterLink v-if="item.ruta" :to="{ name: item.ruta }">{{
                  item.ruta === 'documentos'
                    ? 'Ir a Documentos y Resoluciones'
                    : 'Ir a Observaciones y Subsanaciones'
                }}</RouterLink>
              </div>
            </div>
          </li>
        </ul>
        <p v-if="!visibles.length" class="empty" role="status">
          No hay notificaciones en esta categoría.
        </p>
        <div class="load-more">
          <button disabled title="No hay más avisos disponibles en el ejemplo">
            Cargar notificaciones anteriores
          </button>
        </div>
      </section>
      <aside class="sidebar-panels">
        <section class="card deadlines" aria-labelledby="deadlines-title">
          <header>
            <span class="traffic-icon material-symbols-outlined" aria-hidden="true">traffic</span>
            <div>
              <h2 id="deadlines-title">Control de Plazos</h2>
              <p>Estado actual de trámites</p>
            </div>
          </header>
          <ol class="deadline-list">
            <li class="urgent">
              <span class="deadline-dot" aria-hidden="true"></span>
              <div class="critical-box">
                <div class="deadline-heading">
                  <h3>Subsanación de Plan</h3>
                  <span>Vence en 2 días</span>
                </div>
                <p>Requiere subir documento corregido antes del 28 Oct.</p>
                <RouterLink :to="{ name: 'observaciones' }">Ir a trámite →</RouterLink>
              </div>
            </li>
            <li class="warning">
              <span class="deadline-dot" aria-hidden="true"></span>
              <div>
                <div class="deadline-heading">
                  <h3>Aprobación de Asesor</h3>
                  <span>En proceso</span>
                </div>
                <p>El asesor tiene plazo hasta el 05 Nov para emitir su informe.</p>
              </div>
            </li>
            <li class="success completed">
              <span class="deadline-dot" aria-hidden="true"></span>
              <div>
                <div class="deadline-heading">
                  <h3>Designación de Jurado</h3>
                  <span
                    ><span class="material-symbols-outlined" aria-hidden="true">check_circle</span
                    >Completado</span
                  >
                </div>
                <p>Resolución N° 145-2024 emitida a tiempo.</p>
              </div>
            </li>
          </ol>
          <div class="deadline-legend">
            <span><i class="urgent" aria-hidden="true"></i>Vencido / Crítico</span
            ><span><i class="warning" aria-hidden="true"></i>En plazo regular</span
            ><span><i class="success" aria-hidden="true"></i>Dentro de tiempo óptimo</span>
          </div>
        </section>
        <section class="help-card">
          <span class="material-symbols-outlined" aria-hidden="true">support_agent</span>
          <div>
            <h2>¿Problemas con un plazo?</h2>
            <p>Si necesitas una extensión justificada, comunícate con la unidad de posgrado.</p>
            <button disabled title="Mesa de ayuda pendiente de implementación">
              Mesa de ayuda
            </button>
          </div>
        </section>
      </aside>
    </div>
    <p class="reference-notice">
      Vista de referencia: avisos y fechas de ejemplo. Pendiente de conexión con las notificaciones
      y plazos reales.
    </p>
  </section>
</template>

<style scoped>
.notifications-view {
  max-width: 1280px;
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
  margin-bottom: 24px;
}
h1 {
  font-size: 28px;
  line-height: 36px;
}
.page-heading p {
  color: #45464f;
  margin-top: 4px;
}
.mark-read {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  border: 0;
  color: #283a70;
  font-size: 12px;
  line-height: 16px;
}
.mark-read .material-symbols-outlined {
  font-size: 18px;
}
.mark-read:disabled {
  opacity: 0.5;
}
.notifications-grid {
  display: grid;
  grid-template-columns: minmax(0, 2.08fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}
.filters button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: #e2e2e8;
  color: #45464f;
  border: 1px solid #c5c6d1;
  border-radius: 12px;
  font-size: 12px;
  line-height: 16px;
}
.filters button.active {
  background: #283a70;
  color: white;
  border-color: #283a70;
}
.filter-dot,
.unread-dot {
  width: 8px;
  height: 8px;
  background: #283a70;
  border-radius: 50%;
  flex-shrink: 0;
}
.filter-dot.urgent {
  background: #ba1a1a;
}
.filter-dot.success {
  background: #006b5c;
}
.notification-list {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.urgent {
  --tone: #ba1a1a;
  --tint: #ffdad6;
}
.warning {
  --tone: #6b5000;
  --tint: #ffdf9b;
}
.success {
  --tone: #006b5c;
  --tint: #6ff5dc;
}
.system {
  --tone: #283a70;
  --tint: #dce1ff;
}
.notification-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: white;
  border-left: 4px solid var(--tone);
  border-radius: 8px;
  box-shadow: 0 2px 4px #0000000d;
}
.notification-card.read {
  opacity: 0.8;
}
.notification-card:hover {
  background: #f9f9ff;
}
.notification-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--tint);
  color: var(--tone);
}
.notification-copy {
  min-width: 0;
  flex: 1;
}
.notification-meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}
.notification-label {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--tint) 50%, white);
  color: var(--tone);
  font-size: 11px;
  line-height: 14px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.timestamp {
  color: #45464f;
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}
.notification-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  margin-bottom: 4px;
  border: 0;
  background: transparent;
  color: #191c20;
  font-family: var(--siset-font-heading);
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  text-align: left;
}
.notification-copy > p {
  color: #45464f;
}
.truncated {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.notification-detail {
  padding: 12px;
  margin-top: 12px;
  background: #f3f3f9;
  border-radius: 4px;
  font-size: 12px;
  line-height: 18px;
  color: #45464f;
}
.notification-detail a {
  display: inline-block;
  color: #283a70;
  margin-top: 8px;
}
.load-more {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}
.load-more button {
  padding: 10px 24px;
  background: #e7e8ee;
  color: #283a70;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  font-size: 12px;
  line-height: 16px;
}
.sidebar-panels {
  display: grid;
  gap: 24px;
}
.card {
  background: white;
  border: 1px solid #c5c6d1;
  border-radius: 8px;
  box-shadow: 0 2px 4px #0000000d;
}
.deadlines {
  padding: 16px;
}
.deadlines > header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  margin-bottom: 24px;
  border-bottom: 1px solid #e2e2e8;
}
.traffic-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  background: #ededf3;
  color: #283a70;
  border-radius: 4px;
}
h2 {
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}
.deadlines > header p {
  font-size: 12px;
  line-height: 16px;
  color: #45464f;
}
.deadline-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.deadline-list li {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
  padding-bottom: 32px;
}
.deadline-list li:last-child {
  padding-bottom: 0;
}
.deadline-list li:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 26px;
  bottom: 12px;
  width: 1px;
  background: #e2e2e8;
}
.deadline-dot {
  width: 16px;
  height: 16px;
  margin-top: 4px;
  border-radius: 50%;
  border: 2px solid white;
  background: var(--tone);
  box-shadow: 0 0 0 2px var(--tint);
  flex-shrink: 0;
}
.warning .deadline-dot {
  background: #e8c26d;
}
.deadline-list li > div {
  flex: 1;
  min-width: 0;
}
.critical-box {
  background: #ffdad64d;
  border: 1px solid #ba1a1a33;
  border-radius: 4px;
  padding: 12px;
}
.deadline-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
h3 {
  font-size: 12px;
  line-height: 16px;
  font-weight: 700;
}
.deadline-heading > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--tone);
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}
.deadline-heading .material-symbols-outlined {
  font-size: 14px;
}
.deadline-list p {
  font-size: 13px;
  line-height: 16px;
  color: #45464f;
}
.critical-box a {
  display: inline-block;
  margin-top: 8px;
  color: #ba1a1a;
  text-decoration: none;
  font-size: 12px;
  line-height: 16px;
}
.completed h3 {
  text-decoration: line-through;
  color: #757681;
}
.completed p {
  color: #757681;
}
.deadline-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
  margin-top: 24px;
  border-top: 1px solid #e2e2e8;
  color: #45464f;
  font-size: 11px;
  line-height: 14px;
}
.deadline-legend > span {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.deadline-legend i {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--tone);
  flex-shrink: 0;
}
.deadline-legend i.warning {
  background: #e8c26d;
}
.help-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border: 1px solid #dce1ff;
  border-radius: 8px;
  background: #dce1ff4d;
  color: #283a70;
}
.help-card h2 {
  font-family: var(--siset-font-body);
  font-size: 12px;
  line-height: 16px;
  font-weight: 700;
}
.help-card p {
  font-size: 13px;
  line-height: 16px;
  margin-top: 4px;
  color: #45464f;
}
.help-card button {
  padding: 0;
  margin-top: 8px;
  border: 0;
  background: transparent;
  color: #283a70;
  font-size: 12px;
  line-height: 16px;
  text-decoration: underline;
}
.reference-notice {
  margin-top: 24px;
  font-size: 11px;
  line-height: 16px;
  color: #757681;
}
.empty {
  padding: 24px;
  text-align: center;
  color: #757681;
}
@media (max-width: 1199px) {
  .notifications-grid {
    grid-template-columns: 1fr;
  }
  .sidebar-panels {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}
@media (max-width: 600px) {
  .page-heading {
    flex-direction: column;
    align-items: flex-start;
  }
  .sidebar-panels {
    grid-template-columns: 1fr;
  }
  .notification-meta {
    flex-wrap: wrap;
    gap: 4px;
  }
  .notification-card {
    gap: 12px;
  }
  h1 {
    font-size: 24px;
    line-height: 32px;
  }
  .filters button {
    padding: 6px 12px;
  }
}
</style>
