<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import axios from 'axios'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  consultarAgenda,
  eventosAgenda,
  fechaLima,
  type AgendaTesista,
} from '@/services/agendaTesista'

const route = useRoute()
const router = useRouter()
const agenda = ref<AgendaTesista | null>(null)
const cargando = ref(true)
const error = ref('')
const hoy = ref(fechaLima(new Date()))
const mes = ref(new Date(hoy.value.slice(0, 7) + '-01T12:00:00'))
const fechaSeleccionada = ref('')
const tipo = ref('')
const alcance = ref('todos')
const filtrosAbiertos = ref(false)
const diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const eventos = computed(() => eventosAgenda(agenda.value?.plazos ?? []))
const misPendientes = computed(() => eventos.value.filter((e) => e.esPersonal))
const proximaAccion = computed(() => misPendientes.value[0])
const filtrados = computed(() =>
  eventos.value.filter(
    (e) =>
      (!tipo.value || e.tipo === tipo.value) &&
      (alcance.value === 'todos' || (alcance.value === 'mios' ? e.esPersonal : !e.esPersonal)),
  ),
)
const visibles = computed(() =>
  filtrados.value.filter((e) => !fechaSeleccionada.value || e.fecha === fechaSeleccionada.value),
)
const hayFiltros = computed(
  () => !!fechaSeleccionada.value || !!tipo.value || alcance.value !== 'todos',
)
const horaConsulta = computed(() =>
  agenda.value
    ? new Intl.DateTimeFormat('es-PE', {
        timeZone: 'America/Lima',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(agenda.value.actualizado_en))
    : '',
)
const tituloMes = computed(() =>
  new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(mes.value),
)
function claveFecha(fecha: Date) {
  return (
    fecha.getFullYear() +
    '-' +
    String(fecha.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(fecha.getDate()).padStart(2, '0')
  )
}
const dias = computed(() => {
  const anio = mes.value.getFullYear()
  const numeroMes = mes.value.getMonth()
  const inicio = (new Date(anio, numeroMes, 1).getDay() + 6) % 7
  const total = Math.ceil((inicio + new Date(anio, numeroMes + 1, 0).getDate()) / 7) * 7
  return Array.from({ length: total }, (_, indice) => {
    const fecha = new Date(anio, numeroMes, indice - inicio + 1)
    const clave = claveFecha(fecha)
    const eventosDelDia = filtrados.value.filter((e) => e.fecha === clave)
    return {
      clave,
      numero: fecha.getDate(),
      fuera: fecha.getMonth() !== numeroMes,
      evento:
        eventosDelDia.find((e) => e.vencido) ??
        eventosDelDia.find((e) => e.esPersonal) ??
        eventosDelDia[0],
      total: eventosDelDia.length,
    }
  })
})
function cambiarMes(paso: number) {
  mes.value = new Date(mes.value.getFullYear(), mes.value.getMonth() + paso, 1)
  fechaSeleccionada.value = ''
}
function irHoy() {
  mes.value = new Date(hoy.value.slice(0, 7) + '-01T12:00:00')
  fechaSeleccionada.value = ''
}
function fechaTexto(clave: string) {
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(clave + 'T12:00:00'))
}
function limpiar() {
  tipo.value = ''
  alcance.value = 'todos'
  fechaSeleccionada.value = ''
}
function destinoEvento(esPersonal: boolean) {
  return esPersonal
    ? {
        name: 'observaciones',
        query: {
          expediente: agenda.value?.expediente?.id,
          etapa: agenda.value?.expediente?.etapa_codigo?.includes('tesis') ? 'tesis' : 'proyecto',
        },
      }
    : { name: 'expedientes-detalle', params: { id: agenda.value?.expediente?.id }, hash: '#plazos' }
}
let temporizador: ReturnType<typeof setTimeout> | undefined
let peticion: AbortController | null = null
let desmontado = false
let calendarioSituado = false
let fallos = 0
async function cargar(forzar = false) {
  if (desmontado || (peticion && !forzar)) return
  if (temporizador) clearTimeout(temporizador)
  peticion?.abort()
  const actual = new AbortController()
  peticion = actual
  cargando.value = true
  try {
    const datos = await consultarAgenda(Number(route.query.expediente) || null, actual.signal)
    if (desmontado || actual.signal.aborted) return
    agenda.value = datos
    hoy.value = fechaLima(new Date(datos.actualizado_en))
    error.value = ''
    fallos = 0
    if (!calendarioSituado) {
      const proximos = eventosAgenda(datos.plazos)
      const siguiente =
        proximos.find((e) => e.esPersonal && !e.vencido) ??
        proximos.find((e) => !e.vencido) ??
        proximos[0]
      mes.value = new Date((siguiente?.fecha ?? hoy.value).slice(0, 7) + '-01T12:00:00')
      calendarioSituado = true
    }
  } catch (e) {
    if (!actual.signal.aborted && !desmontado) {
      fallos++
      error.value =
        axios.isAxiosError(e) && [403, 404, 422].includes(e.response?.status ?? 0)
          ? (e.response?.data?.message ?? 'No se pudo acceder a la agenda del expediente.')
          : agenda.value
            ? 'No se pudo consultar la última actualización. Se muestran los datos de la consulta anterior y se reintentará automáticamente.'
            : 'No pudimos consultar tu agenda. Reintentaremos automáticamente al recuperar la conexión.'
    }
  } finally {
    if (peticion === actual && !desmontado) {
      cargando.value = false
      peticion = null
      if (document.visibilityState !== 'hidden')
        temporizador = setTimeout(
          () => {
            void cargar()
          },
          fallos ? Math.min(60000, 5000 * 2 ** Math.min(fallos - 1, 4)) : 60000,
        )
    }
  }
}
function alVolver() {
  if (document.visibilityState !== 'hidden') void cargar()
  else if (temporizador) clearTimeout(temporizador)
}
function seleccionarExpediente(evento: Event) {
  void router.replace({
    query: { ...route.query, expediente: Number((evento.target as HTMLSelectElement).value) },
  })
}
watch(
  () => route.query.expediente,
  () => {
    calendarioSituado = false
    agenda.value = null
    limpiar()
    void cargar(true)
  },
)
onMounted(() => {
  void cargar()
  window.addEventListener('focus', alVolver)
  window.addEventListener('online', alVolver)
  document.addEventListener('visibilitychange', alVolver)
})
onUnmounted(() => {
  desmontado = true
  peticion?.abort()
  if (temporizador) clearTimeout(temporizador)
  window.removeEventListener('focus', alVolver)
  window.removeEventListener('online', alVolver)
  document.removeEventListener('visibilitychange', alVolver)
})
</script>

<template>
  <section class="agenda-view" aria-labelledby="agenda-title" :aria-busy="cargando && !agenda">
    <header class="page-heading">
      <div>
        <h1 id="agenda-title">Agenda Académica</h1>
        <p>Tus fechas límite y el seguimiento de cada proceso de tesis.</p>
      </div>
      <button
        class="button"
        :aria-expanded="filtrosAbiertos"
        aria-controls="agenda-filtros"
        @click="filtrosAbiertos = !filtrosAbiertos"
      >
        <span class="material-symbols-outlined" aria-hidden="true">filter_list</span>Filtrar
      </button>
    </header>
    <div class="automatic-notice">
      <span class="material-symbols-outlined" aria-hidden="true">event_repeat</span>
      <p>
        Tu agenda se actualiza automáticamente con los plazos de cada proceso. Las fechas se generan
        desde su inicio real.
      </p>
      <small v-if="agenda">{{
        cargando ? 'Consultando…' : 'Última consulta: ' + horaConsulta
      }}</small>
    </div>
    <p v-if="error" class="connection-error" role="alert">{{ error }}</p>
    <div v-if="agenda?.expediente" class="expediente-context">
      <span
        ><strong>{{ agenda.expediente.codigo }}</strong> · {{ agenda.expediente.etapa }} ·
        {{ agenda.expediente.estado }}</span
      ><label v-if="agenda.expedientes.length > 1"
        >Expediente<select :value="agenda.expediente.id" @change="seleccionarExpediente">
          <option v-for="e in agenda.expedientes" :key="e.id" :value="e.id">{{ e.codigo }}</option>
        </select></label
      >
    </div>
    <div v-if="filtrosAbiertos" id="agenda-filtros" class="card filters">
      <label
        >Responsabilidad<select v-model="alcance">
          <option value="todos">Todos los procesos</option>
          <option value="mios">Mis pendientes</option>
          <option value="seguimiento">Seguimiento de otras áreas</option>
        </select></label
      ><label
        >Tipo de evento<select v-model="tipo">
          <option value="">Todos</option>
          <option>Evaluación</option>
          <option>Trámite</option>
          <option>Hito final</option>
        </select></label
      ><label>Fecha<input v-model="fechaSeleccionada" type="date" /></label
      ><button class="button" @click="limpiar">Limpiar filtros</button>
    </div>
    <div class="agenda-grid">
      <aside class="calendar-column">
        <section class="card calendar" aria-label="Calendario de vencimientos">
          <header>
            <h2 aria-live="polite">{{ tituloMes }}</h2>
            <div class="month-controls">
              <button aria-label="Mes anterior" @click="cambiarMes(-1)">
                <span class="material-symbols-outlined" aria-hidden="true"
                  >chevron_left</span
                ></button
              ><button aria-label="Mes siguiente" @click="cambiarMes(1)">
                <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
              </button>
            </div>
          </header>
          <div class="weekdays" aria-hidden="true">
            <span v-for="(dia, indice) in diasSemana" :key="indice">{{ dia }}</span>
          </div>
          <div class="calendar-days">
            <button
              v-for="dia in dias"
              :key="dia.clave"
              :class="[
                dia.evento?.tono,
                {
                  outside: dia.fuera,
                  selected: fechaSeleccionada === dia.clave,
                  reference: !fechaSeleccionada && dia.clave === hoy,
                },
              ]"
              :aria-label="
                fechaTexto(dia.clave) + (dia.total ? ': ' + dia.total + ' vencimientos' : '')
              "
              :aria-current="dia.clave === hoy ? 'date' : undefined"
              :aria-pressed="fechaSeleccionada === dia.clave"
              @click="fechaSeleccionada = fechaSeleccionada === dia.clave ? '' : dia.clave"
            >
              {{ dia.numero }}<span v-if="dia.evento" class="event-dot" aria-hidden="true"></span>
            </button>
          </div>
          <div class="calendar-legend">
            <span><i class="legend-personal"></i>Tu acción</span
            ><span><i class="legend-followup"></i>Seguimiento</span
            ><button @click="irHoy">Hoy</button>
          </div>
        </section>
        <section class="card event-count" aria-label="Procesos abiertos con plazo">
          <div>
            <p>Procesos con plazo</p>
            <strong>{{ agenda ? eventos.length : '—' }}</strong>
          </div>
          <span class="material-symbols-outlined" aria-hidden="true">event_available</span>
        </section>
        <section class="card personal-summary">
          <div class="personal-heading">
            <span class="material-symbols-outlined" aria-hidden="true">assignment_ind</span>
            <h2>Mis pendientes</h2>
            <strong>{{ agenda ? misPendientes.length : '—' }}</strong>
          </div>
          <template v-if="proximaAccion"
            ><p>
              <strong>{{
                proximaAccion.vencido ? 'Tienes un plazo vencido' : 'Tu próxima acción'
              }}</strong>
            </p>
            <p>{{ proximaAccion.titulo }}</p>
            <small>{{ fechaTexto(proximaAccion.fecha) }} · 23:59</small
            ><RouterLink class="personal-link" :to="destinoEvento(true)"
              >Revisar observaciones<span class="material-symbols-outlined" aria-hidden="true"
                >arrow_forward</span
              ></RouterLink
            ></template
          >
          <p v-else-if="agenda">
            Tus plazos para subsanar aparecerán aquí cuando se comuniquen observaciones.
          </p>
          <p v-else>Consultando tus fechas límite…</p>
        </section>
      </aside>
      <section class="card upcoming" aria-labelledby="events-title">
        <header>
          <h2 id="events-title">
            {{ fechaSeleccionada ? fechaTexto(fechaSeleccionada) : 'Plazos del expediente' }}
          </h2>
          <button v-if="hayFiltros" class="clear-filter" @click="limpiar">Ver todos</button>
        </header>
        <div v-if="cargando && !agenda" class="empty loading" role="status">
          <span class="material-symbols-outlined" aria-hidden="true">hourglass_top</span>
          <p>Estamos consultando las fechas de tu expediente…</p>
        </div>
        <div v-else-if="!agenda" class="empty">
          <span class="material-symbols-outlined" aria-hidden="true">cloud_off</span>
          <p>Tu agenda estará disponible cuando se complete la consulta.</p>
        </div>
        <div v-else-if="!agenda.expediente" class="empty">
          <span class="material-symbols-outlined" aria-hidden="true">folder_open</span>
          <h3>Aún no tienes un expediente registrado</h3>
          <p>Al iniciar tu trámite, las fechas de sus procesos aparecerán automáticamente.</p>
          <RouterLink class="button primary" :to="{ name: 'expedientes-nuevo' }"
            >Registrar expediente</RouterLink
          >
        </div>
        <template v-else-if="visibles.length">
          <span class="sr-only" role="status">{{ visibles.length }} procesos con plazo.</span>
          <ol class="timeline">
            <li v-for="evento in visibles" :key="evento.id" :class="evento.tono">
              <span class="event-node material-symbols-outlined" aria-hidden="true">{{
                evento.esPersonal ? 'edit_document' : 'timer'
              }}</span>
              <article class="event-card">
                <header>
                  <div>
                    <span class="event-type">{{
                      evento.esPersonal ? 'Requiere tu acción' : evento.tipo + ' · En seguimiento'
                    }}</span>
                    <h3>{{ evento.titulo }}</h3>
                  </div>
                  <span class="status">{{ evento.estado }}</span>
                </header>
                <p class="remaining" :class="{ overdue: evento.vencido }">
                  {{
                    evento.vencido
                      ? 'El plazo de este proceso ya venció.'
                      : evento.restantes +
                        ' días ' +
                        (evento.tipoDias === 'habiles' ? 'hábiles' : 'calendario') +
                        ' restantes'
                  }}
                </p>
                <div class="event-details">
                  <div>
                    <span class="material-symbols-outlined" aria-hidden="true">event</span>
                    <div>
                      <small>Fecha límite</small
                      ><time :datetime="evento.vencimiento">{{ fechaTexto(evento.fecha) }}</time>
                      <p>Hasta las 23:59 · Hora de Lima</p>
                    </div>
                  </div>
                  <div>
                    <span class="material-symbols-outlined" aria-hidden="true">person</span>
                    <div>
                      <small>Responsable</small>
                      <p>{{ evento.esPersonal ? 'Tú · Tesista' : evento.responsable }}</p>
                      <p v-if="evento.participantes.length" class="participants">
                        {{ evento.participantes.join(' · ') }}
                      </p>
                      <small
                        >{{ evento.duracion }} días
                        {{ evento.tipoDias === 'habiles' ? 'hábiles' : 'calendario' }}</small
                      >
                    </div>
                  </div>
                </div>
                <div class="event-footer">
                  <p>
                    {{
                      evento.esPersonal
                        ? 'Presenta tu subsanación dentro del plazo establecido.'
                        : evento.tipo === 'Hito final'
                          ? 'La fecha límite no reemplaza la programación formal de la sustentación.'
                          : 'Este plazo corresponde al responsable del proceso. Consulta su avance desde tu expediente.'
                    }}
                  </p>
                  <RouterLink :to="destinoEvento(evento.esPersonal)"
                    >{{ evento.esPersonal ? 'Revisar observaciones' : 'Ver seguimiento'
                    }}<span class="material-symbols-outlined" aria-hidden="true"
                      >arrow_forward</span
                    ></RouterLink
                  >
                </div>
              </article>
            </li>
          </ol>
        </template>
        <div v-else class="empty">
          <span class="material-symbols-outlined" aria-hidden="true">event_busy</span>
          <h3>
            {{ hayFiltros ? 'Sin vencimientos para esta selección' : 'Sin vencimientos abiertos' }}
          </h3>
          <p>
            {{
              hayFiltros
                ? 'Puedes consultar las demás fechas de tu expediente.'
                : 'Tu expediente está en ' +
                  agenda.expediente.etapa +
                  '. El siguiente vencimiento aparecerá cuando se inicie un proceso con plazo establecido.'
            }}
          </p>
          <button v-if="hayFiltros" class="button" @click="limpiar">Ver todos los plazos</button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.agenda-view {
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
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  margin-bottom: 20px;
}
h1 {
  font-size: 28px;
  line-height: 36px;
}
.page-heading p {
  color: #45464f;
  margin-top: 4px;
}
.header-actions {
  display: flex;
  gap: 12px;
}
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}
.button .material-symbols-outlined {
  font-size: 18px;
}
.button.primary {
  background: #283a70;
  border-color: #283a70;
  color: white;
}
.reference-notice {
  color: #757681;
  font-size: 12px;
  line-height: 18px;
  margin-bottom: 20px;
}
.agenda-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2.08fr);
  gap: 20px;
  align-items: start;
}
.calendar-column {
  display: grid;
  gap: 20px;
}
.card {
  background: white;
  border: 1px solid #c5c6d1;
  border-radius: 8px;
  box-shadow: 0 2px 4px #0000000d;
}
.calendar {
  padding: 16px;
}
.calendar header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
h2 {
  font-size: 16px;
  line-height: 24px;
  font-weight: 700;
}
.calendar h2 {
  text-transform: capitalize;
}
.month-controls {
  display: flex;
  gap: 4px;
}
.month-controls button {
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
.month-controls button:hover {
  background: #ededf3;
}
.weekdays,
.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  text-align: center;
}
.weekdays {
  margin-bottom: 8px;
  font-size: 11px;
  line-height: 14px;
  color: #45464f;
}
.calendar-days button {
  position: relative;
  min-height: 36px;
  padding: 8px 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  font-size: 14px;
  line-height: 20px;
}
.calendar-days button.outside {
  color: #757681;
}
.calendar-days button:hover {
  background: #ededf3;
}
.calendar-days button.selected,
.calendar-days button.reference {
  color: white;
  background: #283a70;
}
.event-dot {
  position: absolute;
  bottom: 3px;
  left: calc(50% - 2px);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--event-color);
}
.selected .event-dot,
.reference .event-dot {
  background: white;
}
.event-count {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
}
.event-count p {
  color: #45464f;
  font-size: 12px;
  line-height: 16px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
.event-count strong {
  display: block;
  font-family: var(--siset-font-heading);
  font-size: 28px;
  line-height: 36px;
  margin-top: 4px;
}
.event-count > .material-symbols-outlined {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  color: #006b5c;
  background: #6ff5dc;
}
.upcoming {
  overflow: hidden;
}
.upcoming > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  background: #f9f9ff;
  border-bottom: 1px solid #c5c6d1;
}
.timeline {
  display: grid;
  gap: 24px;
  position: relative;
  list-style: none;
  margin: 0;
  padding: 16px;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 36px;
  top: 32px;
  bottom: 32px;
  width: 2px;
  background: #e2e2e8;
}
.timeline li {
  position: relative;
  padding-left: 56px;
}
.evaluation {
  --event-color: #283a70;
  --event-background: #dce1ff;
}
.critical {
  --event-color: #ba1a1a;
  --event-background: #ffdad6;
}
.final {
  --event-color: #006b5c;
  --event-background: #52dcc3;
}
.event-node {
  position: absolute;
  left: 0;
  top: 4px;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 4px solid white;
  border-radius: 12px;
  color: var(--event-color);
  background: var(--event-background);
  font-size: 14px;
}
.event-card {
  padding: 16px;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
}
.event-card > header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.event-type {
  display: block;
  color: var(--event-color);
  text-transform: uppercase;
  font-size: 11px;
  line-height: 14px;
  font-weight: 600;
  letter-spacing: 0.6px;
  margin-bottom: 4px;
}
h3 {
  font-size: 16px;
  line-height: 24px;
  font-weight: 700;
}
.status {
  padding: 4px 8px;
  border: 1px solid var(--event-color);
  border-radius: 2px;
  color: var(--event-color);
  background: #f3f3f9;
  font-size: 11px;
  line-height: 14px;
  white-space: nowrap;
}
.event-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.event-details > div {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.event-details .material-symbols-outlined {
  font-size: 18px;
  color: #45464f;
  margin-top: 2px;
}
.event-details small {
  display: block;
  color: #45464f;
  font-size: 12px;
  line-height: 16px;
}
.event-details time {
  display: block;
  text-transform: capitalize;
  font-weight: 500;
}
.meeting-link {
  color: #283a70;
}
.filters {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px;
  margin-bottom: 20px;
}
.filters label {
  display: grid;
  gap: 4px;
  font-size: 12px;
}
.filters input,
.filters select {
  padding: 8px 12px;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  background: #f9f9ff;
}
.clear-filter {
  padding: 0;
  background: transparent;
  border: 0;
  color: #283a70;
  font-size: 12px;
}
.empty {
  display: grid;
  justify-items: center;
  gap: 16px;
  padding: 40px 20px;
  text-align: center;
  color: #45464f;
}
@media (max-width: 1100px) {
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .agenda-grid {
    grid-template-columns: 1fr;
  }
  .calendar-column {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}
@media (max-width: 600px) {
  .calendar-column,
  .event-details {
    grid-template-columns: 1fr;
  }
  .event-card > header {
    flex-wrap: wrap;
  }
  .header-actions {
    flex-wrap: wrap;
  }
  h1 {
    font-size: 24px;
    line-height: 32px;
  }
  .timeline li {
    padding-left: 44px;
  }
}

.automatic-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 16px;
  margin-bottom: 16px;
  border: 1px solid #d6d9e9;
  border-radius: 8px;
  background: #ededf8;
  color: #44558d;
}
.automatic-notice p {
  font-size: 12px;
  line-height: 19px;
  flex: 1;
}
.automatic-notice small {
  font-size: 10px;
  white-space: nowrap;
}
.connection-error {
  padding: 14px 16px;
  margin-bottom: 16px;
  border-radius: 7px;
  background: #fff1de;
  color: #755200;
  font-size: 12px;
}
.expediente-context {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  font-size: 12px;
  color: #606575;
}
.expediente-context strong {
  color: #283a70;
}
.expediente-context label {
  display: flex;
  gap: 8px;
  align-items: center;
}
.calendar-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e2e2e8;
  color: #757681;
  font-size: 10px;
}
.calendar-legend > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.calendar-legend i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.legend-personal {
  background: #006b5c;
}
.legend-followup {
  background: #283a70;
}
.calendar-legend button {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: #283a70;
  font-size: 11px;
  cursor: pointer;
}
.personal {
  --event-color: #006b5c;
  --event-background: #d8f8ec;
}
.warning {
  --event-color: #936800;
  --event-background: #ffdf9b;
}
.personal-summary {
  padding: 18px 16px;
  border-color: #b3d6cd;
}
.personal-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #006b5c;
  margin-bottom: 12px;
}
.personal-heading h2 {
  font-size: 14px;
  flex: 1;
}
.personal-heading > strong {
  padding: 3px 8px;
  border-radius: 8px;
  background: #e5f4ef;
}
.personal-summary p {
  font-size: 12px;
  line-height: 20px;
  color: #45464f;
}
.personal-summary small {
  display: block;
  font-size: 11px;
  margin: 8px 0;
  color: #606575;
}
.personal-link,
.event-footer a {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #283a70;
  font-weight: 600;
  font-size: 12px;
  text-decoration: none;
}
.personal-link {
  margin-top: 12px;
}
.personal-link span,
.event-footer a span {
  font-size: 16px;
}
.remaining {
  margin-top: 14px;
  color: #283a70;
  font-size: 14px;
  font-weight: 600;
}
.remaining.overdue {
  color: #ba1a1a;
}
.participants {
  font-size: 11px;
  color: #606575;
  margin: 4px 0;
}
.event-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e2e2e8;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}
.event-footer p {
  flex: 1 1 200px;
  color: #606575;
  font-size: 11px;
  line-height: 18px;
}
.empty p {
  font-size: 13px;
  line-height: 21px;
  max-width: 450px;
}
.loading {
  min-height: 240px;
  align-content: center;
}
button:focus-visible,
a:focus-visible {
  outline: 2px solid #4962a0;
  outline-offset: 3px;
}
@media (max-width: 600px) {
  .automatic-notice {
    flex-wrap: wrap;
  }
  .automatic-notice small {
    margin-left: 34px;
  }
  .automatic-notice p {
    flex-basis: calc(100% - 40px);
  }
}
</style>
