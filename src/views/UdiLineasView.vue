<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import api from '@/services/api'

interface Linea {
  id_linea_investigacion: number
  nombre: string
  estado: 0 | 1
}
const lineas = ref<Linea[]>([])
const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const aviso = ref('')
const busqueda = ref('')
const estado = ref('todos')
const pagina = ref(1)
const dialogo = ref<HTMLDialogElement | null>(null)
const seleccionada = ref<Linea | null>(null)
const nombre = ref('')
const modo = ref<'editar' | 'estado'>('editar')
const errorFormulario = ref('')
const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
const activas = computed(() => lineas.value.filter((l) => l.estado === 1).length)
const filtradas = computed(() =>
  lineas.value.filter(
    (l) =>
      (estado.value === 'todos' || String(l.estado) === estado.value) &&
      normalizar(l.nombre).includes(normalizar(busqueda.value.trim())),
  ),
)
const paginas = computed(() => Math.max(1, Math.ceil(filtradas.value.length / 8)))
const visibles = computed(() => filtradas.value.slice((pagina.value - 1) * 8, pagina.value * 8))
watch([busqueda, estado], () => {
  pagina.value = 1
})
function mensaje(e: unknown) {
  if (axios.isAxiosError(e)) {
    if (e.response?.status === 422)
      return e.response.data.errors?.nombre?.[0] || 'Revise los datos ingresados.'
    if (e.response?.status === 403)
      return 'No tiene permiso para gestionar líneas de investigación.'
  }
  return 'No se pudo completar la operación. Intente nuevamente.'
}
async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<Linea[]>('/lineas-investigacion', {
      params: { estado: 'todos' },
    })
    lineas.value = data
    pagina.value = Math.min(pagina.value, paginas.value)
  } catch (e) {
    error.value = mensaje(e)
  } finally {
    cargando.value = false
  }
}
function abrir(linea: Linea | null = null, accion: 'editar' | 'estado' = 'editar') {
  seleccionada.value = linea
  nombre.value = linea?.nombre ?? ''
  modo.value = accion
  errorFormulario.value = ''
  aviso.value = ''
  dialogo.value?.showModal()
}
async function guardar() {
  if (guardando.value) return
  errorFormulario.value = ''
  if (modo.value === 'editar' && (!nombre.value.trim() || nombre.value.trim().length > 50)) {
    errorFormulario.value = 'Ingrese un nombre de entre 1 y 50 caracteres.'
    return
  }
  guardando.value = true
  const linea = seleccionada.value
  try {
    const payload =
      modo.value === 'estado' && linea
        ? { nombre: linea.nombre, estado: linea.estado === 1 ? 0 : 1 }
        : { nombre: nombre.value.trim() }
    const { data } = linea
      ? await api.put<{ data: Linea }>(
          `/lineas-investigacion/${linea.id_linea_investigacion}`,
          payload,
        )
      : await api.post<{ data: Linea }>('/lineas-investigacion', payload)
    if (linea)
      lineas.value = lineas.value.map((l) =>
        l.id_linea_investigacion === linea.id_linea_investigacion ? data.data : l,
      )
    else lineas.value.push(data.data)
    lineas.value.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    pagina.value = Math.min(pagina.value, paginas.value)
    aviso.value =
      modo.value === 'estado'
        ? 'Estado actualizado correctamente.'
        : 'Línea guardada correctamente.'
    dialogo.value?.close()
  } catch (e) {
    errorFormulario.value = mensaje(e)
  } finally {
    guardando.value = false
  }
}
function exportar() {
  const filas = [
    ['ID', 'Nombre de línea', 'Estado'],
    ...filtradas.value.map((l) => [
      String(l.id_linea_investigacion),
      l.nombre,
      l.estado === 1 ? 'Activo' : 'Inactivo',
    ]),
  ]
  const csv = filas
    .map((f) =>
      f.map((v) => `"${(/^[=+@\-\t\r]/.test(v) ? "'" + v : v).replaceAll('"', '""')}"`).join(';'),
    )
    .join('\r\n')
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = 'lineas-investigacion.csv'
  enlace.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
onMounted(cargar)
</script>

<template>
  <section class="lineas-page">
    <header class="heading">
      <div>
        <h1>Líneas de Investigación</h1>
        <p>Gestión y supervisión de las líneas académicas vigentes para proyectos de tesis.</p>
      </div>
      <button class="primary" :disabled="cargando || !!error" @click="abrir()">
        <span class="material-symbols-outlined" aria-hidden="true">add_circle</span>Nueva línea
      </button>
    </header>
    <p v-if="aviso" class="success" role="status">{{ aviso }}</p>
    <p v-if="cargando" role="status">Cargando líneas de investigación…</p>
    <div v-else-if="error" class="error" role="alert">
      {{ error }} <button @click="cargar">Reintentar</button>
    </div>
    <template v-else>
      <div class="stats">
        <article>
          <span class="material-symbols-outlined" aria-hidden="true">analytics</span>
          <div>
            <h2>Total de líneas</h2>
            <strong>{{ lineas.length }}</strong>
          </div>
        </article>
        <article>
          <span class="material-symbols-outlined green" aria-hidden="true">check_circle</span>
          <div>
            <h2>Líneas activas</h2>
            <strong>{{ activas }}</strong>
          </div>
        </article>
        <article>
          <span class="material-symbols-outlined red" aria-hidden="true">cancel</span>
          <div>
            <h2>Líneas inactivas</h2>
            <strong>{{ lineas.length - activas }}</strong>
          </div>
        </article>
      </div>
      <section class="listado" aria-label="Listado de líneas">
        <header class="table-heading">
          <h2>Listado Maestro</h2>
          <div>
            <button aria-label="Actualizar listado" title="Actualizar listado" @click="cargar">
              <span class="material-symbols-outlined">refresh</span></button
            ><button
              aria-label="Descargar listado CSV"
              title="Descargar listado CSV"
              :disabled="!filtradas.length"
              @click="exportar"
            >
              <span class="material-symbols-outlined">download</span>
            </button>
          </div>
        </header>
        <div class="filters">
          <label
            >Buscar línea<input
              v-model="busqueda"
              type="search"
              placeholder="Buscar por nombre…" /></label
          ><label
            >Estado<select v-model="estado">
              <option value="todos">Todos los estados</option>
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select></label
          >
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nombre de línea</th>
                <th>Estado</th>
                <th class="actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="linea in visibles" :key="linea.id_linea_investigacion">
                <td>
                  <strong>{{ linea.nombre }}</strong
                  ><small>ID: {{ linea.id_linea_investigacion }}</small>
                </td>
                <td>
                  <span class="badge" :class="{ inactive: !linea.estado }">{{
                    linea.estado ? 'ACTIVO' : 'INACTIVO'
                  }}</span>
                </td>
                <td>
                  <div class="row-actions">
                    <button @click="abrir(linea)">
                      <span class="material-symbols-outlined" aria-hidden="true">edit</span
                      >Editar</button
                    ><button
                      :class="linea.estado ? 'danger' : 'activate'"
                      @click="abrir(linea, 'estado')"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">{{
                        linea.estado ? 'block' : 'check_circle'
                      }}</span
                      >{{ linea.estado ? 'Inactivar' : 'Activar' }}
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!visibles.length">
                <td colspan="3" class="empty">
                  {{
                    lineas.length
                      ? 'No hay líneas que coincidan con los filtros.'
                      : 'Aún no hay líneas de investigación registradas.'
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer class="pagination">
          <span>{{ filtradas.length }} registros · Página {{ pagina }} de {{ paginas }}</span>
          <div>
            <button :disabled="pagina === 1" @click="pagina--">Anterior</button
            ><button :disabled="pagina >= paginas" @click="pagina++">Siguiente</button>
          </div>
        </footer>
      </section>
    </template>
    <dialog
      ref="dialogo"
      aria-labelledby="form-title"
      @cancel="guardando && $event.preventDefault()"
    >
      <form @submit.prevent="guardar">
        <h2 id="form-title">
          {{
            modo === 'estado'
              ? seleccionada?.estado
                ? 'Inactivar línea'
                : 'Activar línea'
              : seleccionada
                ? 'Editar línea'
                : 'Nueva línea'
          }}
        </h2>
        <template v-if="modo === 'editar'"
          ><label
            >Nombre de la línea<input
              v-model="nombre"
              autofocus
              required
              maxlength="50"
              :disabled="guardando" /></label
          ><small>{{ nombre.length }}/50 caracteres</small></template
        >
        <p v-else>
          ¿Desea {{ seleccionada?.estado ? 'inactivar' : 'activar' }} «{{ seleccionada?.nombre }}»?
          Se conservarán sus registros asociados.
        </p>
        <p v-if="errorFormulario" class="error" role="alert">{{ errorFormulario }}</p>
        <footer>
          <button type="button" :disabled="guardando" @click="dialogo?.close()">Cancelar</button
          ><button class="primary" :disabled="guardando">
            {{ guardando ? 'Guardando…' : 'Confirmar' }}
          </button>
        </footer>
      </form>
    </dialog>
  </section>
</template>

<style scoped>
.lineas-page {
  display: grid;
  gap: 28px;
}
h1,
h2,
p {
  margin: 0;
}
h1 {
  font: 700 28px/36px var(--siset-font-heading);
  color: #283a70;
}
.heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}
.heading p {
  font-size: 14px;
  color: #45464f;
  margin-top: 6px;
}
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
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
.primary {
  background: #283a70;
  color: white;
  border-color: #283a70;
  white-space: nowrap;
  padding: 14px 20px;
}
button:hover:not(:disabled) {
  filter: brightness(0.95);
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
  background: white;
  border: 1px solid #c5c6d1;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 2px #0001;
}
.stats .material-symbols-outlined {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #283a7012;
  color: #283a70;
}
.stats .green {
  color: #006b5c;
  background: #006b5c12;
}
.stats .red {
  color: #ba1a1a;
  background: #ffdad640;
}
.stats h2 {
  font-size: 11px;
  text-transform: uppercase;
  color: #45464f;
  font-weight: 700;
}
.stats strong {
  font: 600 26px/34px var(--siset-font-heading);
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
  padding: 20px 24px;
  background: #f3f3f9;
  border-bottom: 1px solid #c5c6d1;
}
.table-heading h2 {
  font-size: 17px;
  color: #283a70;
}
.table-heading > div {
  display: flex;
  gap: 8px;
}
.table-heading button {
  padding: 6px;
  border: 0;
  background: transparent;
}
.filters {
  display: flex;
  gap: 16px;
  padding: 18px 24px;
}
label {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: #45464f;
}
.filters label:first-child {
  flex: 1;
}
input,
select {
  padding: 10px 12px;
  border: 1px solid #c5c6d1;
  border-radius: 5px;
  background: #f9f9ff;
  color: #191c20;
  font-size: 13px;
  min-width: 0;
  width: 100%;
}
.table-scroll {
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
th {
  background: #e7e7ee;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 11px;
  padding: 16px 24px;
}
td {
  padding: 20px 24px;
  border-top: 1px solid #e2e2e8;
  font-size: 14px;
}
td strong {
  font-weight: 600;
}
td small {
  display: block;
  color: #757681;
  font-size: 11px;
  margin-top: 4px;
}
.actions {
  text-align: right;
}
.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.row-actions button {
  border: 0;
  background: transparent;
  padding: 8px;
}
.row-actions .material-symbols-outlined {
  font-size: 18px;
}
.danger {
  color: #ba1a1a;
}
.activate {
  color: #006b5c;
}
.badge {
  font-size: 10px;
  font-weight: 700;
  border: 1px solid #006b5c;
  color: #006b5c;
  background: #006b5c0c;
  padding: 5px 10px;
  border-radius: 20px;
}
.badge.inactive {
  border-color: #b5b5c0;
  color: #757681;
  background: #f3f3f9;
}
.empty {
  text-align: center;
  padding: 40px;
  color: #757681;
}
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 18px 24px;
  border-top: 1px solid #c5c6d1;
  font-size: 12px;
  color: #45464f;
}
.pagination > div {
  display: flex;
  gap: 8px;
}
.success {
  padding: 14px;
  color: #006b5c;
  background: #d8f8ec;
  border-radius: 6px;
}
.error {
  padding: 14px;
  background: #fff0ef;
  color: #ba1a1a;
  border-radius: 6px;
}
dialog {
  width: min(480px, calc(100vw - 32px));
  padding: 28px;
  border: 1px solid #c5c6d1;
  border-radius: 10px;
  box-shadow: 0 16px 60px #0003;
}
dialog::backdrop {
  background: #131b3b70;
}
dialog form {
  display: grid;
  gap: 20px;
}
dialog h2 {
  font-size: 20px;
  color: #283a70;
}
dialog p {
  font-size: 14px;
  line-height: 1.6;
}
dialog footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
dialog small {
  font-size: 11px;
  color: #757681;
}
button:focus-visible {
  outline: 2px solid #006b5c;
  outline-offset: 3px;
}
@media (max-width: 1000px) {
  .stats {
    gap: 12px;
  }
  .stats article {
    padding: 16px;
    gap: 10px;
  }
  .stats .material-symbols-outlined {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
  }
  td,
  th {
    padding: 16px;
  }
  h1 {
    font-size: 25px;
  }
}
@media (max-width: 600px) {
  .heading {
    align-items: stretch;
    flex-direction: column;
  }
  .stats {
    grid-template-columns: 1fr;
  }
  .filters,
  .pagination {
    flex-direction: column;
    align-items: stretch;
  }
  .row-actions {
    flex-direction: column;
  }
  table {
    min-width: 550px;
  }
  .lineas-page {
    gap: 20px;
  }
}
</style>
