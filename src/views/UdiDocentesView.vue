<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '@/services/api'

interface Opcion { nombre: string; [key: string]: string | number }
interface Docente {
  id_docente: number; id_usuario: number; id_escuela: number; id_area_investigacion: number
  dni: string; nombres: string; apellido_paterno: string; apellido_materno: string; celular: string; estado: 0 | 1
  usuario: { correo_electronico: string } | null; escuela: Opcion | null; area: Opcion | null
  grado: Opcion[]; lineas: Opcion[]
}
const docentes = ref<Docente[]>([])
const opciones = ref<{ escuelas: Opcion[]; areas: Opcion[]; grados: Opcion[]; lineas: Opcion[] }>({ escuelas: [], areas: [], grados: [], lineas: [] })
const cargando = ref(true), guardando = ref(false)
const error = ref(''), errorFormulario = ref(''), aviso = ref('')
const busqueda = ref(''), estado = ref('todos'), pagina = ref(1)
const dialogo = ref<HTMLDialogElement | null>(null)
const seleccionado = ref<Docente | null>(null), cambiarEstado = ref(false)
const formulario = reactive({ correo_electronico: '', password: '', password_confirmation: '', id_escuela: null as number | null, id_area_investigacion: null as number | null, id_grado_academico: null as number | null, id_lineas_investigacion: [] as number[], dni: '', nombres: '', apellido_paterno: '', apellido_materno: '', celular: '' })
const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const activos = computed(() => docentes.value.filter((d) => d.estado === 1).length)
const doctores = computed(() => docentes.value.filter((d) => d.grado.some((g) => normalizar(g.nombre).includes('doctor'))).length)
const filtrados = computed(() => docentes.value.filter((d) => (estado.value === 'todos' || String(d.estado) === estado.value) && normalizar(`${d.dni ?? ''} ${d.nombres} ${d.apellido_paterno} ${d.apellido_materno} ${d.usuario?.correo_electronico ?? ''} ${d.escuela?.nombre ?? ''} ${d.lineas.map((l) => l.nombre).join(' ')}`).includes(normalizar(busqueda.value.trim()))))
const paginas = computed(() => Math.max(1, Math.ceil(filtrados.value.length / 8)))
const visibles = computed(() => filtrados.value.slice((pagina.value - 1) * 8, pagina.value * 8))
watch([busqueda, estado], () => { pagina.value = 1 })
function mensaje(e: unknown) {
  if (axios.isAxiosError(e)) {
    if (e.response?.status === 422) return Object.values(e.response.data.errors ?? {}).flat().join(' ') || 'Revise los datos ingresados.'
    if (e.response?.status === 403) return 'No tiene permiso para gestionar docentes.'
  }
  return 'No se pudo completar la operación. Intente nuevamente.'
}
async function cargar() {
  cargando.value = true; error.value = ''
  try {
    const [lista, catalogos] = await Promise.all([api.get<Docente[]>('/docentes', { params: { estado: 'todos' } }), api.get<typeof opciones.value>('/docentes/opciones')])
    docentes.value = lista.data; opciones.value = catalogos.data
  } catch (e) { error.value = mensaje(e) } finally { cargando.value = false }
}
function abrir(docente: Docente | null = null, estado = false) {
  seleccionado.value = docente; cambiarEstado.value = estado; errorFormulario.value = ''; aviso.value = ''
  Object.assign(formulario, { correo_electronico: docente?.usuario?.correo_electronico ?? '', password: '', password_confirmation: '', id_escuela: docente?.id_escuela ?? null, id_area_investigacion: docente?.id_area_investigacion ?? null, id_grado_academico: Number(docente?.grado[0]?.id_grado_academico) || null, id_lineas_investigacion: docente?.lineas.map((l) => Number(l.id_linea_investigacion)) ?? [], dni: docente?.dni ?? '', nombres: docente?.nombres ?? '', apellido_paterno: docente?.apellido_paterno ?? '', apellido_materno: docente?.apellido_materno ?? '', celular: docente?.celular ?? '' })
  dialogo.value?.showModal()
}
async function guardar() {
  if (guardando.value) return
  guardando.value = true; errorFormulario.value = ''
  try {
    const docente = seleccionado.value
    const datos = { ...formulario, correo_electronico: formulario.correo_electronico.trim(), password: formulario.password || undefined, password_confirmation: formulario.password_confirmation || undefined, nombres: formulario.nombres.trim(), apellido_paterno: formulario.apellido_paterno.trim(), apellido_materno: formulario.apellido_materno.trim(), celular: formulario.celular.trim() }
    const { data } = docente ? await api.put<{ data: Docente }>(`/docentes/${docente.id_docente}`, { ...datos, ...(cambiarEstado.value ? { estado: docente.estado ? 0 : 1 } : {}) }) : await api.post<{ data: Docente }>('/docentes', datos)
    docentes.value = docente ? docentes.value.map((d) => d.id_docente === docente.id_docente ? data.data : d) : [...docentes.value, data.data]
    docentes.value.sort((a, b) => `${a.apellido_paterno} ${a.nombres}`.localeCompare(`${b.apellido_paterno} ${b.nombres}`, 'es'))
    aviso.value = cambiarEstado.value ? 'Estado del docente actualizado.' : 'Docente guardado correctamente.'
    dialogo.value?.close()
  } catch (e) { errorFormulario.value = mensaje(e) } finally { guardando.value = false }
}
onMounted(cargar)
</script>

<template>
  <section class="page">
    <header class="heading"><div><h1>Mantenimiento de Docentes</h1><p>Gestione la base de profesores y sus asignaciones de investigación.</p></div><button class="primary" :disabled="cargando || !!error" @click="abrir()"><span class="material-symbols-outlined">person_add</span>Nuevo docente</button></header>
    <p v-if="aviso" class="success" role="status">{{ aviso }}</p>
    <p v-if="cargando" role="status">Cargando docentes…</p>
    <div v-else-if="error" class="error" role="alert">{{ error }} <button @click="cargar">Reintentar</button></div>
    <template v-else>
      <div class="stats"><article><span class="material-symbols-outlined">groups</span><div><small>Total docentes</small><strong>{{ docentes.length }}</strong></div></article><article><span class="material-symbols-outlined green">check_circle</span><div><small>Activos</small><strong>{{ activos }}</strong></div></article><article><span class="material-symbols-outlined gold">school</span><div><small>Grado doctor</small><strong>{{ doctores }}</strong></div></article><article><span class="material-symbols-outlined red">block</span><div><small>Inactivos</small><strong>{{ docentes.length - activos }}</strong></div></article></div>
      <div class="listado"><div class="filters"><label>Buscar docente<input v-model="busqueda" type="search" placeholder="Nombre, correo, escuela o línea…"></label><label>Estado<select v-model="estado"><option value="todos">Todos</option><option value="1">Activo</option><option value="0">Inactivo</option></select></label><button aria-label="Actualizar docentes" title="Actualizar" @click="cargar"><span class="material-symbols-outlined">refresh</span></button></div>
        <div class="table-scroll"><table><thead><tr><th>Nombre y apellidos</th><th>DNI</th><th>Correo</th><th>Celular</th><th>Línea</th><th>Escuela</th><th>Grado</th><th>Estado</th><th>Acciones</th></tr></thead><tbody><tr v-for="d in visibles" :key="d.id_docente"><td><strong>{{ d.nombres }}</strong><small>{{ d.apellido_paterno }} {{ d.apellido_materno }}</small></td><td>{{ d.dni }}</td><td>{{ d.usuario?.correo_electronico ?? 'Sin correo' }}</td><td>{{ d.celular }}</td><td>{{ d.lineas.map((l) => l.nombre).join(', ') || 'Sin línea' }}</td><td>{{ d.escuela?.nombre ?? 'Sin escuela' }}</td><td>{{ d.grado.map((g) => g.abreviatura || g.nombre).join(', ') || 'Sin grado' }}</td><td><span class="badge" :class="{ inactive: !d.estado }">{{ d.estado ? 'ACTIVO' : 'INACTIVO' }}</span></td><td><div class="actions"><button title="Editar" @click="abrir(d)"><span class="material-symbols-outlined">edit</span></button><button :title="d.estado ? 'Inactivar' : 'Activar'" :class="{ danger: d.estado }" @click="abrir(d, true)"><span class="material-symbols-outlined">{{ d.estado ? 'person_off' : 'person_check' }}</span></button></div></td></tr><tr v-if="!visibles.length"><td colspan="9" class="empty">No hay docentes que coincidan con los filtros.</td></tr></tbody></table></div>
        <footer class="pagination"><span>{{ filtrados.length }} docentes · Página {{ pagina }} de {{ paginas }}</span><div><button :disabled="pagina === 1" @click="pagina--">Anterior</button><button :disabled="pagina >= paginas" @click="pagina++">Siguiente</button></div></footer>
      </div>
    </template>
    <dialog ref="dialogo" @cancel="guardando && $event.preventDefault()"><form @submit.prevent="guardar"><h2>{{ cambiarEstado ? `${seleccionado?.estado ? 'Inactivar' : 'Activar'} docente` : seleccionado ? 'Editar docente' : 'Nuevo docente' }}</h2><p v-if="cambiarEstado">¿Desea {{ seleccionado?.estado ? 'inactivar' : 'activar' }} a {{ seleccionado?.nombres }} {{ seleccionado?.apellido_paterno }}?</p><div v-else class="form-grid">
      <label class="wide">Correo institucional<input v-model.trim="formulario.correo_electronico" type="email" required maxlength="100" :disabled="guardando"></label><label>Contraseña<input v-model="formulario.password" type="password" autocomplete="new-password" :required="!seleccionado" minlength="8" :disabled="guardando"><small v-if="seleccionado">Déjela vacía para conservarla.</small></label><label>Confirmar contraseña<input v-model="formulario.password_confirmation" type="password" autocomplete="new-password" :required="!seleccionado || !!formulario.password" minlength="8" :disabled="guardando"></label>
      <label class="wide">Nombres<input v-model.trim="formulario.nombres" required maxlength="50" :disabled="guardando"></label><label>Apellido paterno<input v-model.trim="formulario.apellido_paterno" required maxlength="20" :disabled="guardando"></label><label>Apellido materno<input v-model.trim="formulario.apellido_materno" required maxlength="20" :disabled="guardando"></label><label>DNI<input v-model.trim="formulario.dni" inputmode="numeric" required pattern="[0-9]{8}" minlength="8" maxlength="8" :disabled="guardando"></label><label>Celular<input v-model.trim="formulario.celular" type="tel" required maxlength="15" :disabled="guardando"></label>
      <label>Escuela<select v-model.number="formulario.id_escuela" required :disabled="guardando"><option :value="null">Seleccione</option><option v-for="e in opciones.escuelas" :key="e.id_escuela" :value="e.id_escuela">{{ e.nombre }}</option></select></label><label>Área de investigación<select v-model.number="formulario.id_area_investigacion" required :disabled="guardando"><option :value="null">Seleccione</option><option v-for="a in opciones.areas" :key="a.id_area_investigacion" :value="a.id_area_investigacion">{{ a.nombre }}</option></select></label><label>Grado académico<select v-model.number="formulario.id_grado_academico" required :disabled="guardando"><option :value="null">Seleccione</option><option v-for="g in opciones.grados" :key="g.id_grado_academico" :value="g.id_grado_academico">{{ g.nombre }}</option></select></label><label class="wide">Líneas de investigación<select v-model="formulario.id_lineas_investigacion" multiple required :disabled="guardando"><option v-for="l in opciones.lineas" :key="l.id_linea_investigacion" :value="l.id_linea_investigacion">{{ l.nombre }}</option></select><small>Puede seleccionar más de una con Ctrl o Cmd.</small></label>
      </div><p v-if="errorFormulario" class="error" role="alert">{{ errorFormulario }}</p><footer><button type="button" :disabled="guardando" @click="dialogo?.close()">Cancelar</button><button class="primary" :disabled="guardando">{{ guardando ? 'Guardando…' : 'Guardar' }}</button></footer></form></dialog>
  </section>
</template>

<style scoped>
.page{display:grid;gap:28px}h1,h2,p{margin:0}h1{font:700 28px/36px var(--siset-font-heading);color:#283a70}.heading{display:flex;align-items:center;justify-content:space-between;gap:20px}.heading p{color:#45464f;font-size:14px;margin-top:5px}button{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;border:1px solid #c5c6d1;background:#fff;color:#283a70;border-radius:6px;font-size:12px}button:disabled{opacity:.5}.primary{background:#283a70;color:#fff;border-color:#283a70;padding:12px 20px}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.stats article{display:flex;align-items:center;gap:14px;padding:22px;background:#fff;border:1px solid #e2e2e8;border-radius:8px}.stats .material-symbols-outlined{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:#dce1ff;color:#283a70}.stats .green{background:#d8f8ec;color:#006b5c}.stats .red{background:#ffdad6;color:#ba1a1a}.stats .gold{background:#ffdf9b;color:#4e3a00}.stats small{display:block;font-size:10px;text-transform:uppercase;color:#45464f}.stats strong{display:block;font-size:26px;color:#283a70}.listado{background:#fff;border:1px solid #c5c6d1;border-radius:8px;overflow:hidden}.filters{display:flex;align-items:end;gap:14px;padding:22px;background:#f9f9ff}.filters label:first-child{flex:1}label{display:grid;gap:6px;font-size:12px;color:#45464f}input,select{width:100%;min-width:0;border:1px solid #c5c6d1;border-radius:5px;background:#fff;padding:10px 12px;font-size:13px}.table-scroll{overflow:auto}table{width:100%;border-collapse:collapse;text-align:left;font-size:12px}th{padding:16px;background:#e7e7ee;text-transform:uppercase;font-size:10px}td{padding:18px 16px;border-top:1px solid #e2e2e8}td small{display:block;color:#757681;font-size:10px;margin-top:4px}.actions{display:flex}.actions button{border:0;padding:6px}.danger{color:#ba1a1a}.badge{border-radius:14px;padding:4px 8px;background:#e5f4ef;color:#006b5c;font-size:9px;font-weight:700}.badge.inactive{background:#f0f0f5;color:#757681}.empty{text-align:center;padding:35px;color:#757681}.pagination{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-top:1px solid #c5c6d1;font-size:12px}.pagination div{display:flex;gap:8px}.success,.error{padding:14px;border-radius:6px;font-size:13px}.success{background:#d8f8ec;color:#006b5c}.error{background:#fff0ef;color:#ba1a1a}dialog{width:min(680px,calc(100vw - 32px));padding:28px;border:1px solid #c5c6d1;border-radius:10px;max-height:90dvh;overflow:auto}dialog::backdrop{background:#131b3b70}dialog form{display:grid;gap:20px}dialog h2{color:#283a70}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.wide{grid-column:1/-1}.wide select[multiple]{min-height:110px}dialog small{font-size:11px;color:#757681}dialog footer{display:flex;justify-content:end;gap:10px}@media(max-width:1100px){.stats{grid-template-columns:repeat(2,1fr)}}@media(max-width:650px){.heading,.filters{flex-direction:column;align-items:stretch}.form-grid{grid-template-columns:1fr}.stats{grid-template-columns:1fr 1fr}}
</style>
