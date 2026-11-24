<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'

type Dia = { id: number; fecha: string; motivo: string }
const auth = useAuthStore()
const puedeEditar = computed(() => auth.tieneRol('udi', 'administrador', 'decanatura'))
const anio = ref(
  Number(
    new Intl.DateTimeFormat('en', { timeZone: 'America/Lima', year: 'numeric' }).format(new Date()),
  ),
)
const nacionales = ref<string[]>([])
const dias = ref<Dia[]>([])
const tipo = ref<'institucionales' | 'nacionales'>('institucionales')
const busqueda = ref('')
const fecha = ref('')
const motivo = ref('')
const error = ref('')
const errorFormulario = ref('')
const aviso = ref('')
const cargando = ref(true)
const ocupado = ref(false)
const dialogo = ref<HTMLDialogElement | null>(null)
const seleccionado = ref<Dia | null>(null)
const total = computed(() => new Set([...nacionales.value, ...dias.value.map((d) => d.fecha)]).size)
const normalizar = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
const registros = computed(() =>
  tipo.value === 'institucionales'
    ? dias.value
    : nacionales.value.map((fecha) => ({ id: 0, fecha, motivo: 'Feriado nacional del Perú' })),
)
const visibles = computed(() =>
  registros.value.filter((d) =>
    normalizar(d.fecha + ' ' + d.motivo + ' ' + fechaTexto(d.fecha)).includes(
      normalizar(busqueda.value.trim()),
    ),
  ),
)
function fechaTexto(valor: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(valor + 'T12:00:00'))
}
function diaSemana(valor: string) {
  return new Intl.DateTimeFormat('es-PE', { weekday: 'long' }).format(new Date(valor + 'T12:00:00'))
}
async function cargar() {
  if (!Number.isInteger(anio.value) || anio.value < 2026 || anio.value > 2100) return
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<{ nacionales: string[]; institucionales: Dia[] }>(
      '/calendario-laboral',
      { params: { anio: anio.value } },
    )
    nacionales.value = data.nacionales.sort()
    dias.value = data.institucionales
  } catch {
    error.value = 'No se pudo cargar el calendario laboral. Intenta nuevamente.'
  } finally {
    cargando.value = false
  }
}
function abrir(dia: Dia | null = null) {
  seleccionado.value = dia
  fecha.value = ''
  motivo.value = ''
  errorFormulario.value = ''
  aviso.value = ''
  dialogo.value?.showModal()
}
async function guardar() {
  if (ocupado.value) return
  ocupado.value = true
  errorFormulario.value = ''
  try {
    if (seleccionado.value) await api.delete('/calendario-laboral/' + seleccionado.value.id)
    else {
      await api.post('/calendario-laboral', { fecha: fecha.value, motivo: motivo.value.trim() })
      anio.value = Number(fecha.value.slice(0, 4))
      tipo.value = 'institucionales'
      busqueda.value = ''
    }
    aviso.value = seleccionado.value
      ? 'Día no laborable retirado del calendario.'
      : 'Día no laborable registrado correctamente.'
    dialogo.value?.close()
    await cargar()
  } catch (e) {
    errorFormulario.value = axios.isAxiosError(e)
      ? (e.response?.data?.errors?.fecha?.[0] ??
        e.response?.data?.errors?.motivo?.[0] ??
        e.response?.data?.message ??
        'No se pudo guardar el cambio.')
      : 'No se pudo guardar el cambio.'
  } finally {
    ocupado.value = false
  }
}
onMounted(cargar)
</script>

<template>
  <section class="calendario-page" aria-labelledby="calendario-title" :aria-busy="cargando">
    <header class="heading">
      <div>
        <h1 id="calendario-title">Calendario Laboral</h1>
        <p>
          Gestione los feriados y días no laborables que se consideran en los plazos del trámite.
        </p>
      </div>
      <button
        v-if="puedeEditar"
        class="primary"
        :disabled="cargando || ocupado || !!error"
        @click="abrir()"
      >
        <span class="material-symbols-outlined" aria-hidden="true">add_circle</span>Nuevo día no
        laborable
      </button>
    </header>
    <p v-if="aviso" class="notice success" role="status">
      <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>{{ aviso }}
    </p>
    <div v-if="error" class="notice error" role="alert">
      {{ error }}<button @click="cargar">Reintentar</button>
    </div>
    <div class="stats">
      <article>
        <span class="stat-icon material-symbols-outlined" aria-hidden="true">calendar_month</span>
        <div>
          <h2>Fechas no laborables</h2>
          <strong>{{ cargando || error ? '—' : total }}</strong
          ><small>Calendario {{ anio }}</small>
        </div>
      </article>
      <article>
        <span class="stat-icon green material-symbols-outlined" aria-hidden="true">flag</span>
        <div>
          <h2>Feriados nacionales</h2>
          <strong>{{ cargando || error ? '—' : nacionales.length }}</strong
          ><small>De alcance nacional</small>
        </div>
      </article>
      <article>
        <span class="stat-icon gold material-symbols-outlined" aria-hidden="true"
          >account_balance</span
        >
        <div>
          <h2>Días institucionales</h2>
          <strong>{{ cargando || error ? '—' : dias.length }}</strong
          ><small>Registrados por la institución</small>
        </div>
      </article>
    </div>
    <section class="listado" aria-labelledby="listado-title">
      <header class="table-heading">
        <div>
          <h2 id="listado-title">Días no laborables</h2>
          <p>Consulte las fechas del año y administre las excepciones institucionales.</p>
        </div>
        <button
          class="icon-button"
          :disabled="cargando || ocupado"
          aria-label="Actualizar calendario"
          title="Actualizar calendario"
          @click="cargar"
        >
          <span class="material-symbols-outlined" aria-hidden="true">refresh</span>
        </button>
      </header>
      <div class="filters">
        <label class="search"
          >Buscar fecha o motivo
          <div class="input-icon">
            <span class="material-symbols-outlined" aria-hidden="true">search</span
            ><input
              v-model="busqueda"
              type="search"
              placeholder="Buscar por fecha, mes o disposición…"
            /></div
        ></label>
        <label class="year"
          >Año del calendario<input
            v-model.number="anio"
            type="number"
            min="2026"
            max="2100"
            :disabled="cargando || ocupado"
            @change="cargar"
        /></label>
      </div>
      <div class="tabs" role="group" aria-label="Tipo de día no laborable">
        <button
          :class="{ selected: tipo === 'institucionales' }"
          :aria-pressed="tipo === 'institucionales'"
          @click="tipo = 'institucionales'"
        >
          <span class="material-symbols-outlined" aria-hidden="true">account_balance</span
          >Institucionales<span class="tab-count">{{ cargando || error ? '—' : dias.length }}</span>
        </button>
        <button
          :class="{ selected: tipo === 'nacionales' }"
          :aria-pressed="tipo === 'nacionales'"
          @click="tipo = 'nacionales'"
        >
          <span class="material-symbols-outlined" aria-hidden="true">flag</span>Feriados
          nacionales<span class="tab-count">{{ cargando || error ? '—' : nacionales.length }}</span>
        </button>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Motivo o disposición</th>
              <th>Tipo</th>
              <th class="actions-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cargando">
              <td colspan="4" class="empty" role="status">Cargando calendario laboral…</td>
            </tr>
            <tr v-else-if="error">
              <td colspan="4" class="empty">
                El listado no está disponible. Actualice el calendario para volver a consultar.
              </td>
            </tr>
            <tr v-for="d in cargando || error ? [] : visibles" :key="d.fecha">
              <td class="date-cell">
                <strong>{{ fechaTexto(d.fecha) }}</strong
                ><small>{{ diaSemana(d.fecha) }}</small>
              </td>
              <td class="reason-cell">{{ d.motivo }}</td>
              <td>
                <span class="badge" :class="{ national: tipo === 'nacionales' }">{{
                  tipo === 'nacionales' ? 'NACIONAL' : 'INSTITUCIONAL'
                }}</span>
              </td>
              <td class="actions-col">
                <button
                  v-if="puedeEditar && tipo === 'institucionales'"
                  class="icon-button danger"
                  :disabled="ocupado"
                  :aria-label="'Retirar ' + d.motivo + ' del ' + fechaTexto(d.fecha)"
                  title="Retirar del calendario"
                  @click="abrir(d)"
                >
                  <span class="material-symbols-outlined" aria-hidden="true">delete</span></button
                ><span v-else class="read-only"
                  ><span class="material-symbols-outlined" aria-hidden="true">lock</span>Solo
                  lectura</span
                >
              </td>
            </tr>
            <tr v-if="!cargando && !error && !visibles.length">
              <td colspan="4" class="empty">
                <span class="empty-icon material-symbols-outlined" aria-hidden="true"
                  >event_available</span
                >
                <h3>
                  {{
                    busqueda
                      ? 'No se encontraron coincidencias'
                      : 'Sin días institucionales registrados'
                  }}
                </h3>
                <p>
                  {{
                    busqueda
                      ? 'Pruebe con otra fecha o un motivo diferente.'
                      : 'Agregue los aniversarios y otras fechas oficialmente declaradas no laborables para ' +
                        anio +
                        '.'
                  }}
                </p>
                <button v-if="busqueda" @click="busqueda = ''">Limpiar búsqueda</button
                ><button v-else-if="puedeEditar && tipo === 'institucionales'" @click="abrir()">
                  <span class="material-symbols-outlined" aria-hidden="true">add</span>Registrar
                  primer día
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer class="table-footer">
        <span
          >{{ cargando || error ? '—' : visibles.length }}
          {{ tipo === 'institucionales' ? 'días institucionales' : 'feriados nacionales' }} · Año
          {{ anio }}</span
        ><span class="timezone"
          ><span class="material-symbols-outlined" aria-hidden="true">schedule</span>Hora de
          Lima</span
        >
      </footer>
    </section>
    <aside class="info">
      <span class="material-symbols-outlined" aria-hidden="true">info</span>
      <div>
        <strong>¿Cómo influye en los plazos?</strong>
        <p>
          Los días hábiles excluyen sábados, domingos y las fechas de este calendario. Los plazos en
          días calendario cuentan todos los días. Al modificar una fecha, se actualizan los plazos
          hábiles abiertos; los ciclos cerrados conservan su historial.
        </p>
      </div>
    </aside>
    <dialog ref="dialogo" aria-labelledby="dia-title" @cancel="ocupado && $event.preventDefault()">
      <form @submit.prevent="guardar">
        <header class="dialog-heading">
          <span class="dialog-icon material-symbols-outlined" aria-hidden="true">{{
            seleccionado ? 'event_busy' : 'event_note'
          }}</span>
          <div>
            <h2 id="dia-title">
              {{ seleccionado ? 'Retirar día no laborable' : 'Nuevo día no laborable' }}
            </h2>
            <p>
              {{
                seleccionado
                  ? 'Revise la fecha antes de retirarla del calendario.'
                  : 'Registre una fecha declarada no laborable por la institución.'
              }}
            </p>
          </div>
        </header>
        <div v-if="seleccionado" class="selected-day">
          <strong>{{ fechaTexto(seleccionado.fecha) }}</strong>
          <p>{{ seleccionado.motivo }}</p>
        </div>
        <div v-else class="form-fields">
          <label
            >Fecha<input
              v-model="fecha"
              type="date"
              min="2026-01-01"
              max="2100-12-31"
              required
              :disabled="ocupado" /></label
          ><label
            >Motivo o disposición institucional<textarea
              v-model="motivo"
              required
              minlength="5"
              maxlength="200"
              rows="3"
              :disabled="ocupado"
              placeholder="Ej.: Aniversario de la Facultad de Ciencias Económicas"
            ></textarea
            ><small
              >Indique la actividad o disposición que sustenta el día no laborable.</small
            ></label
          >
        </div>
        <p class="dialog-note">
          {{
            seleccionado
              ? 'Esta fecha volverá a contarse en los plazos hábiles abiertos, salvo que también sea feriado nacional o fin de semana.'
              : 'La fecha se aplicará a los plazos hábiles abiertos y a los nuevos ciclos del trámite.'
          }}
        </p>
        <p v-if="errorFormulario" class="notice error" role="alert">{{ errorFormulario }}</p>
        <footer>
          <button type="button" :disabled="ocupado" @click="dialogo?.close()">Cancelar</button
          ><button :class="seleccionado ? 'destructive' : 'primary'" :disabled="ocupado">
            {{
              ocupado
                ? 'Guardando…'
                : seleccionado
                  ? 'Retirar del calendario'
                  : 'Guardar día no laborable'
            }}
          </button>
        </footer>
      </form>
    </dialog>
  </section>
</template>

<style scoped>
.calendario-page {
  display: grid;
  gap: 28px;
  color: #30343c;
}
h1,
h2,
h3,
p {
  margin: 0;
}
h1 {
  font: 700 28px/36px var(--siset-font-heading);
  color: #283a70;
}
.heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.heading p {
  font-size: 14px;
  line-height: 22px;
  color: #45464f;
  margin-top: 6px;
  max-width: 720px;
}
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid #c5c6d1;
  border-radius: 6px;
  background: white;
  color: #283a70;
  font-size: 12px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button:hover:not(:disabled) {
  background: #f0f1f9;
}
button:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid #4962a0;
  outline-offset: 3px;
}
.primary {
  background: #283a70;
  color: white;
  border-color: #283a70;
  padding: 13px 20px;
  white-space: nowrap;
}
.primary:hover:not(:disabled) {
  background: #344985;
}
.material-symbols-outlined {
  font-size: 21px;
  flex-shrink: 0;
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}
.stats article {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: white;
  border: 1px solid #c5c6d1;
  border-radius: 8px;
  box-shadow: 0 1px 2px #0001;
}
.stat-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #283a7012;
  color: #283a70;
  font-size: 25px;
}
.stat-icon.green {
  background: #006b5c12;
  color: #006b5c;
}
.stat-icon.gold {
  background: #fff1d3;
  color: #8a6300;
}
.stats h2 {
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 700;
  color: #45464f;
  line-height: 16px;
}
.stats strong {
  display: block;
  font: 600 28px/36px var(--siset-font-heading);
  color: #283a70;
  margin-top: 3px;
}
.stats small {
  display: block;
  color: #757681;
  font-size: 11px;
  margin-top: 2px;
}
.listado {
  background: white;
  border: 1px solid #c5c6d1;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px #0001;
}
.table-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  background: #f3f3f9;
  border-bottom: 1px solid #e2e2e8;
}
.table-heading h2 {
  font-size: 17px;
  font-weight: 600;
  color: #283a70;
}
.table-heading p {
  font-size: 12px;
  color: #757681;
  margin-top: 4px;
}
.icon-button {
  padding: 7px;
  background: transparent;
}
.danger {
  border-color: transparent;
  color: #ba1a1a;
}
.filters {
  display: flex;
  align-items: end;
  gap: 20px;
  padding: 20px 24px;
}
label {
  display: grid;
  gap: 7px;
  font-size: 12px;
  color: #45464f;
  font-weight: 500;
}
.search {
  flex: 1;
}
.year {
  width: 150px;
}
input,
textarea {
  width: 100%;
  min-width: 0;
  border: 1px solid #c5c6d1;
  border-radius: 5px;
  background: #fdfdff;
  padding: 11px 12px;
  font-size: 13px;
  color: #30343c;
}
.input-icon {
  position: relative;
}
.input-icon > span {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #858795;
  font-size: 20px;
}
.input-icon input {
  padding-left: 40px;
}
.tabs {
  display: flex;
  gap: 20px;
  padding: 0 24px;
  border-bottom: 1px solid #c5c6d1;
  overflow-x: auto;
}
.tabs button {
  gap: 8px;
  border: 0;
  border-bottom: 3px solid transparent;
  border-radius: 0;
  padding: 12px 0;
  color: #757681;
  white-space: nowrap;
}
.tabs .selected {
  border-bottom-color: #283a70;
  color: #283a70;
  font-weight: 600;
}
.tabs button:hover {
  background: transparent;
  color: #283a70;
}
.tab-count {
  background: #ededf4;
  color: #606575;
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 10px;
}
.selected .tab-count {
  background: #dce1ff;
  color: #283a70;
}
.table-scroll {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
}
th {
  padding: 14px 24px;
  background: #f9f9ff;
  color: #60616c;
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.4px;
}
td {
  padding: 17px 24px;
  border-top: 1px solid #e2e2e8;
}
.date-cell {
  min-width: 210px;
}
.date-cell strong {
  font-weight: 500;
}
.date-cell small {
  display: block;
  font-size: 11px;
  color: #757681;
  margin-top: 4px;
  text-transform: capitalize;
}
.reason-cell {
  min-width: 220px;
  overflow-wrap: anywhere;
}
.badge {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 14px;
  color: #8a6300;
  background: #fff3d8;
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
}
.badge.national {
  color: #006b5c;
  background: #e5f4ef;
}
.actions-col {
  text-align: right;
  white-space: nowrap;
}
.read-only {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #858795;
  font-size: 11px;
}
.read-only span {
  font-size: 14px;
}
.empty {
  text-align: center;
  padding: 38px 24px;
  color: #757681;
}
.empty-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  margin: 0 auto 14px;
  background: #f0f1f9;
  color: #7d89ac;
  font-size: 29px;
}
.empty h3 {
  font-size: 14px;
  font-weight: 600;
  color: #45464f;
}
.empty p {
  max-width: 450px;
  margin: 8px auto 18px;
  font-size: 12px;
  line-height: 20px;
}
.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 17px 24px;
  border-top: 1px solid #e2e2e8;
  color: #757681;
  font-size: 12px;
}
.timezone {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.timezone span {
  font-size: 16px;
}
.info {
  display: flex;
  align-items: start;
  gap: 12px;
  padding: 17px 20px;
  background: #ededf8;
  border: 1px solid #d6d9e9;
  border-radius: 8px;
  color: #44558d;
}
.info strong {
  font-size: 12px;
  font-weight: 600;
}
.info p {
  font-size: 12px;
  line-height: 20px;
  margin-top: 5px;
  color: #606575;
}
.notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 20px;
}
.success {
  background: #e5f4ef;
  color: #006b5c;
}
.error {
  background: #fff0ef;
  color: #ba1a1a;
}
dialog {
  width: min(540px, calc(100vw - 32px));
  max-height: 90dvh;
  overflow-y: auto;
  padding: 28px;
  border: 1px solid #c5c6d1;
  border-radius: 12px;
  box-shadow: 0 20px 70px #131b3b30;
  color: #30343c;
}
dialog::backdrop {
  background: #131b3b70;
}
dialog form {
  display: grid;
  gap: 22px;
}
.dialog-heading {
  display: flex;
  gap: 14px;
  align-items: start;
}
.dialog-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #edf0ff;
  color: #283a70;
}
.dialog-heading h2 {
  font: 600 20px/28px var(--siset-font-heading);
  color: #283a70;
}
.dialog-heading p {
  font-size: 12px;
  line-height: 20px;
  color: #757681;
  margin-top: 4px;
}
.form-fields {
  display: grid;
  gap: 18px;
}
textarea {
  resize: vertical;
}
.form-fields small {
  font-size: 11px;
  font-weight: 400;
  color: #757681;
  line-height: 18px;
}
.dialog-note {
  background: #f5f5fb;
  padding: 12px 14px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 20px;
  color: #606575;
}
.selected-day {
  padding: 16px;
  border: 1px solid #e2e2e8;
  border-radius: 6px;
}
.selected-day p {
  margin-top: 6px;
  font-size: 13px;
}
dialog footer {
  display: flex;
  justify-content: end;
  gap: 10px;
  padding-top: 4px;
}
.destructive {
  background: #ba1a1a;
  border-color: #ba1a1a;
  color: white;
}
.destructive:hover:not(:disabled) {
  background: #a01515;
}
@media (max-width: 1000px) {
  .stats {
    gap: 14px;
  }
  .stats article {
    padding: 18px;
    gap: 12px;
  }
  .stat-icon {
    width: 40px;
    height: 40px;
  }
}
@media (max-width: 700px) {
  .heading {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  .heading .primary {
    align-self: start;
  }
  .stats {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .stats article {
    padding: 18px 20px;
  }
  .stats article > div {
    flex: 1;
  }
  .filters {
    flex-direction: column;
    align-items: stretch;
    padding: 18px;
    gap: 14px;
  }
  .year {
    width: 100%;
  }
  .tabs {
    padding: 0 18px;
    gap: 18px;
  }
  .table-heading {
    padding: 18px;
  }
  .table-footer {
    flex-wrap: wrap;
    padding: 16px 18px;
  }
  h1 {
    font-size: 25px;
  }
  dialog {
    padding: 22px;
  }
  dialog footer {
    flex-wrap: wrap;
  }
}
</style>
