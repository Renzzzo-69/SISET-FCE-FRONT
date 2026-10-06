<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

type Resolucion = {
  id: number
  numero: string
  tipo: string
  fecha: string
  archivo: string
  version: number
  estado: string
  expediente: string
  tesista: string
}
type Respuesta = {
  metricas: { total: number; emitidas_mes: number; vigentes: number }
  resoluciones: Resolucion[]
}
const router = useRouter()
const cargando = ref(true)
const error = ref('')
const busqueda = ref('')
const tipoFiltro = ref('')
const metricas = ref({ total: 0, emitidas_mes: 0, vigentes: 0 })
const resoluciones = ref<Resolucion[]>([])
const visibles = computed(() => {
  const texto = busqueda.value.trim().toLocaleLowerCase('es')
  return resoluciones.value.filter(
    (r) =>
      (!tipoFiltro.value || r.tipo === tipoFiltro.value) &&
      (!texto ||
        `${r.numero} ${r.tipo} ${r.expediente} ${r.tesista}`
          .toLocaleLowerCase('es')
          .includes(texto)),
  )
})
const tipos = computed(() => [...new Set(resoluciones.value.map((r) => r.tipo))])
function claseTipo(tipo: string) {
  if (tipo.includes('jurado')) return 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
  if (tipo.includes('proyecto')) return 'bg-secondary-container text-on-secondary-container'
  return 'bg-primary-fixed text-on-primary-fixed-variant'
}
function urlArchivo(ruta: string) {
  if (/^https?:\/\//.test(ruta)) return ruta
  const base = String(import.meta.env.VITE_API_URL ?? '').replace(/\/api\/?$/, '')
  return `${base}${ruta.startsWith('/') ? '' : '/'}${ruta}`
}
async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<Respuesta>('/secretaria/resoluciones')
    metricas.value = data.metricas
    resoluciones.value = data.resoluciones
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'No se pudieron cargar las resoluciones.'
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)
</script>

<template>
  <div class="max-w-container-max-width mx-auto pb-24">
    <div
      v-if="error"
      class="mb-5 rounded-xl border border-error/30 bg-error-container p-4 text-error"
    >
      {{ error }} <button class="underline font-bold" @click="cargar">Reintentar</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div
        class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-sm transition-all hover:shadow-md"
      >
        <div class="flex justify-between mb-2">
          <span class="text-primary-container p-2 bg-primary-fixed rounded-lg"
            ><span class="material-symbols-outlined">description</span></span
          ><span class="text-secondary text-xs">Documentos registrados</span>
        </div>
        <p class="text-on-surface-variant">Total Resoluciones</p>
        <h3 class="text-3xl font-bold text-primary mt-1">{{ metricas.total }}</h3>
      </div>
      <div
        class="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-sm transition-all hover:shadow-md"
      >
        <div class="flex justify-between mb-2">
          <span class="text-on-secondary-container p-2 bg-secondary-container rounded-lg"
            ><span class="material-symbols-outlined">published_with_changes</span></span
          ><span class="text-on-secondary-container text-xs">Mes actual</span>
        </div>
        <p class="text-on-surface-variant">Emitidas este mes</p>
        <h3 class="text-3xl font-bold text-primary mt-1">{{ metricas.emitidas_mes }}</h3>
      </div>
    </div>
    <div class="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
      <div class="relative w-full md:w-1/2 group">
        <span
          class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline"
          >search</span
        ><input
          v-model="busqueda"
          class="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/30 rounded-full focus:ring-2 focus:ring-primary/20 outline-none"
          placeholder="Buscar por número o expediente..."
        />
      </div>
        <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        <select
          v-model="tipoFiltro"
            class="w-full sm:w-auto px-4 py-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl sm:min-w-[190px]"
        >
          <option value="">Tipo de Resolución</option>
          <option v-for="tipo in tipos" :key="tipo" :value="tipo">{{ tipo }}</option></select
        ><button
          class="flex items-center gap-2 px-6 py-3 bg-primary-container text-white rounded-xl font-bold"
          @click="router.push({ name: 'secretaria-subir-resolucion' })"
        >
          <span class="material-symbols-outlined">upload_file</span>Subir Resolución
        </button>
      </div>
    </div>
    <div
      class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden"
    >
      <div
        class="px-5 py-4 border-b border-outline-variant/30 bg-surface-container-low/50 flex justify-between"
      >
        <h4 class="font-bold text-primary">Bandeja de Resoluciones</h4>
        <span class="text-xs text-on-surface-variant"
          >Mostrando {{ visibles.length }} de {{ metricas.total }}</span
        >
      </div>
      <div v-if="cargando" class="p-8 text-center text-on-surface-variant">
        Cargando resoluciones...
      </div>
      <div v-else-if="!visibles.length" class="p-8 text-center text-on-surface-variant">
        No hay resoluciones para mostrar.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left">
          <thead class="bg-surface-container-low/30">
            <tr>
              <th class="px-6 py-4">Título / Número</th>
              <th class="px-6 py-4">Fecha Emisión</th>
              <th class="px-6 py-4">Tipo</th>
              <th class="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/20">
            <tr v-for="r in visibles" :key="r.id" class="hover:bg-surface-container-low">
              <td class="px-6 py-4">
                <p class="font-bold text-primary">{{ r.numero }}</p>
                <p class="text-sm text-on-surface-variant">
                  {{ r.tipo }} — {{ r.expediente }} · {{ r.tesista || 'Sin tesista' }} · v{{
                    r.version
                  }}
                </p>
              </td>
              <td class="px-6 py-4 text-on-surface-variant">
                {{
                  new Date(`${r.fecha}T00:00:00`).toLocaleDateString('es-PE', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                }}
              </td>
              <td class="px-6 py-4">
                <span
                  class="px-3 py-1 rounded-full text-xs font-medium"
                  :class="claseTipo(r.tipo)"
                  >{{ r.tipo }}</span
                >
              </td>
              <td class="px-6 py-4">
                <div class="flex justify-center gap-2">
                  <a
                    :href="urlArchivo(r.archivo)"
                    target="_blank"
                    rel="noopener"
                    class="p-2 text-primary hover:bg-primary-fixed rounded-lg"
                    title="Visualizar"
                    ><span class="material-symbols-outlined text-[20px]">visibility</span></a
                  ><button
                    v-if="r.estado === 'vigente'"
                    class="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg"
                    title="Editar"
                    @click="
                      router.push({ name: 'secretaria-corregir-resolucion', query: { id: r.id } })
                    "
                  >
                    <span class="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
