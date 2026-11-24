<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import api from '@/services/api'

interface Requisito {
  id_requisito_documentario: number
  codigo: string
  nombre: string
  descripcion: string | null
  orden: number
  estado: 0 | 1
}
const requisitos = ref<Requisito[]>([])
const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const aviso = ref('')
const busqueda = ref('')
const estado = ref('todos')
const pagina = ref(1)
const dialogo = ref<HTMLDialogElement | null>(null)
const seleccionado = ref<Requisito | null>(null)
const cambiarEstado = ref(false)
const errorFormulario = ref('')
const formulario = ref({ codigo: '', nombre: '', descripcion: '', orden: 1, estado: 1 })
const normalizar = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
const activos = computed(() => requisitos.value.filter((r) => r.estado === 1).length)
const filtrados = computed(() =>
  requisitos.value.filter(
    (r) =>
      (estado.value === 'todos' || String(r.estado) === estado.value) &&
      normalizar(r.codigo + ' ' + r.nombre + ' ' + (r.descripcion ?? '')).includes(
        normalizar(busqueda.value.trim()),
      ),
  ),
)
const paginas = computed(() => Math.max(1, Math.ceil(filtrados.value.length / 8)))
const visibles = computed(() => filtrados.value.slice((pagina.value - 1) * 8, pagina.value * 8))
watch([busqueda, estado], () => {
  pagina.value = 1
})
function mensaje(e: unknown) {
  if (axios.isAxiosError(e)) {
    const errores = e.response?.data?.errors as Record<string, string[]> | undefined
    return (
      (errores ? Object.values(errores)[0]?.[0] : null) ??
      e.response?.data?.message ??
      'No se pudo completar la operación.'
    )
  }
  return 'No se pudo completar la operación. Intente nuevamente.'
}
async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<{ data: Requisito[] }>('/requisitos-documentarios')
    requisitos.value = data.data
    pagina.value = Math.min(pagina.value, paginas.value)
  } catch (e) {
    error.value = mensaje(e)
  } finally {
    cargando.value = false
  }
}
function abrir(r: Requisito | null = null, estado = false) {
  seleccionado.value = r
  cambiarEstado.value = estado
  formulario.value = {
    codigo: r?.codigo ?? '',
    nombre: r?.nombre ?? '',
    descripcion: r?.descripcion ?? '',
    orden: r?.orden ?? Math.min(9999, Math.max(0, ...requisitos.value.map((r) => r.orden)) + 1),
    estado: r?.estado ?? 1,
  }
  errorFormulario.value = ''
  aviso.value = ''
  dialogo.value?.showModal()
}
async function guardar() {
  if (guardando.value) return
  guardando.value = true
  errorFormulario.value = ''
  try {
    const payload = {
      ...formulario.value,
      codigo: formulario.value.codigo.trim().toUpperCase(),
      nombre: formulario.value.nombre.trim(),
      descripcion: formulario.value.descripcion.trim() || null,
      estado: cambiarEstado.value
        ? seleccionado.value?.estado === 1
          ? 0
          : 1
        : formulario.value.estado,
    }
    const { data } = seleccionado.value
      ? await api.put<{ data: Requisito }>(
          '/requisitos-documentarios/' + seleccionado.value.id_requisito_documentario,
          payload,
        )
      : await api.post<{ data: Requisito }>('/requisitos-documentarios', payload)
    requisitos.value = [
      ...requisitos.value.filter(
        (r) => r.id_requisito_documentario !== data.data.id_requisito_documentario,
      ),
      data.data,
    ].sort((a, b) => a.orden - b.orden || a.codigo.localeCompare(b.codigo))
    pagina.value = Math.min(pagina.value, paginas.value)
    aviso.value = 'Catálogo actualizado. El cambio se aplicará a las nuevas revisiones.'
    dialogo.value?.close()
  } catch (e) {
    errorFormulario.value = mensaje(e)
  } finally {
    guardando.value = false
  }
}
onMounted(cargar)
</script>

<template>
  <section class="requisitos-page" :aria-busy="cargando">
    <header class="heading">
      <div>
        <h1>Gestión de Requisitos</h1>
        <p>
          Administre la lista que UDI evalúa durante la revisión documentaria de los expedientes.
        </p>
      </div>
      <button class="primary" :disabled="cargando || !!error" @click="abrir()">
        <span class="material-symbols-outlined" aria-hidden="true">add_circle</span>Nuevo requisito
      </button>
    </header>
    <p v-if="aviso" class="success" role="status">{{ aviso }}</p>
    <p v-if="cargando" role="status">Cargando requisitos…</p>
    <div v-else-if="error" class="error" role="alert">
      {{ error }} <button @click="cargar">Reintentar</button>
    </div>
    <template v-else>
      <div class="stats">
        <article>
          <span class="material-symbols-outlined" aria-hidden="true">fact_check</span>
          <div>
            <h2>Total de requisitos</h2>
            <strong>{{ requisitos.length }}</strong>
          </div>
        </article>
        <article>
          <span class="material-symbols-outlined green" aria-hidden="true">check_circle</span>
          <div>
            <h2>Requisitos activos</h2>
            <strong>{{ activos }}</strong>
          </div>
        </article>
        <article>
          <span class="material-symbols-outlined red" aria-hidden="true">pause_circle</span>
          <div>
            <h2>Requisitos inactivos</h2>
            <strong>{{ requisitos.length - activos }}</strong>
          </div>
        </article>
      </div>
      <aside class="scope-note">
        <span class="material-symbols-outlined" aria-hidden="true">info</span>
        <p>
          Los requisitos activos se incorporan al iniciar una nueva revisión UDI. Las revisiones
          iniciadas conservan su lista y sus evaluaciones. Este catálogo no modifica los campos del
          formulario del tesista.
        </p>
      </aside>
      <section class="listado" aria-label="Catálogo de requisitos documentarios">
        <header class="table-heading">
          <h2>Revisión documentaria UDI</h2>
          <button
            :disabled="guardando"
            aria-label="Actualizar catálogo de requisitos"
            title="Actualizar"
            @click="cargar"
          >
            <span class="material-symbols-outlined" aria-hidden="true">refresh</span>
          </button>
        </header>
        <div class="filters">
          <label
            >Buscar requisito<input
              v-model="busqueda"
              type="search"
              placeholder="Código, nombre o descripción…" /></label
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
                <th>Orden</th>
                <th>Requisito</th>
                <th>Estado</th>
                <th class="actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in visibles" :key="r.id_requisito_documentario">
                <td>
                  <span class="order">{{ r.orden }}</span>
                </td>
                <td class="requirement">
                  <strong>{{ r.nombre }}</strong
                  ><small>{{ r.codigo }}</small>
                  <p v-if="r.descripcion" class="description">{{ r.descripcion }}</p>
                </td>
                <td>
                  <span class="badge" :class="{ inactive: !r.estado }">{{
                    r.estado ? 'ACTIVO' : 'INACTIVO'
                  }}</span>
                </td>
                <td>
                  <div class="row-actions">
                    <button :aria-label="'Editar ' + r.nombre" @click="abrir(r)">
                      <span class="material-symbols-outlined" aria-hidden="true">edit</span
                      >Editar</button
                    ><button
                      :class="r.estado ? 'danger' : 'activate'"
                      :aria-label="(r.estado ? 'Inactivar ' : 'Activar ') + r.nombre"
                      @click="abrir(r, true)"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">{{
                        r.estado ? 'block' : 'check_circle'
                      }}</span
                      >{{ r.estado ? 'Inactivar' : 'Activar' }}
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!visibles.length">
                <td colspan="4" class="empty">
                  {{
                    requisitos.length
                      ? 'No hay requisitos que coincidan con los filtros.'
                      : 'Aún no hay requisitos registrados. Agregue los documentos que UDI debe evaluar.'
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer class="pagination">
          <span>{{ filtrados.length }} requisitos · Página {{ pagina }} de {{ paginas }}</span>
          <div>
            <button :disabled="pagina === 1" @click="pagina--">Anterior</button
            ><button :disabled="pagina >= paginas" @click="pagina++">Siguiente</button>
          </div>
        </footer>
      </section>
    </template>
    <dialog
      ref="dialogo"
      aria-labelledby="requisito-title"
      @cancel="guardando && $event.preventDefault()"
    >
      <form @submit.prevent="guardar">
        <h2 id="requisito-title">
          {{
            cambiarEstado
              ? seleccionado?.estado
                ? 'Inactivar requisito'
                : 'Activar requisito'
              : seleccionado
                ? 'Editar requisito'
                : 'Nuevo requisito'
          }}
        </h2>
        <p v-if="cambiarEstado">
          ¿Desea {{ seleccionado?.estado ? 'inactivar' : 'activar' }} «{{ seleccionado?.nombre }}»?
          El cambio se aplicará a nuevas revisiones; las evaluaciones existentes se conservarán.
        </p>
        <div v-else class="requirement-form">
          <label
            >Código<input
              v-model.trim="formulario.codigo"
              required
              maxlength="50"
              :disabled="guardando"
              placeholder="Ej.: REQ_SOLICITUD"
            /><small
              >Letras, números, guiones o guiones bajos. Se guardará en mayúsculas.</small
            ></label
          >
          <label
            >Orden de presentación<input
              v-model.number="formulario.orden"
              type="number"
              min="1"
              max="9999"
              required
              :disabled="guardando"
          /></label>
          <label class="wide"
            >Nombre del requisito<input
              v-model="formulario.nombre"
              required
              maxlength="150"
              :disabled="guardando"
              placeholder="Ej.: Solicitud de inscripción del proyecto"
          /></label>
          <label class="wide"
            >Descripción o criterio de revisión<textarea
              v-model="formulario.descripcion"
              maxlength="2000"
              rows="3"
              :disabled="guardando"
              placeholder="Indique qué debe comprobar UDI al evaluar este requisito."
            ></textarea>
          </label>
          <label
            >Estado<select v-model.number="formulario.estado" :disabled="guardando">
              <option :value="1">Activo</option>
              <option :value="0">Inactivo</option>
            </select></label
          >
        </div>
        <p v-if="errorFormulario" class="error" role="alert">{{ errorFormulario }}</p>
        <footer>
          <button type="button" :disabled="guardando" @click="dialogo?.close()">Cancelar</button
          ><button class="primary" :disabled="guardando">
            {{
              guardando ? 'Guardando…' : cambiarEstado ? 'Confirmar cambio' : 'Guardar requisito'
            }}
          </button>
        </footer>
      </form>
    </dialog>
  </section>
</template>

<style scoped>
.requisitos-page {
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
  .requisitos-page {
    gap: 20px;
  }
}

.scope-note {
  display: flex;
  align-items: start;
  gap: 12px;
  padding: 16px 20px;
  border: 1px solid #d6d9e9;
  border-radius: 8px;
  background: #ededf8;
  color: #44558d;
}
.scope-note p {
  font-size: 12px;
  line-height: 20px;
}
.requirement {
  min-width: 240px;
  max-width: 600px;
}
.description {
  font-size: 12px;
  line-height: 20px;
  color: #606575;
  margin-top: 8px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.order {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  background: #f0f1f9;
  border-radius: 6px;
  color: #44558d;
  font-weight: 600;
}
.requirement-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
.requirement-form label {
  display: grid;
  gap: 7px;
}
.requirement-form .wide {
  grid-column: 1/-1;
}
.requirement-form input,
.requirement-form select,
.requirement-form textarea {
  width: 100%;
  min-width: 0;
}
.requirement-form textarea {
  padding: 10px 12px;
  border: 1px solid #c5c6d1;
  border-radius: 5px;
  font-size: 13px;
  resize: vertical;
  background: #fff;
}
.requirement-form small {
  font-size: 11px;
  line-height: 17px;
  font-weight: 400;
  color: #757681;
}
@media (max-width: 650px) {
  .requirement-form {
    grid-template-columns: 1fr;
  }
}
</style>
