<script setup lang="ts">
import { computed, ref } from 'vue'

// Eventos de la plantilla de referencia, pendientes de conexión con la agenda real.
const eventos = [
  {
    id: 1,
    titulo: 'Reunión de jurado',
    tipo: 'Evaluación',
    estado: 'Próximo',
    fecha: '2024-10-24',
    hora: '10:00 AM - 11:30 AM',
    modalidad: 'Virtual',
    lugar: 'Google Meet (enlace pendiente)',
    icono: 'groups',
    ubicacion: 'location_on',
    tono: 'evaluation',
  },
  {
    id: 2,
    titulo: 'Límite de subsanación',
    tipo: 'Trámite',
    estado: 'Crítico',
    fecha: '2024-10-28',
    hora: '11:59 PM',
    modalidad: 'Documental',
    lugar: 'Subida en SISET',
    icono: 'assignment_late',
    ubicacion: 'upload_file',
    tono: 'critical',
  },
  {
    id: 3,
    titulo: 'Sustentación (Tesis Final)',
    tipo: 'Hito final',
    estado: 'Programado',
    fecha: '2024-11-15',
    hora: '09:00 AM - 11:00 AM',
    modalidad: 'Presencial',
    lugar: 'Auditorio Principal FCE',
    icono: 'school',
    ubicacion: 'apartment',
    tono: 'final',
  },
]
const mes = ref(new Date(2024, 9, 1))
const fechaSeleccionada = ref('')
const tipo = ref('')
const filtrosAbiertos = ref(false)
const diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
function claveFecha(fecha: Date) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}
const tituloMes = computed(() =>
  new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(mes.value),
)
const dias = computed(() => {
  const anio = mes.value.getFullYear()
  const numeroMes = mes.value.getMonth()
  const inicio = (new Date(anio, numeroMes, 1).getDay() + 6) % 7
  const total = Math.ceil((inicio + new Date(anio, numeroMes + 1, 0).getDate()) / 7) * 7
  return Array.from({ length: total }, (_, indice) => {
    const fecha = new Date(anio, numeroMes, indice - inicio + 1)
    const clave = claveFecha(fecha)
    return {
      clave,
      numero: fecha.getDate(),
      fuera: fecha.getMonth() !== numeroMes,
      evento: eventos.find((evento) => evento.fecha === clave),
    }
  })
})
const visibles = computed(() =>
  eventos.filter(
    (evento) =>
      (!tipo.value || evento.tipo === tipo.value) &&
      (!fechaSeleccionada.value || evento.fecha === fechaSeleccionada.value),
  ),
)
function cambiarMes(paso: number) {
  mes.value = new Date(mes.value.getFullYear(), mes.value.getMonth() + paso, 1)
  fechaSeleccionada.value = ''
}
function fechaTexto(clave: string) {
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${clave}T12:00:00`))
}
function limpiar() {
  tipo.value = ''
  fechaSeleccionada.value = ''
}
</script>

<template>
  <section class="agenda-view" aria-labelledby="agenda-title">
    <header class="page-heading">
      <div>
        <h1 id="agenda-title">Agenda Académica</h1>
        <p>Consulta y seguimiento de tus eventos del proceso de titulación.</p>
      </div>
      <div class="header-actions">
        <button
          class="button"
          :aria-expanded="filtrosAbiertos"
          aria-controls="agenda-filtros"
          @click="filtrosAbiertos = !filtrosAbiertos"
        >
          <span class="material-symbols-outlined" aria-hidden="true">filter_list</span
          >Filtrar</button
        ><button
          class="button primary"
          disabled
          title="Sincronización pendiente de conexión con la agenda real"
        >
          <span class="material-symbols-outlined" aria-hidden="true">calendar_add_on</span
          >Sincronizar Calendario
        </button>
      </div>
    </header>
    <p class="reference-notice">
      Agenda de ejemplo de la plantilla (octubre–noviembre de 2024). Estos eventos no representan tu
      programación real.
    </p>
    <div v-if="filtrosAbiertos" id="agenda-filtros" class="card filters">
      <label
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
        <section class="card calendar" aria-label="Calendario de eventos">
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
                  reference: !fechaSeleccionada && dia.clave === '2024-10-24',
                },
              ]"
              :aria-label="`${fechaTexto(dia.clave)}${dia.evento ? `: ${dia.evento.titulo}` : ''}`"
              :aria-pressed="fechaSeleccionada === dia.clave"
              @click="fechaSeleccionada = fechaSeleccionada === dia.clave ? '' : dia.clave"
            >
              {{ dia.numero }}<span v-if="dia.evento" class="event-dot" aria-hidden="true"></span>
            </button>
          </div>
        </section>
        <section class="card event-count" aria-label="Resumen de eventos de ejemplo">
          <div>
            <p>Eventos restantes</p>
            <strong>{{ visibles.length }}</strong>
          </div>
          <span class="material-symbols-outlined" aria-hidden="true">event_available</span>
        </section>
      </aside>
      <section class="card upcoming" aria-labelledby="events-title">
        <header>
          <h2 id="events-title">Próximos Eventos</h2>
          <button v-if="fechaSeleccionada || tipo" class="clear-filter" @click="limpiar">
            Ver todos
          </button>
        </header>
        <span class="sr-only" role="status">{{ visibles.length }} eventos encontrados.</span>
        <ol v-if="visibles.length" class="timeline">
          <li v-for="evento in visibles" :key="evento.id" :class="evento.tono">
            <span class="event-node material-symbols-outlined" aria-hidden="true">{{
              evento.icono
            }}</span>
            <article class="event-card">
              <header>
                <div>
                  <span class="event-type">{{ evento.tipo }}</span>
                  <h3>{{ evento.titulo }}</h3>
                </div>
                <span class="status">{{ evento.estado }}</span>
              </header>
              <div class="event-details">
                <div>
                  <span class="material-symbols-outlined" aria-hidden="true">event</span>
                  <div>
                    <small>{{ evento.tipo === 'Trámite' ? 'Fecha Límite' : 'Fecha y Hora' }}</small
                    ><time :datetime="evento.fecha">{{ fechaTexto(evento.fecha) }}</time>
                    <p>{{ evento.hora }}</p>
                  </div>
                </div>
                <div>
                  <span class="material-symbols-outlined" aria-hidden="true">{{
                    evento.ubicacion
                  }}</span>
                  <div>
                    <small>{{
                      evento.tipo === 'Trámite' ? 'Modalidad' : 'Modalidad y Lugar'
                    }}</small>
                    <p>{{ evento.modalidad }}</p>
                    <p :class="{ 'meeting-link': evento.modalidad === 'Virtual' }">
                      {{ evento.lugar }}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </li>
        </ol>
        <div v-else class="empty">
          <span class="material-symbols-outlined" aria-hidden="true">event_busy</span>
          <p>No hay eventos para los filtros seleccionados.</p>
          <button class="button" @click="limpiar">Ver todos los eventos</button>
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
</style>
