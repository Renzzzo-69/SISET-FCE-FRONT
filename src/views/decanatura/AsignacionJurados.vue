<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import api from '@/services/api'

type Metricas = { pendientes: number; asignados_hoy: number; jurados_disponibles: number }
type Expediente = {
  id: number
  codigo: string
  titulo: string
  tesista: string
  escuela: string
  fecha: string
  estado: string
  estado_codigo: string
}
type Respuesta = { metricas: Metricas; expedientes: Expediente[] }

const router = useRouter()
const cargando = ref(true)
const error = ref('')
const busqueda = ref('')
const pagina = ref(1)
const porPagina = 3
const metricas = ref<Metricas>({ pendientes: 0, asignados_hoy: 0, jurados_disponibles: 0 })
const expedientes = ref<Expediente[]>([])

const expedientesFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase('es')
  if (!termino) return expedientes.value

  return expedientes.value.filter((expediente) =>
    [expediente.codigo, expediente.titulo, expediente.tesista, expediente.escuela]
      .some((valor) => valor.toLocaleLowerCase('es').includes(termino)),
  )
})
const totalPaginas = computed(() => Math.max(1, Math.ceil(expedientesFiltrados.value.length / porPagina)))
const expedientesPagina = computed(() => expedientesFiltrados.value.slice((pagina.value - 1) * porPagina, pagina.value * porPagina))

watch(busqueda, () => { pagina.value = 1 })

async function cargarListado() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<Respuesta>('/decanatura/jurados-pendientes')
    metricas.value = data.metricas
    expedientes.value = data.expedientes
  } catch {
    error.value = 'No se pudieron cargar los expedientes pendientes desde la base de datos.'
  } finally {
    cargando.value = false
  }
}

function abrirAsignacion(id: number) {
  router.push({ name: 'decanatura-asignacion-individual', params: { id } })
}

function formatearFecha(fecha: string) {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(fecha))
}

function tiempoTranscurrido(fecha: string) {
  const diferencia = Date.now() - new Date(fecha).getTime()
  const horas = Math.max(0, Math.floor(diferencia / 3_600_000))
  if (horas < 24) return horas === 1 ? 'Recibido hace 1 hora' : `Recibido hace ${horas} horas`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? 'Recibido hace 1 día' : `Recibido hace ${dias} días`
}

onMounted(cargarListado)
</script>

<template>
  <div class="max-w-container-max-width mx-auto">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-8">
      <h2 class="font-headline-lg text-headline-lg text-primary mb-1">Asignación de Jurados</h2>
    </div>

    <div v-if="error" class="mb-5 rounded-xl border border-status-error/30 bg-error-container px-4 py-3 text-status-error">
      {{ error }} <button type="button" class="font-bold underline" @click="cargarListado">Reintentar</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8" :class="{ 'opacity-60': cargando }">
      <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 shadow-sm">
        <div class="flex items-center gap-3 mb-2"><div class="w-8 h-8 bg-primary-container/10 rounded-lg flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[20px]">pending_actions</span></div><span class="font-label-md text-label-md text-on-surface-variant">Pendientes</span></div>
        <p class="text-3xl font-bold text-on-surface">{{ metricas.pendientes }}</p>
      </div>
      <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 shadow-sm">
        <div class="flex items-center gap-3 mb-2"><div class="w-8 h-8 bg-secondary-container/10 rounded-lg flex items-center justify-center text-secondary"><span class="material-symbols-outlined text-[20px]">assignment_turned_in</span></div><span class="font-label-md text-label-md text-on-surface-variant">Asignados hoy</span></div>
        <p class="text-3xl font-bold text-on-surface">{{ metricas.asignados_hoy }}</p>
      </div>
      <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 shadow-sm">
        <div class="flex items-center gap-3 mb-2"><div class="w-8 h-8 bg-tertiary-container/10 rounded-lg flex items-center justify-center text-on-tertiary-fixed-variant"><span class="material-symbols-outlined text-[20px]">group</span></div><span class="font-label-md text-label-md text-on-surface-variant">Jurados disponibles</span></div>
        <p class="text-3xl font-bold text-on-surface">{{ metricas.jurados_disponibles }}</p>
      </div>
    </div>

    <div class="mb-6">
      <div class="flex items-center bg-surface-container px-4 py-3 rounded-xl w-full border border-outline-variant/30">
        <span class="material-symbols-outlined text-outline mr-3">search</span>
        <input v-model="busqueda" class="bg-transparent border-none focus:ring-0 text-body-md w-full outline-none" placeholder="Buscar expedientes, tesistas..." type="text">
      </div>
    </div>

    <div class="space-y-4">
      <div class="flex items-center justify-between px-2"><h3 class="font-headline-sm text-headline-sm text-on-surface">Expedientes en Espera</h3></div>

      <div v-if="cargando" class="bg-white border border-outline-variant/30 rounded-xl p-10 text-center text-on-surface-variant">Cargando expedientes...</div>
      <div v-else-if="expedientesPagina.length === 0" class="bg-white border border-outline-variant/30 rounded-xl p-10 text-center text-on-surface-variant">No hay expedientes pendientes de asignación.</div>

      <div v-for="expediente in expedientesPagina" :key="expediente.id" class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
        <div class="bg-surface-container-low px-card-padding py-3 flex flex-wrap justify-between items-center gap-2 border-b border-outline-variant/20">
          <div class="flex items-center gap-2"><span class="px-2 py-0.5 bg-primary-container text-on-primary-container rounded text-[10px] font-bold tracking-wider uppercase">{{ expediente.codigo }}</span><span class="text-outline text-label-sm">•</span><span class="text-outline text-label-sm font-label-sm">{{ tiempoTranscurrido(expediente.fecha) }}</span></div>
          <span class="flex items-center gap-1.5 text-on-tertiary-fixed-variant bg-tertiary-fixed/30 px-3 py-1 rounded-full text-label-sm font-label-sm"><span class="w-1.5 h-1.5 bg-tertiary-container rounded-full animate-pulse"></span>{{ expediente.estado }}</span>
        </div>
        <div class="p-card-padding flex flex-col md:flex-row gap-6">
          <div class="flex-1">
            <h4 class="font-headline-sm text-headline-sm text-primary mb-3 group-hover:text-primary-container transition-colors">{{ expediente.titulo }}</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              <div class="flex gap-3 items-start"><div class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-outline"><span class="material-symbols-outlined">person</span></div><div><p class="font-label-sm text-label-sm text-outline uppercase tracking-tight">Tesista</p><p class="font-body-md text-body-md font-bold">{{ expediente.tesista }}</p><p class="font-label-sm text-label-sm text-on-surface-variant">Expediente: {{ expediente.codigo }}</p></div></div>
              <div class="flex gap-3 items-start"><div class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-outline"><span class="material-symbols-outlined">school</span></div><div><p class="font-label-sm text-label-sm text-outline uppercase tracking-tight">Escuela</p><p class="font-body-md text-body-md">{{ expediente.escuela }}</p><p class="font-label-sm text-label-sm text-on-surface-variant">Facultad de Ciencias Económicas</p></div></div>
            </div>
          </div>
          <div class="flex flex-col justify-center items-end md:border-l border-outline-variant/20 md:pl-6 md:w-48">
            <button type="button" class="w-full bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary-container/20" @click="abrirAsignacion(expediente.id)"><span class="material-symbols-outlined text-[20px]">person_add</span>Asignar Jurados</button>
            <p class="mt-3 text-label-sm text-outline text-center w-full">Solicitado: {{ formatearFecha(expediente.fecha) }}</p>
          </div>
        </div>
      </div>

      <div v-if="expedientesFiltrados.length" class="flex items-center justify-between py-6">
        <p class="font-label-sm text-label-sm text-outline">Mostrando {{ expedientesPagina.length }} de {{ expedientesFiltrados.length }} expedientes pendientes</p>
        <div class="flex gap-1">
          <button type="button" class="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant" :disabled="pagina === 1" @click="pagina--"><span class="material-symbols-outlined">chevron_left</span></button>
          <button v-for="numero in totalPaginas" :key="numero" type="button" class="w-10 h-10 rounded-lg border border-outline-variant font-bold" :class="numero === pagina ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'" @click="pagina = numero">{{ numero }}</button>
          <button type="button" class="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant" :disabled="pagina === totalPaginas" @click="pagina++"><span class="material-symbols-outlined">chevron_right</span></button>
        </div>
      </div>
    </div>
  </div>
</template>
