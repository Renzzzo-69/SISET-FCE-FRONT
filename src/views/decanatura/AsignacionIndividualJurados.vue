<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import api from '@/services/api'

type Expediente = { id: number; codigo: string; tesista: string; estado: string; estado_codigo: string }
type Contexto = Expediente & { titulo: string; escuela: string; asesor: string; coasesor: string | null }
type Docente = {
  id: number
  iniciales: string
  nombre: string
  id_escuela: number
  escuela: string
  id_area: number
  area: string
  carga: number
  estado_carga: 'Asesor' | 'Disponible' | 'Moderado' | 'Sobrecargado'
  no_seleccionable: boolean
}
type Catalogo = { id: number; nombre: string }
type Respuesta = {
  expedientes: Expediente[]
  contexto: Contexto | null
  docentes: Docente[]
  filtros: { escuelas: Catalogo[]; areas: Catalogo[] }
}

const router = useRouter()
const route = useRoute()
const roles = ['Presidente', 'Secretario', 'Vocal']
const maxJurados = 3
const cargando = ref(true)
const error = ref('')
const aviso = ref('')
const expedientes = ref<Expediente[]>([])
const expedienteSeleccionado = ref<number | null>(null)
const contexto = ref<Contexto | null>(null)
const docentes = ref<Docente[]>([])
const escuelas = ref<Catalogo[]>([])
const areas = ref<Catalogo[]>([])
const busqueda = ref('')
const escuelaSeleccionada = ref<number | ''>('')
const areaSeleccionada = ref<number | ''>('')
const seleccionados = ref<Record<number, string>>({})

const docentesFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase('es')

  return docentes.value.filter((docente) => {
    const coincideNombre = !termino || docente.nombre.toLocaleLowerCase('es').includes(termino)
    const coincideEscuela = escuelaSeleccionada.value === '' || docente.id_escuela === escuelaSeleccionada.value
    const coincideArea = areaSeleccionada.value === '' || docente.id_area === areaSeleccionada.value
    return coincideNombre && coincideEscuela && coincideArea
  })
})

const cantidadSeleccionados = computed(() => Object.keys(seleccionados.value).length)
const docentesSeleccionados = computed(() => docentes.value.filter((docente) => docente.id in seleccionados.value))

async function cargarDatos(id?: number | null) {
  cargando.value = true
  error.value = ''
  aviso.value = ''

  try {
    const { data } = await api.get<Respuesta>('/decanatura/asignacion-jurados', {
      params: id ? { expediente_id: id } : undefined,
    })
    expedientes.value = data.expedientes
    contexto.value = data.contexto
    docentes.value = data.docentes
    escuelas.value = data.filtros.escuelas
    areas.value = data.filtros.areas
    expedienteSeleccionado.value = data.contexto?.id ?? null
    seleccionados.value = {}
  } catch {
    error.value = 'No se pudo cargar la información de asignación desde la base de datos.'
  } finally {
    cargando.value = false
  }
}

function cambiarExpediente() {
  cargarDatos(expedienteSeleccionado.value)
}

function alternarDocente(docente: Docente, marcado: boolean) {
  aviso.value = ''
  if (docente.no_seleccionable) return

  if (!marcado) {
    delete seleccionados.value[docente.id]
    return
  }

  if (cantidadSeleccionados.value >= maxJurados) {
    aviso.value = 'Solo puede seleccionar tres docentes.'
    return
  }

  seleccionados.value[docente.id] = ''
}

function validarSeleccion() {
  const cargos = Object.values(seleccionados.value)
  if (cantidadSeleccionados.value !== maxJurados || cargos.some((cargo) => !cargo) || new Set(cargos).size !== maxJurados) {
    aviso.value = 'Seleccione exactamente tres docentes y asigne un cargo diferente a cada uno.'
    return
  }

  aviso.value = 'Selección válida. Según el flujo actual, UDI debe registrar esta propuesta y Decanatura la ratifica mediante una resolución.'
}

onMounted(() => {
  const expedienteId = Number(route.params.id)
  cargarDatos(Number.isInteger(expedienteId) && expedienteId > 0 ? expedienteId : null)
})
</script>

<template>
  <div class="max-w-container-max-width mx-auto p-gutter pb-32">
    <div class="flex items-center gap-4 mb-8">
      <button type="button" class="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-surface-container" @click="router.back()">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div>
        <h2 class="font-headline-md text-headline-md text-primary">Asignación Individual de Jurados</h2>
        <nav class="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
          <span>Decanatura</span><span class="material-symbols-outlined !text-sm">chevron_right</span>
          <span class="text-primary font-bold">Asignación de Jurados</span>
        </nav>
      </div>
    </div>

    <div v-if="error" class="mb-5 rounded-xl border border-status-error/30 bg-error-container px-4 py-3 text-status-error">
      {{ error }} <button type="button" class="font-bold underline" @click="cargarDatos(expedienteSeleccionado)">Reintentar</button>
    </div>
    <div v-if="aviso" class="mb-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-primary">{{ aviso }}</div>

    <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm mb-6 overflow-hidden">
      <div class="bg-surface-container-low px-card-padding py-3 border-b border-outline-variant/30 flex flex-wrap justify-between items-center gap-3">
        <h3 class="font-headline-sm text-headline-sm text-primary">Contexto del Proyecto de Tesis</h3>
        <select v-model="expedienteSeleccionado" class="w-full sm:w-auto sm:min-w-64 px-3 py-2 bg-white border border-outline-variant rounded-lg" :disabled="cargando || !expedientes.length" @change="cambiarExpediente">
          <option v-if="!expedientes.length" :value="null">No hay expedientes disponibles</option>
          <option v-for="expediente in expedientes" :key="expediente.id" :value="expediente.id">
            {{ expediente.codigo }} — {{ expediente.tesista }}
          </option>
        </select>
      </div>
      <div v-if="contexto" class="p-card-padding grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="md:col-span-2">
          <label class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Título de la Tesis</label>
          <p class="font-headline-sm text-headline-sm text-on-surface mt-1">{{ contexto.titulo }}</p>
          <span class="inline-block mt-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{{ contexto.estado }}</span>
        </div>
        <div>
          <label class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Estudiante / Investigador</label>
          <div class="flex items-center gap-3 mt-1">
            <span class="material-symbols-outlined text-secondary">person</span>
            <p class="font-body-md text-body-md font-bold text-on-surface">{{ contexto.tesista }} ({{ contexto.codigo }})</p>
          </div>
          <p class="font-label-md text-label-md text-on-surface-variant ml-8">{{ contexto.escuela }}</p>
        </div>
        <div class="md:border-l border-outline-variant/20 md:pl-6">
          <label class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Asesor Actual</label>
          <div class="flex items-center gap-3 mt-1">
            <span class="material-symbols-outlined text-secondary">school</span>
            <p class="font-body-md text-body-md font-bold text-on-surface">{{ contexto.asesor }}</p>
          </div>
          <p v-if="contexto.coasesor" class="mt-2 text-sm text-on-surface-variant">Coasesor: {{ contexto.coasesor }}</p>
        </div>
      </div>
      <div v-else class="p-card-padding text-center text-on-surface-variant">No hay un expediente activo para mostrar.</div>
    </div>

    <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm mb-6 p-card-padding">
      <h3 class="font-headline-sm text-headline-sm text-primary mb-4 flex items-center gap-2"><span class="material-symbols-outlined">filter_list</span>Criterios de Búsqueda de Jurados</h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="md:col-span-2">
          <label class="font-label-md text-label-md text-on-surface-variant mb-1 block">Nombre del Docente</label>
          <div class="relative"><span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span><input v-model="busqueda" class="w-full pl-10 pr-4 py-2 bg-white border border-outline-variant rounded-lg" placeholder="Buscar por apellido o nombre..." type="text"></div>
        </div>
        <div>
          <label class="font-label-md text-label-md text-on-surface-variant mb-1 block">Escuela</label>
          <select v-model="escuelaSeleccionada" class="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg"><option value="">Todas</option><option v-for="escuela in escuelas" :key="escuela.id" :value="escuela.id">{{ escuela.nombre }}</option></select>
        </div>
        <div>
          <label class="font-label-md text-label-md text-on-surface-variant mb-1 block">Área de investigación</label>
          <select v-model="areaSeleccionada" class="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg"><option value="">Todas</option><option v-for="area in areas" :key="area.id" :value="area.id">{{ area.nombre }}</option></select>
        </div>
      </div>
    </div>

    <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden" :class="{ 'opacity-60': cargando }">
      <div class="bg-surface-container-low px-card-padding py-3 flex justify-between items-center border-b border-outline-variant/30">
        <h3 class="font-headline-sm text-headline-sm text-primary">Docentes Disponibles</h3>
        <span class="font-label-sm text-label-sm bg-primary/10 text-primary px-3 py-1 rounded-full">Total: {{ docentesFiltrados.length }} docentes</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead><tr class="bg-surface-container-low/50 border-b border-outline-variant/30"><th class="px-6 py-4 uppercase">Nombre y escuela</th><th class="px-6 py-4 uppercase text-center">Estado / carga</th><th class="px-6 py-4 uppercase">Definir cargo</th><th class="px-6 py-4 uppercase text-right">Acción</th></tr></thead>
          <tbody class="divide-y divide-outline-variant/20">
            <tr v-for="docente in docentesFiltrados" :key="docente.id" :class="docente.no_seleccionable ? 'bg-surface-container-high/20 opacity-60' : 'hover:bg-surface-container-low'">
              <td class="px-6 py-4"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full flex items-center justify-center font-bold bg-secondary-fixed text-on-secondary-fixed">{{ docente.iniciales }}</div><div><p class="font-bold">{{ docente.nombre }}</p><p class="text-xs text-on-surface-variant">{{ docente.escuela }} · {{ docente.area }}</p></div></div></td>
              <td class="px-6 py-4 text-center"><span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-sm"><span class="status-dot" :class="docente.estado_carga === 'Disponible' ? 'bg-green-500' : docente.estado_carga === 'Moderado' ? 'bg-yellow-500' : 'bg-error'"></span>{{ docente.estado_carga === 'Asesor' ? 'Asesor del proyecto' : `${docente.estado_carga} (${docente.carga})` }}</span></td>
              <td class="px-6 py-4"><select v-model="seleccionados[docente.id]" :disabled="docente.no_seleccionable || !(docente.id in seleccionados)" class="w-full bg-white border border-outline-variant rounded-lg text-sm"><option value="">Seleccionar cargo...</option><option v-for="rol in roles" :key="rol" :value="rol">{{ rol }}</option></select></td>
              <td class="px-6 py-4 text-right"><input type="checkbox" :disabled="docente.no_seleccionable" class="w-5 h-5 rounded" :checked="docente.id in seleccionados" @change="(evento: Event) => alternarDocente(docente, (evento.target as HTMLInputElement).checked)"></td>
            </tr>
            <tr v-if="!cargando && docentesFiltrados.length === 0"><td colspan="4" class="px-6 py-8 text-center text-on-surface-variant">No se encontraron docentes con esos criterios.</td></tr>
            <tr v-if="cargando"><td colspan="4" class="px-6 py-8 text-center text-on-surface-variant">Cargando docentes...</td></tr>
          </tbody>
        </table>
      </div>
      <div class="p-card-padding border-t border-outline-variant/30 bg-surface-container-lowest"><p class="text-on-surface-variant text-sm italic">Seleccione exactamente tres jurados con cargos distintos. El asesor y coasesor no pueden integrar la terna.</p></div>
    </div>

    <div class="fixed bottom-0 right-0 left-0 lg:left-sidebar-width bg-surface border-t border-outline-variant/30 p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-30">
      <div class="flex gap-4 items-center"><div class="flex -space-x-2"><div v-for="docente in docentesSeleccionados" :key="docente.id" class="w-8 h-8 rounded-full bg-secondary-container border-2 border-white flex items-center justify-center text-[10px] font-bold">{{ docente.iniciales }}</div><div v-if="cantidadSeleccionados < 3" class="w-8 h-8 rounded-full bg-surface-container-highest border-2 border-white flex items-center justify-center text-[10px] text-outline">?</div></div><p class="text-sm"><span class="text-primary font-bold">{{ cantidadSeleccionados }}</span> de {{ maxJurados }} jurados seleccionados</p></div>
      <div class="flex gap-4"><button type="button" class="px-8 py-3 rounded-full hover:bg-surface-container" @click="seleccionados = {}; aviso = ''">Cancelar</button><button type="button" class="px-10 py-3 rounded-full bg-primary-container text-white shadow-lg flex items-center gap-2" @click="validarSeleccion"><span class="material-symbols-outlined !text-lg">check_circle</span>Validar selección</button></div>
    </div>
  </div>
</template>

<style scoped>
.p-card-padding { padding: 1.5rem; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
</style>
