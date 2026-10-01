<script setup lang="ts">
import { RouterLink } from 'vue-router'

// Contenido de ejemplo de la plantilla aprobada; pendiente de conectar al panel del API.
const acciones = [
  {
    titulo: 'Subsanar observaciones',
    detalle: '2 observaciones en el marco teórico.',
    icono: 'edit_square',
    tono: 'warning',
    ruta: 'observaciones',
  },
  {
    titulo: 'Revisar documento',
    detalle: 'Borrador V1.2 disponible.',
    icono: 'visibility',
    tono: 'primary',
    ruta: 'expedientes',
  },
  {
    titulo: 'Actualizar datos',
    detalle: 'Confirma tu correo institucional.',
    icono: 'manage_accounts',
    tono: '',
    ruta: 'perfil',
  },
  {
    titulo: 'Descargar formato',
    detalle: 'Formato de declaración jurada.',
    icono: 'download',
    tono: '',
    ruta: null,
  },
]
const notificaciones = [
  {
    tipo: 'Urgente',
    tono: 'urgent',
    texto: 'El plazo para levantar observaciones vence en 3 días.',
    fecha: 'Hace 2 horas',
  },
  {
    tipo: 'Próximo',
    tono: 'upcoming',
    texto: 'Reunión de asesoría programada para el viernes.',
    fecha: 'Ayer',
  },
  {
    tipo: 'Informativo',
    tono: 'info',
    texto: 'Nuevo formato de citación disponible en biblioteca.',
    fecha: 'Hace 3 días',
  },
  {
    tipo: 'Aprobado',
    tono: 'approved',
    texto: 'Plan de trabajo inicial aprobado por decanatura.',
    fecha: 'Hace 1 semana',
  },
]
</script>

<template>
  <section class="tesista-panel" aria-labelledby="tesista-title">
    <header class="panel-heading">
      <h1 id="tesista-title">Panel Principal</h1>
      <p>Resumen general de tu proceso de tesis</p>
    </header>

    <div class="summary-grid">
      <article class="card status-card">
        <div class="card-label">
          <span>Estado actual</span><span class="status-icon" aria-hidden="true"></span>
        </div>
        <div>
          <span class="status-badge">Observaciones pendientes</span>
          <p>Requiere subsanación por parte del tesista.</p>
        </div>
      </article>
      <RouterLink class="card file-card" :to="{ name: 'expedientes' }">
        <div class="card-label">
          <span>Expediente</span
          ><span class="material-symbols-outlined" aria-hidden="true">folder_open</span>
        </div>
        <strong>EXP-2026-0042</strong>
      </RouterLink>
      <article class="card deadline-card">
        <div class="card-label">
          <span>Plazo restante</span
          ><span class="material-symbols-outlined" aria-hidden="true">timer</span>
        </div>
        <p><strong>3</strong> días</p>
      </article>
      <div class="count-cards">
        <RouterLink class="card count-card" :to="{ name: 'observaciones' }"
          ><span>Observaciones</span><strong>2</strong></RouterLink
        >
        <RouterLink class="card count-card" :to="{ name: 'notificaciones' }"
          ><span>Notificaciones</span><strong>4</strong></RouterLink
        >
      </div>
      <article class="locked-card" aria-label="Fase Tesis Final bloqueada">
        <span class="material-symbols-outlined" aria-hidden="true">lock</span
        ><strong>Fase Tesis Final</strong><small>Bloqueada</small>
      </article>
    </div>

    <section class="card tracking" aria-labelledby="tracking-title">
      <h2 id="tracking-title">Seguimiento rápido del trámite</h2>
      <ol class="steps">
        <li
          v-for="paso in 10"
          :key="paso"
          :class="{ completed: paso < 7, current: paso === 7 }"
          :aria-current="paso === 7 ? 'step' : undefined"
        >
          <span class="step-number"
            ><span v-if="paso < 7" class="material-symbols-outlined" aria-hidden="true">check</span
            ><template v-else>{{ paso }}</template></span
          >
          <span v-if="paso === 1" class="step-caption">Paso 1</span>
          <span v-else-if="paso === 7" class="step-caption">Observaciones pendientes</span>
          <span v-else-if="paso === 10" class="step-caption">Fin</span>
          <span class="sr-only">Paso {{ paso }}{{ paso < 7 ? ' completado' : '' }}</span>
        </li>
      </ol>
    </section>

    <div class="bottom-grid">
      <section aria-labelledby="actions-title">
        <h2 id="actions-title">
          <span class="material-symbols-outlined" aria-hidden="true">bolt</span>Acciones Pendientes
        </h2>
        <div class="actions-grid">
          <component
            :is="accion.ruta ? RouterLink : 'button'"
            v-for="accion in acciones"
            :key="accion.titulo"
            :to="accion.ruta ? { name: accion.ruta } : undefined"
            :disabled="!accion.ruta"
            :title="!accion.ruta ? 'Función pendiente de implementación' : undefined"
            class="card action-card"
          >
            <span
              class="action-icon material-symbols-outlined"
              :class="accion.tono"
              aria-hidden="true"
              >{{ accion.icono }}</span
            >
            <span class="action-copy"
              ><strong>{{ accion.titulo }}</strong
              ><small>{{ accion.detalle }}</small></span
            >
            <span class="material-symbols-outlined action-arrow" aria-hidden="true"
              >arrow_forward</span
            >
          </component>
        </div>
      </section>
      <section id="tesista-notificaciones" aria-labelledby="notifications-title">
        <div class="notifications-heading">
          <h2 id="notifications-title">
            <span class="material-symbols-outlined" aria-hidden="true">notifications_active</span
            >Últimas notificaciones
          </h2>
          <RouterLink :to="{ name: 'notificaciones' }">Ver todas</RouterLink>
        </div>
        <ul class="card notifications-list">
          <li
            v-for="notificacion in notificaciones"
            :key="notificacion.tipo"
            :class="notificacion.tono"
          >
            <span class="notification-dot" aria-hidden="true"></span>
            <div>
              <span class="notification-badge">{{ notificacion.tipo }}</span>
              <p>{{ notificacion.texto }}</p>
              <small>{{ notificacion.fecha }}</small>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>

<style scoped>
.tesista-panel {
  max-width: 1280px;
  margin: 0 auto;
  font-size: 14px;
  line-height: 20px;
}
h1,
h2,
p {
  margin: 0;
}
h1 {
  color: #283a70;
  font-size: 28px;
  line-height: 36px;
}
h2 {
  color: #283a70;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}
.panel-heading {
  margin-bottom: 32px;
}
.panel-heading p {
  margin-top: 4px;
  color: #45464f;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16px;
}
.card {
  background: white;
  border: 1px solid #c5c6d1;
  border-radius: 8px;
  box-shadow: 0 2px 4px #0000000d;
}
a {
  text-decoration: none;
}
a.card:hover {
  border-color: #283a70;
}
.status-card,
.file-card,
.deadline-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  min-height: 156px;
}
.status-card {
  grid-column: span 2;
}
.card-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
  color: #45464f;
  font-size: 12px;
  line-height: 16px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}
.status-icon {
  width: 32px;
  height: 32px;
  border-radius: 12px;
  background: #ffdf9b;
  flex-shrink: 0;
}
.status-badge {
  display: inline-block;
  max-width: 180px;
  padding: 4px 12px;
  margin-bottom: 8px;
  color: #a07820;
  background: #ffdf9b;
  border: 1px solid #e8c26d;
  border-radius: 24px;
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
}
.file-card .material-symbols-outlined {
  color: #283a70;
}
.file-card strong {
  font-family: var(--siset-font-heading);
  font-size: 22px;
  line-height: 30px;
  overflow-wrap: anywhere;
}
.deadline-card {
  border-color: #ffdad6;
  color: #ba1a1a;
}
.deadline-card .card-label {
  color: inherit;
}
.deadline-card strong {
  margin-right: 4px;
  font-family: var(--siset-font-heading);
  font-size: 28px;
  line-height: 36px;
}
.count-cards {
  display: grid;
  gap: 16px;
}
.count-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  font-size: 12px;
  color: #45464f;
}
.count-card strong {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 12px;
  background: #ffdf9b;
  color: #6b5000;
  font-size: 16px;
  font-weight: 500;
}
.count-card:last-child strong {
  background: #dce1ff;
  color: #283a70;
}
.locked-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 16px;
  border: 1px dashed #c5c6d1;
  border-radius: 8px;
  background: #e2e2e840;
  color: #757681;
  opacity: 0.7;
  font-size: 12px;
  text-align: center;
}
.locked-card .material-symbols-outlined {
  font-size: 30px;
  margin-bottom: 12px;
}
.locked-card small {
  color: #a5a6b1;
  font-size: 11px;
}
.tracking {
  padding: 24px;
  margin-top: 24px;
}
.steps {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  margin: 24px 0 0;
  list-style: none;
  min-height: 56px;
}
.steps li {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.step-number {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 12px;
  background: #e7e8ee;
  color: #757681;
  font-size: 12px;
}
.step-number .material-symbols-outlined {
  font-size: 14px;
}
.completed .step-number {
  background: #283a70;
  color: white;
}
.current .step-number {
  width: 40px;
  height: 40px;
  background: #ffdf9b;
  border: 2px solid #e8c26d;
  color: #4e3a00;
  box-shadow: 0 4px 6px #ffdf9b80;
}
.step-caption {
  font-size: 11px;
  line-height: 14px;
}
.current .step-caption {
  position: absolute;
  top: 48px;
  color: #6b5000;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 24px;
  margin-top: 24px;
}
.bottom-grid h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.action-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  text-align: left;
}
.action-icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background: #e7e8ee;
  color: #45464f;
}
.action-icon.warning {
  background: #ffdf9b4d;
  color: #6b5000;
}
.action-icon.primary {
  background: #dce1ff4d;
  color: #283a70;
}
.action-copy {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  line-height: 16px;
}
.action-copy strong {
  display: block;
  font-weight: 700;
}
.action-copy small {
  display: block;
  margin-top: 4px;
  color: #45464f;
  font-size: 11px;
  line-height: 14px;
}
.action-arrow {
  color: #757681;
}
.notifications-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.notifications-heading a {
  color: #283a70;
  font-size: 11px;
  white-space: nowrap;
}
.notifications-list {
  padding: 0;
  margin: 0;
  list-style: none;
  overflow: hidden;
}
.notifications-list li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e2e2e8;
}
.notifications-list li:last-child {
  border-bottom: 0;
}
.notification-dot {
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--dot);
}
.notification-badge {
  display: inline-block;
  padding: 2px 8px;
  margin-bottom: 4px;
  border-radius: 2px;
  background: var(--badge);
  color: var(--badge-text);
  font-size: 10px;
  line-height: 14px;
  font-weight: 700;
  text-transform: uppercase;
}
.notifications-list p {
  line-height: 18px;
}
.notifications-list small {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  line-height: 14px;
  color: #45464f;
}
.urgent {
  --dot: #ba1a1a;
  --badge: #ffdad6;
  --badge-text: #93000a;
}
.upcoming {
  --dot: #e8c26d;
  --badge: #ffdf9b;
  --badge-text: #9a711a;
}
.info {
  --dot: #b5c4ff;
  --badge: #dce1ff;
  --badge-text: #283a70;
}
.approved {
  --dot: #006b5c;
  --badge: #6ff5dc;
  --badge-text: #007060;
}
@media (max-width: 1199px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .status-card {
    grid-column: span 1;
  }
  .bottom-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 600px) {
  .summary-grid,
  .actions-grid {
    grid-template-columns: 1fr;
  }
  .tracking {
    padding: 16px 12px 32px;
  }
  .step-number {
    width: 24px;
    height: 28px;
  }
  .current .step-number {
    width: 30px;
    height: 34px;
  }
  .current .step-caption {
    white-space: normal;
    width: 100px;
    top: 40px;
    text-align: center;
  }
  .notifications-heading {
    flex-wrap: wrap;
    margin-bottom: 8px;
  }
}
</style>
