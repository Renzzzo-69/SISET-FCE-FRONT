<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import axios from 'axios'
import api from '@/services/api'
interface Escuela {
  id_escuela: number
  nombre: string
}
interface Cuenta {
  id_usuario: number
  correo_electronico: string
}
interface Alumno {
  id_alumno: number
  id_usuario: number
  id_escuela: number
  nombres: string
  apellido_paterno: string
  apellido_materno: string
  dni: string | null
  celular: string
  estado: 0 | 1
  usuario: Cuenta | null
  escuela: Escuela | null
}
const alumnos = ref<Alumno[]>([])
const opciones = ref<{ escuelas: Escuela[] }>({ escuelas: [] })
const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const aviso = ref('')
const busqueda = ref('')
const estado = ref('todos')
const escuela = ref('todas')
const pagina = ref(1)
const dialogo = ref<HTMLDialogElement | null>(null)
const seleccionado = ref<Alumno | null>(null)
const cambiarEstado = ref(false)
const errorFormulario = ref('')
const formulario = reactive({
  correo_electronico: '',
  password: '',
  password_confirmation: '',
  id_escuela: null as number | null,
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  dni: '',
  celular: '',
})
const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
const activos = computed(() => alumnos.value.filter((a) => a.estado === 1).length)
const escuelas = computed(() => {
  const mapa = new Map(opciones.value.escuelas.map((e) => [e.id_escuela, e]))
  alumnos.value.forEach((a) => {
    if (a.escuela) mapa.set(a.escuela.id_escuela, a.escuela)
  })
  return [...mapa.values()]
})
const filtrados = computed(() =>
  alumnos.value.filter(
    (a) =>
      (estado.value === 'todos' || String(a.estado) === estado.value) &&
      (escuela.value === 'todas' || String(a.id_escuela) === escuela.value) &&
      normalizar(
        `${a.nombres} ${a.apellido_paterno} ${a.apellido_materno} ${a.usuario?.correo_electronico ?? ''} ${a.celular} ${a.dni ?? ''} ${a.id_alumno}`,
      ).includes(normalizar(busqueda.value.trim())),
  ),
)
const paginas = computed(() => Math.max(1, Math.ceil(filtrados.value.length / 8)))
const visibles = computed(() => filtrados.value.slice((pagina.value - 1) * 8, pagina.value * 8))
watch([busqueda, estado, escuela], () => {
  pagina.value = 1
})
function mensaje(e: unknown) {
  if (axios.isAxiosError(e)) {
    if (e.response?.status === 422)
      return (
        Object.values(e.response.data.errors ?? {})
          .flat()
          .join(' ') || 'Revise los datos ingresados.'
      )
    if (e.response?.status === 403) return 'No tiene permiso para gestionar alumnos.'
  }
  return 'No se pudo completar la operación. Intente nuevamente.'
}
async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const [lista, catalogos] = await Promise.all([
      api.get<Alumno[]>('/alumnos', { params: { estado: 'todos' } }),
      api.get<typeof opciones.value>('/alumnos/opciones'),
    ])
    alumnos.value = lista.data
    opciones.value = catalogos.data
  } catch (e) {
    error.value = mensaje(e)
  } finally {
    cargando.value = false
  }
}
function abrir(alumno: Alumno | null = null, estado = false) {
  seleccionado.value = alumno
  cambiarEstado.value = estado
  errorFormulario.value = ''
  aviso.value = ''
  Object.assign(formulario, {
    correo_electronico: alumno?.usuario?.correo_electronico ?? '',
    password: '',
    password_confirmation: '',
    id_escuela: alumno?.id_escuela ?? null,
    nombres: alumno?.nombres ?? '',
    apellido_paterno: alumno?.apellido_paterno ?? '',
    apellido_materno: alumno?.apellido_materno ?? '',
    dni: alumno?.dni ?? '',
    celular: alumno?.celular ?? '',
  })
  dialogo.value?.showModal()
}
async function guardar() {
  if (guardando.value) return
  guardando.value = true
  errorFormulario.value = ''
  try {
    const alumno = seleccionado.value
    const datos = {
      correo_electronico: formulario.correo_electronico.trim(),
      password: formulario.password || undefined,
      password_confirmation: formulario.password_confirmation || undefined,
      id_escuela: formulario.id_escuela,
      nombres: formulario.nombres.trim(),
      apellido_paterno: formulario.apellido_paterno.trim(),
      apellido_materno: formulario.apellido_materno.trim(),
      ...(cambiarEstado.value ? {} : { dni: formulario.dni.trim() }),
      celular: formulario.celular.trim(),
    }
    const { data } = alumno
      ? await api.put<{ data: Alumno }>(`/alumnos/${alumno.id_alumno}`, {
          ...datos,
          ...(cambiarEstado.value ? { estado: alumno.estado ? 0 : 1 } : {}),
        })
      : await api.post<{ data: Alumno }>('/alumnos', {
          ...datos,
        })
    if (alumno)
      alumnos.value = alumnos.value.map((a) => (a.id_alumno === alumno.id_alumno ? data.data : a))
    else {
      alumnos.value.push(data.data)
    }
    alumnos.value.sort((a, b) =>
      `${a.apellido_paterno} ${a.apellido_materno} ${a.nombres}`.localeCompare(
        `${b.apellido_paterno} ${b.apellido_materno} ${b.nombres}`,
        'es',
      ),
    )
    pagina.value = Math.min(pagina.value, paginas.value)
    aviso.value = cambiarEstado.value
      ? 'Estado del alumno actualizado.'
      : 'Alumno guardado correctamente.'
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
  <section class="alumnos-page">
    <header class="heading">
      <div>
        <h1>Mantenimiento de Alumnos</h1>
        <p>Gestión centralizada del padrón de estudiantes de la Facultad de Ciencias Económicas.</p>
      </div>
      <button class="primary" :disabled="cargando || !!error" @click="abrir()">
        <span class="material-symbols-outlined" aria-hidden="true">person_add</span>Nuevo alumno
      </button>
    </header>
    <p v-if="aviso" role="status" class="success">{{ aviso }}</p>
    <p v-if="cargando" role="status">Cargando alumnos…</p>
    <div v-else-if="error" class="error" role="alert">
      {{ error }} <button @click="cargar">Reintentar</button>
    </div>
    <template v-else>
      <div class="stats">
        <article>
          <span class="material-symbols-outlined">group</span>
          <div>
            <small>Total alumnos</small><strong>{{ alumnos.length }}</strong>
          </div>
        </article>
        <article>
          <span class="material-symbols-outlined green">check_circle</span>
          <div>
            <small>Activos</small><strong>{{ activos }}</strong>
          </div>
        </article>
        <article>
          <span class="material-symbols-outlined red">pause_circle</span>
          <div>
            <small>Inactivos</small><strong>{{ alumnos.length - activos }}</strong>
          </div>
        </article>
        <article>
          <span class="material-symbols-outlined gold">school</span>
          <div>
            <small>Escuelas</small><strong>{{ escuelas.length }}</strong>
          </div>
        </article>
      </div>
      <div class="listado">
        <div class="filters">
          <label
            >Buscar alumno<input
              v-model="busqueda"
              type="search"
              placeholder="Nombre, apellidos, DNI, correo o ID…" /></label
          ><label
            >Escuela<select v-model="escuela">
              <option value="todas">Todas las escuelas</option>
              <option v-for="e in escuelas" :key="e.id_escuela" :value="String(e.id_escuela)">
                {{ e.nombre }}
              </option>
            </select></label
          ><label
            >Estado<select v-model="estado">
              <option value="todos">Todos</option>
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select></label
          ><button title="Actualizar" aria-label="Actualizar alumnos" @click="cargar">
            <span class="material-symbols-outlined">refresh</span>
          </button>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nombres</th>
                <th>Apellidos</th>
                <th>DNI</th>
                <th>Correo</th>
                <th>Celular</th>
                <th>Escuela</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in visibles" :key="a.id_alumno">
                <td>
                  <strong>{{ a.nombres }}</strong
                  ><small>ID: {{ a.id_alumno }}</small>
                </td>
                <td>{{ a.apellido_paterno }} {{ a.apellido_materno }}</td>
                <td>{{ a.dni ?? 'Pendiente' }}</td>
                <td>{{ a.usuario?.correo_electronico ?? 'Sin correo' }}</td>
                <td>{{ a.celular }}</td>
                <td>{{ a.escuela?.nombre ?? 'Sin escuela' }}</td>
                <td>
                  <span class="badge" :class="{ inactive: !a.estado }">{{
                    a.estado ? 'ACTIVO' : 'INACTIVO'
                  }}</span>
                </td>
                <td>
                  <div class="row-actions">
                    <button :aria-label="`Editar a ${a.nombres}`" title="Editar" @click="abrir(a)">
                      <span class="material-symbols-outlined">edit</span></button
                    ><button
                      :aria-label="`${a.estado ? 'Inactivar' : 'Activar'} a ${a.nombres}`"
                      :title="a.estado ? 'Inactivar' : 'Activar'"
                      :class="{ danger: a.estado }"
                      @click="abrir(a, true)"
                    >
                      <span class="material-symbols-outlined">{{
                        a.estado ? 'person_off' : 'person_check'
                      }}</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!visibles.length">
                <td colspan="8" class="empty">No hay alumnos que coincidan con los filtros.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer class="pagination">
          <span>{{ filtrados.length }} alumnos · Página {{ pagina }} de {{ paginas }}</span>
          <div>
            <button :disabled="pagina === 1" @click="pagina--">Anterior</button
            ><button :disabled="pagina >= paginas" @click="pagina++">Siguiente</button>
          </div>
        </footer>
      </div>
    </template>
    <dialog
      ref="dialogo"
      aria-labelledby="alumno-title"
      @cancel="guardando && $event.preventDefault()"
    >
      <form @submit.prevent="guardar">
        <h2 id="alumno-title">
          {{
            cambiarEstado
              ? seleccionado?.estado
                ? 'Inactivar alumno'
                : 'Activar alumno'
              : seleccionado
                ? 'Editar alumno'
                : 'Nuevo alumno'
          }}
        </h2>
        <p v-if="cambiarEstado">
          ¿Desea {{ seleccionado?.estado ? 'inactivar' : 'activar' }} a {{ seleccionado?.nombres }}
          {{ seleccionado?.apellido_paterno }}? Sus expedientes se conservarán.
        </p>
        <div v-else class="form-grid">
          <label class="wide"
            >Correo institucional<input
              v-model.trim="formulario.correo_electronico"
              type="email"
              autocomplete="email"
              required
              maxlength="100"
              :disabled="guardando"
          /></label>
          <label
            >Contraseña<input
              v-model="formulario.password"
              type="password"
              :autocomplete="seleccionado ? 'new-password' : 'new-password'"
              :required="!seleccionado"
              minlength="8"
              :disabled="guardando"
            /><small v-if="seleccionado"
              >Déjela vacía para conservar la contraseña actual.</small
            ></label
          >
          <label
            >Confirmar contraseña<input
              v-model="formulario.password_confirmation"
              type="password"
              autocomplete="new-password"
              :required="!seleccionado || !!formulario.password"
              minlength="8"
              :disabled="guardando"
          /></label>
          <label class="wide"
            >Nombres<input
              v-model.trim="formulario.nombres"
              required
              maxlength="50"
              :disabled="guardando"
          /></label>
          <label
            >Apellido paterno<input
              v-model.trim="formulario.apellido_paterno"
              required
              maxlength="20"
              :disabled="guardando" /></label
          ><label
            >Apellido materno<input
              v-model.trim="formulario.apellido_materno"
              required
              maxlength="20"
              :disabled="guardando"
          /></label>
          <label
            >DNI<input
              v-model.trim="formulario.dni"
              type="text"
              inputmode="numeric"
              required
              pattern="[0-9]{8}"
              minlength="8"
              maxlength="8"
              title="Ingrese los 8 dígitos del DNI"
              :disabled="guardando"
            /><small>8 dígitos</small>
          </label>
          <label
            >Celular<input
              v-model.trim="formulario.celular"
              type="tel"
              required
              maxlength="15"
              :disabled="guardando" /></label
          ><label
            >Escuela<select v-model.number="formulario.id_escuela" required :disabled="guardando">
              <option :value="null">Seleccione una escuela</option>
              <option
                v-if="
                  seleccionado?.escuela &&
                  !opciones.escuelas.some((e) => e.id_escuela === seleccionado?.id_escuela)
                "
                :value="seleccionado.id_escuela"
              >
                {{ seleccionado.escuela.nombre }} (inactiva)
              </option>
              <option v-for="e in opciones.escuelas" :key="e.id_escuela" :value="e.id_escuela">
                {{ e.nombre }}
              </option>
            </select></label
          >
        </div>
        <p v-if="errorFormulario" class="error" role="alert">{{ errorFormulario }}</p>
        <footer>
          <button type="button" :disabled="guardando" @click="dialogo?.close()">Cancelar</button
          ><button class="primary" :disabled="guardando">
            {{ guardando ? 'Guardando…' : 'Guardar' }}
          </button>
        </footer>
      </form>
    </dialog>
  </section>
</template>

<style scoped>
.alumnos-page {
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
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.heading p {
  color: #45464f;
  font-size: 14px;
  margin-top: 5px;
}
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid #c5c6d1;
  background: white;
  color: #283a70;
  border-radius: 6px;
  font-size: 12px;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.primary {
  background: #283a70;
  color: white;
  white-space: nowrap;
  border-color: #283a70;
  padding: 12px 20px;
}
.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.stats article {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px;
  background: white;
  border: 1px solid #e2e2e8;
  border-radius: 8px;
  box-shadow: 0 1px 2px #0001;
}
.stats .material-symbols-outlined {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #dce1ff;
  color: #283a70;
  flex-shrink: 0;
}
.stats .green {
  background: #d8f8ec;
  color: #006b5c;
}
.stats .red {
  background: #ffdad6;
  color: #ba1a1a;
}
.stats .gold {
  background: #ffdf9b;
  color: #4e3a00;
}
.stats small {
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  color: #45464f;
}
.stats strong {
  display: block;
  font-size: 26px;
  color: #283a70;
}
.listado {
  background: white;
  border: 1px solid #c5c6d1;
  border-radius: 8px;
  overflow: hidden;
}
.filters {
  display: flex;
  align-items: end;
  gap: 14px;
  padding: 22px;
  background: #f9f9ff;
}
.filters label:first-child {
  flex: 1;
}
label {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: #45464f;
}
input,
select {
  width: 100%;
  min-width: 0;
  border: 1px solid #c5c6d1;
  border-radius: 5px;
  background: #fff;
  padding: 10px 12px;
  font-size: 13px;
  color: #191c20;
}
.table-scroll {
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 12px;
}
th {
  padding: 16px;
  background: #e7e7ee;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.04em;
}
td {
  padding: 18px 16px;
  border-top: 1px solid #e2e2e8;
}
td small {
  display: block;
  color: #757681;
  font-size: 10px;
  margin-top: 4px;
}
.row-actions {
  display: flex;
  gap: 3px;
}
.row-actions button {
  border: 0;
  padding: 6px;
}
.row-actions .material-symbols-outlined {
  font-size: 20px;
}
.danger {
  color: #ba1a1a;
}
.badge {
  display: inline-block;
  border-radius: 14px;
  padding: 4px 8px;
  background: #e5f4ef;
  color: #006b5c;
  font-size: 9px;
  font-weight: 700;
}
.badge.inactive {
  background: #f0f0f5;
  color: #757681;
}
.empty {
  text-align: center;
  padding: 35px;
  color: #757681;
}
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px;
  border-top: 1px solid #c5c6d1;
  gap: 12px;
  font-size: 12px;
}
.pagination > div {
  display: flex;
  gap: 8px;
}
.success,
.error {
  padding: 14px;
  border-radius: 6px;
  font-size: 13px;
}
.success {
  background: #d8f8ec;
  color: #006b5c;
}
.error {
  background: #fff0ef;
  color: #ba1a1a;
}
dialog {
  width: min(600px, calc(100vw - 32px));
  padding: 28px;
  border: 1px solid #c5c6d1;
  border-radius: 10px;
  max-height: 90dvh;
  overflow: auto;
}
dialog::backdrop {
  background: #131b3b70;
}
dialog form {
  display: grid;
  gap: 20px;
}
dialog h2 {
  font-size: 22px;
  color: #283a70;
}
dialog p {
  font-size: 14px;
  line-height: 1.6;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.wide {
  grid-column: 1/-1;
}
dialog small {
  font-size: 11px;
  font-weight: 400;
  color: #757681;
}
dialog footer {
  display: flex;
  justify-content: end;
  gap: 10px;
}
button:focus-visible {
  outline: 2px solid #006b5c;
  outline-offset: 3px;
}
@media (max-width: 1150px) {
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .filters {
    flex-wrap: wrap;
  }
  .filters label:first-child {
    min-width: 200px;
  }
}
@media (max-width: 600px) {
  .heading {
    flex-direction: column;
    align-items: stretch;
  }
  h1 {
    font-size: 24px;
  }
  .stats article {
    padding: 14px;
    gap: 8px;
  }
  .stats .material-symbols-outlined {
    width: 32px;
    height: 32px;
  }
  .filters {
    flex-direction: column;
    align-items: stretch;
  }
  .pagination {
    flex-wrap: wrap;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  dialog {
    padding: 20px;
  }
}
</style>
