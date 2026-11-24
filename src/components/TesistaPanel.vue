<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useActividadTesistaStore } from '@/stores/actividadTesista'
import { fechaPlazo, textoPlazo } from '@/services/plazos'
import {
  fechaAviso,
  pasosTesista,
  pasoTesista,
} from '@/services/resumenTesista'

const auth = useAuthStore()
const route = useRoute()
const actividad = useActividadTesistaStore()
const resumen = computed(() => actividad.resumen)
const seleccionado = ref<number | null>(Number(route.query.expediente) || null)
const cargando = computed(() => actividad.cargando && !resumen.value)
const error = computed(() => !resumen.value ? actividad.error : '')
const detalle = computed(() => {
  const expediente = resumen.value?.expediente
  return resumen.value?.detalle ?? (expediente && {
    id_expediente: expediente.id_expediente,
    cod_expediente: expediente.cod_expediente,
    etapa_actual: expediente.etapa,
    estado_actual: expediente.estado_actual,
  })
})
const plazoActual = computed(
  () =>
    [...(resumen.value?.plazos ?? [])]
      .filter((p) => !p.cierre)
      .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento))[0],
)
const estado = computed(() => detalle.value?.estado_actual?.codigo)
const etapa = computed(() => detalle.value?.etapa_actual?.codigo)
const tonoEstado = computed(() =>
  [
    'conforme',
    'proyecto_aprobado',
    'fase_tesis_habilitada',
    'tesis_final_aprobada',
    'cerrado',
    'archivado',
  ].includes(estado.value ?? '')
    ? 'positivo'
    : ['observado', 'pendiente_subsanacion', 'improcedente'].includes(estado.value ?? '')
      ? 'atencion'
      : 'informativo',
)
const pasoActual = computed(() => pasoTesista(etapa.value, estado.value))
const finalizado = computed(
  () => etapa.value === 'cierre_archivo' && ['cerrado', 'archivado'].includes(estado.value ?? ''),
)
const faseTesis = computed(() =>
  ['revision_jurados_tesis_final', 'aprobacion_informe_final', 'cierre_archivo'].includes(
    etapa.value ?? '',
  )
    ? 'En curso'
    : etapa.value === 'fase_tesis_informe_final' && estado.value === 'fase_tesis_habilitada'
      ? 'Habilitada'
      : 'Bloqueada',
)
const pendientes = computed(() => resumen.value?.pendientes ?? 0)
const descripcionEstado = computed(() => {
  if (!detalle.value) return 'Registra tu expediente para iniciar el trámite.'
  if (estado.value === 'pendiente_subsanacion' && pendientes.value > 0)
    return 'Requiere subsanación por parte del tesista.'
  if (estado.value === 'en_revision') return 'Tu expediente se encuentra en evaluación.'
  if (faseTesis.value === 'Habilitada') return 'Puedes registrar tu informe final de tesis.'
  return detalle.value.etapa_actual?.nombre ?? 'Consulta el detalle de tu expediente.'
})
const destinoExpediente = computed<RouteLocationRaw>(() =>
  detalle.value
    ? { name: 'expedientes-detalle', params: { id: detalle.value.id_expediente } }
    : { name: 'expedientes-nuevo' },
)
const destinoObservaciones = computed(() => ({
  name: 'observaciones',
  query: {
    expediente: detalle.value?.id_expediente,
    etapa: ['revision_jurados_tesis_final', 'aprobacion_informe_final', 'cierre_archivo'].includes(
      etapa.value ?? '',
    )
      ? 'tesis'
      : 'proyecto',
  },
}))
const destinoAvisos = computed(() => ({
  name: 'notificaciones',
  query: { expediente: detalle.value?.id_expediente },
}))
const ultimoInforme = computed(
  () =>
    [...(resumen.value?.detalle?.informes ?? [])]
      .filter((item) => item.estado === 1)
      .sort((a, b) => b.es_tesis - a.es_tesis || b.version - a.version)[0],
)
const acciones = computed(() => [
  !detalle.value
    ? {
        titulo: 'Registrar expediente',
        detalle: 'Inicia tu trámite con el proyecto de tesis.',
        icono: 'edit_square',
        tono: 'warning',
        destino: destinoExpediente.value,
      }
    : {
        titulo:
          pendientes.value > 0
            ? estado.value === 'pendiente_subsanacion'
              ? 'Subsanar observaciones'
              : 'Revisar observaciones'
            : 'Consultar seguimiento',
        detalle:
          pendientes.value > 0
            ? `${pendientes.value} observaciones requieren atención.`
            : 'Consulta el estado y el historial de tu trámite.',
        icono: 'edit_square',
        tono: 'warning',
        destino: pendientes.value > 0 ? destinoObservaciones.value : destinoExpediente.value,
      },
  {
    titulo: 'Revisar documento',
    detalle: ultimoInforme.value
      ? `${ultimoInforme.value.es_tesis ? 'Tesis final' : 'Proyecto de tesis'} · V${ultimoInforme.value.version}`
      : 'Consulta los documentos registrados.',
    icono: 'visibility',
    tono: 'primary',
    destino: detalle.value
      ? { name: 'documentos', query: { expediente: detalle.value.id_expediente } }
      : destinoExpediente.value,
  },
  {
    titulo: 'Actualizar datos',
    detalle: 'Consulta tus datos personales y de contacto.',
    icono: 'manage_accounts',
    tono: '',
    destino: { name: 'perfil' },
  },
  {
    titulo: 'Descargar formato',
    detalle: 'Plantillas Word publicadas por Decanatura.',
    icono: 'download',
    tono: '',
    destino: { name: 'formatos' },
  },
])
async function cargar() {
  const usuario = auth.usuario
  if (!usuario?.alumno) return
  actividad.iniciar(usuario.id_usuario, usuario.alumno.id_alumno, seleccionado.value, auth.expedientes)
  await actividad.actualizar()
  seleccionado.value = detalle.value?.id_expediente ?? null
}
onMounted(cargar)
</script>

<template>
  <section class="tesista-panel" aria-labelledby="tesista-title" :aria-busy="cargando">
    <header class="panel-heading">
      <h1 id="tesista-title">Panel Principal</h1>
      <p>Resumen general de tu proceso de tesis</p>
    </header>
    <p v-if="cargando" class="card panel-message" role="status">Cargando tu expediente…</p>
    <div v-else-if="error" class="card panel-message" role="alert">
      <p>{{ error }}</p>
      <button @click="cargar">Reintentar</button>
    </div>
    <template v-else>
      <label v-if="(resumen?.expedientes.length ?? 0) > 1" class="panel-picker"
        >Expediente
        <select v-model="seleccionado" @change="cargar">
          <option
            v-for="item in resumen?.expedientes"
            :key="item.id_expediente"
            :value="item.id_expediente"
          >
            {{ item.cod_expediente }}
          </option>
        </select>
      </label>
      <div v-if="actividad.error" class="panel-message" role="alert">
        <p>{{ actividad.error }} El resumen puede estar incompleto.</p>
        <button type="button" :disabled="actividad.cargando" @click="cargar">Reintentar</button>
      </div>
      <p v-else-if="actividad.cargando" class="panel-message" role="status">Actualizando plazos, observaciones y notificaciones…</p>
      <div class="summary-grid">
        <article class="card status-card" :class="tonoEstado">
          <div class="card-label">
            <span>Estado actual</span><span class="status-icon" aria-hidden="true"></span>
          </div>
          <div>
            <span class="status-badge">{{
              detalle?.estado_actual?.nombre ?? 'Sin expediente'
            }}</span>
            <p>{{ descripcionEstado }}</p>
          </div>
        </article>
        <RouterLink class="card file-card" :to="destinoExpediente">
          <div class="card-label">
            <span>Expediente</span
            ><span class="material-symbols-outlined" aria-hidden="true">folder_open</span>
          </div>
          <strong>{{ detalle?.cod_expediente ?? 'Por registrar' }}</strong>
        </RouterLink>
        <article class="card deadline-card" :class="plazoActual?.semaforo ?? 'sin-plazo'">
          <div class="card-label">
            <span>Plazo restante</span
            ><span class="material-symbols-outlined" aria-hidden="true">timer</span>
          </div>
          <template v-if="plazoActual">
            <RouterLink
              :to="{
                name: 'expedientes-detalle',
                params: { id: detalle?.id_expediente },
                hash: '#plazos',
              }"
            >
              <strong>{{ textoPlazo(plazoActual) }}</strong>
              <small>{{ plazoActual.nombre }}</small>
              <small>Vence: {{ fechaPlazo(plazoActual.vencimiento) }}</small>
            </RouterLink>
          </template>
          <p v-else-if="actividad.cargando" class="deadline-empty">Consultando plazos…</p>
          <p v-else class="deadline-empty">Sin plazo con inicio registrado</p>
        </article>
        <div class="count-cards">
          <RouterLink
            class="card count-card"
            :to="detalle ? destinoObservaciones : destinoExpediente"
            ><span>Observaciones</span
            ><strong>{{ resumen?.observaciones ?? '—' }}</strong></RouterLink
          >
          <RouterLink class="card count-card" :to="destinoAvisos"
            ><span>Notificaciones</span
            ><strong>{{ !resumen?.avisos.length && (actividad.cargando || actividad.error) ? '—' : resumen?.avisos.length ?? 0 }}</strong></RouterLink
          >
        </div>
        <RouterLink
          class="locked-card"
          :class="{ unlocked: faseTesis !== 'Bloqueada' }"
          :to="detalle ? { name: 'tesis-final' } : destinoExpediente"
        >
          <span class="material-symbols-outlined" aria-hidden="true">{{
            faseTesis === 'Bloqueada' ? 'lock' : 'school'
          }}</span
          ><strong>Fase Tesis Final</strong><small>{{ faseTesis }}</small>
        </RouterLink>
      </div>

      <section class="card tracking" aria-labelledby="tracking-title">
        <div class="tracking-heading">
          <h2 id="tracking-title">Seguimiento rápido del trámite</h2>
          <span class="tracking-count">{{
            finalizado
              ? 'Trámite completado'
              : pasoActual
                ? `Etapa ${pasoActual} de ${pasosTesista.length}`
                : 'Sin iniciar'
          }}</span>
        </div>
        <ol class="steps">
          <li
            v-for="(titulo, indice) in pasosTesista"
            :key="titulo"
            :class="{
              completed: indice + 1 < pasoActual || finalizado,
              current: indice + 1 === pasoActual && !finalizado,
              'label-visible': indice + 1 === pasoActual,
            }"
            :aria-current="indice + 1 === pasoActual && !finalizado ? 'step' : undefined"
          >
            <button
              type="button"
              class="step-number"
              :aria-label="`Etapa ${indice + 1}: ${titulo}${indice + 1 < pasoActual || finalizado ? ', completada' : indice + 1 === pasoActual ? ', actual' : ', pendiente'}`"
              :aria-describedby="`step-label-${indice}`"
            >
              <span
                v-if="indice + 1 < pasoActual || finalizado"
                class="material-symbols-outlined"
                aria-hidden="true"
                >check</span
              ><span v-else aria-hidden="true">{{ indice + 1 }}</span>
            </button>
            <span
              :id="`step-label-${indice}`"
              class="step-caption"
              :role="indice + 1 === pasoActual ? undefined : 'tooltip'"
              >{{ titulo }}</span
            >
          </li>
        </ol>
      </section>

      <div class="bottom-grid">
        <section aria-labelledby="actions-title">
          <h2 id="actions-title">
            <span class="material-symbols-outlined" aria-hidden="true">bolt</span>Acciones
            Pendientes
          </h2>
          <div class="actions-grid">
            <component
              :is="RouterLink"
              v-for="accion in acciones"
              :key="accion.titulo"
              :to="accion.destino"
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
            <RouterLink :to="destinoAvisos">Ver todas</RouterLink>
          </div>
          <ul class="card notifications-list">
            <li
              v-for="notificacion in resumen?.avisos.slice(0, 4)"
              :key="notificacion.id"
              :class="
                notificacion.tono === 'success'
                  ? 'approved'
                  : notificacion.tono === 'warning'
                    ? 'upcoming'
                    : 'info'
              "
            >
              <span class="notification-dot" aria-hidden="true"></span>
              <div>
                <span class="notification-badge">{{ notificacion.etiqueta }}</span>
                <RouterLink :to="notificacion.destino"
                  ><p>{{ notificacion.titulo }}</p></RouterLink
                >
                <small>{{ fechaAviso(notificacion.fecha) }}</small>
              </div>
            </li>
            <li v-if="!resumen?.avisos.length"><p>{{ actividad.cargando ? 'Consultando notificaciones…' : actividad.error ? 'No se pudieron consultar las notificaciones.' : 'No hay notificaciones registradas.' }}</p></li>
          </ul>
        </section>
      </div>
    </template>
  </section>
</template>

<style scoped>
.panel-message {
  padding: 20px;
  margin-bottom: 20px;
}
.panel-message button {
  margin-top: 8px;
  color: #283a70;
  text-decoration: underline;
}
.panel-picker {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}
.panel-picker select {
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  padding: 8px;
}
.unlocked {
  opacity: 1 !important;
  color: #006b5c !important;
  background: #e7f8f2 !important;
}
.deadline-empty {
  font-size: 13px;
  color: #45464f;
}
.notifications-list a {
  color: #191c20;
}
.notifications-list a:hover {
  text-decoration: underline;
}
.file-card strong {
  overflow-wrap: anywhere;
}
.positivo .status-badge,
.positivo .status-icon {
  color: #006b5c;
  background: #d6f6e9;
}
.informativo .status-badge,
.informativo .status-icon {
  color: #283a70;
  background: #dce1ff;
}
.sin-plazo.deadline-card {
  border-color: #c5c6d1;
}
.deadline-card.verde {
  border-color: #00866b;
  color: #006b5c;
}
.deadline-card.amarillo {
  border-color: #d29a17;
  color: #855800;
}
.deadline-card.rojo {
  border-color: #ba1a1a;
  color: #ba1a1a;
}
.deadline-card a {
  display: grid;
  gap: 6px;
  color: inherit;
  font-size: 13px;
}
.deadline-card small {
  font-size: 11px;
  line-height: 1.3;
}
.sin-plazo.deadline-card .card-label {
  color: #45464f;
}
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
.status-card,
.file-card {
  justify-content: flex-start;
}
.status-card > div:last-child,
.file-card > strong {
  margin-block: auto;
}
.status-card p {
  color: #45464f;
  font-size: 13px;
  line-height: 20px;
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
  max-width: 100%;
  padding: 4px 12px;
  margin-bottom: 8px;
  color: #a07820;
  background: #ffdf9b;
  border: 1px solid #e8c26d;
  border-radius: 24px;
  font-size: 18px;
  line-height: 24px;
  font-weight: 600;
}
.file-card .material-symbols-outlined {
  color: #283a70;
}
.file-card strong {
  font-family: var(--siset-font-heading);
  font-size: 22px;
  line-height: 28px;
  color: #283a70;
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
  font-size: 20px;
  line-height: 26px;
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
.tracking-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.tracking-count {
  flex-shrink: 0;
  color: #757681;
  font-size: 11px;
}
.steps {
  display: flex;
  align-items: flex-start;
  padding: 0 0 40px;
  margin: 60px 0 0;
  list-style: none;
}
.steps li {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.steps li:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 18px;
  width: 100%;
  height: 4px;
  border-radius: 4px;
  background: #e7e8ee;
  transition: background-color 0.3s ease;
}
.steps li.completed::after {
  background: #283a70;
}
.step-number {
  position: relative;
  z-index: 1;
  border: 1px solid transparent;
  padding: 0;
  font: inherit;
  cursor: help;
  box-shadow: 0 0 0 5px white;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 12px;
  background: #e7e8ee;
  color: #757681;
  font-size: 12px;
}
.step-number:hover {
  transform: translateY(-3px);
}
.step-number:focus-visible {
  outline: 2px solid #405189;
  outline-offset: 5px;
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
  box-shadow:
    0 0 0 5px white,
    0 0 0 8px #ffdf9b40;
}
.step-caption {
  position: absolute;
  z-index: 3;
  bottom: 54px;
  left: 50%;
  width: max-content;
  max-width: 200px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #283a70;
  color: white;
  text-align: center;
  box-shadow: 0 4px 12px #191c2026;
  font-size: 11px;
  line-height: 16px;
  opacity: 0;
  visibility: hidden;
  transform: translate(-50%, 4px);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease,
    visibility 0.18s ease;
  pointer-events: none;
}
.steps li:hover .step-caption,
.steps li:focus-within .step-caption {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, 0);
}
.steps li:first-child:not(.label-visible) .step-caption {
  left: 0;
  transform: translateY(4px);
}
.steps li:last-child:not(.label-visible) .step-caption {
  left: auto;
  right: 0;
  transform: translateY(4px);
}
.steps li:first-child:hover .step-caption,
.steps li:first-child:focus-within .step-caption,
.steps li:last-child:hover .step-caption,
.steps li:last-child:focus-within .step-caption {
  transform: translateY(0);
}
.steps li.label-visible .step-caption {
  top: 48px;
  bottom: auto;
  padding: 0;
  background: transparent;
  box-shadow: none;
  color: #6b5000;
  font-size: 12px;
  font-weight: 700;
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%);
}
.completed.label-visible .step-caption {
  color: #283a70;
}
.steps li:first-child.label-visible .step-caption {
  left: 0;
  transform: none;
  text-align: left;
}
.steps li:last-child.label-visible .step-caption {
  left: auto;
  right: 0;
  transform: none;
  text-align: right;
}
@media (prefers-reduced-motion: reduce) {
  .steps li::after,
  .step-number,
  .step-caption {
    transition: none;
  }
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
    padding: 16px 12px;
  }
  .tracking-heading {
    align-items: flex-start;
    gap: 8px;
  }
  .tracking-count {
    font-size: 10px;
  }
  .steps {
    margin-top: 64px;
    padding-bottom: 48px;
  }
  .steps li {
    height: 32px;
  }
  .steps li:not(:last-child)::after {
    top: 14px;
  }
  .step-number {
    width: 24px;
    height: 24px;
    border-radius: 9px;
    box-shadow: 0 0 0 3px white;
  }
  .current .step-number {
    width: 28px;
    height: 28px;
  }
  .step-caption {
    max-width: 150px;
    font-size: 11px;
    bottom: 44px;
  }
  .steps li.label-visible .step-caption {
    max-width: 130px;
    top: 40px;
  }
  .steps li:nth-child(2) .step-caption {
    left: 0;
    transform: none;
  }
  .steps li:nth-last-child(2) .step-caption {
    left: auto;
    right: 0;
    transform: none;
  }
  .notifications-heading {
    flex-wrap: wrap;
    margin-bottom: 8px;
  }
}
</style>
