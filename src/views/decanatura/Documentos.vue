<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

type Formato = {
  id: number
  nombre: string
  descripcion: string | null
  version: string
  tipo_archivo: string
  nombre_original: string
  archivo: string
  tamano: number
  estado: 'activo' | 'depreciado'
  actualizado_en: string | null
}
type Respuesta = {
  metricas: { total: number; activos: number; depreciados: number }
  formatos: Formato[]
}

const router = useRouter()
const formatos = ref<Formato[]>([])
const metricas = ref({ total: 0, activos: 0, depreciados: 0 })
const busqueda = ref('')
const cargando = ref(true)
const error = ref('')
const procesando = ref<number | null>(null)

const visibles = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase('es')
  if (!termino) return formatos.value
  return formatos.value.filter((formato) =>
    [formato.nombre, formato.descripcion, formato.version, formato.tipo_archivo]
      .filter(Boolean)
      .some((valor) => String(valor).toLocaleLowerCase('es').includes(termino)),
  )
})

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<Respuesta>('/decanatura/formatos')
    formatos.value = data.formatos
    metricas.value = data.metricas
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'No se pudieron cargar los formatos oficiales.'
  } finally {
    cargando.value = false
  }
}

function urlArchivo(ruta: string) {
  if (/^https?:\/\//i.test(ruta)) return ruta
  const baseApi = String(import.meta.env.VITE_API_URL ?? '').replace(/\/api\/?$/, '')
  return `${baseApi}${ruta.startsWith('/') ? '' : '/'}${ruta}`
}

function abrir(formato: Formato, descargar = false) {
  const enlace = document.createElement('a')
  enlace.href = urlArchivo(formato.archivo)
  enlace.target = '_blank'
  enlace.rel = 'noopener'
  if (descargar) enlace.download = formato.nombre_original
  enlace.click()
}

async function depreciar(formato: Formato) {
  if (formato.estado === 'depreciado') return
  if (!window.confirm(`¿Marcar "${formato.nombre}" como depreciado?`)) return
  procesando.value = formato.id
  try {
    await api.delete(`/decanatura/formatos/${formato.id}`)
    await cargar()
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'No se pudo actualizar el formato.'
  } finally {
    procesando.value = null
  }
}

function icono(tipo: string) {
  return tipo === 'pdf' ? 'picture_as_pdf' : tipo.includes('xls') ? 'table_view' : 'description'
}
function fecha(fechaIso: string | null) {
  return fechaIso ? new Date(fechaIso).toLocaleDateString('es-PE') : 'Sin fecha'
}

onMounted(cargar)
</script>

<template>
  <div>
    <div class="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h2 class="mb-1 font-headline-lg text-headline-lg text-primary">
          Gestión de Formatos Oficiales
        </h2>
        <p class="font-body-md text-body-md text-on-surface-variant">
          Administre los documentos y plantillas oficiales de la facultad.
        </p>
      </div>
    </div>

    <div v-if="error" class="mb-5 rounded-xl bg-error-container p-4 text-error">
      {{ error }}
      <button class="ml-2 font-bold underline" type="button" @click="cargar">Reintentar</button>
    </div>

    <div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3" :class="{ 'opacity-60': cargando }">
      <article
        v-for="item in [
          {
            titulo: 'Total archivos',
            valor: metricas.total,
            icono: 'folder_open',
            clase: 'text-primary bg-primary-fixed/30',
          },
          {
            titulo: 'Activos',
            valor: metricas.activos,
            icono: 'check_circle',
            clase: 'text-secondary bg-secondary-container/50',
          },
          {
            titulo: 'Depreciados',
            valor: metricas.depreciados,
            icono: 'history',
            clase: 'text-error bg-error-container/50',
          },
        ]"
        :key="item.titulo"
        class="flex items-center gap-4 rounded-xl border border-outline-variant/30 bg-surface p-4 shadow-sm"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-lg" :class="item.clase">
          <span class="material-symbols-outlined">{{ item.icono }}</span>
        </div>
        <div>
          <p class="text-label-sm font-bold uppercase text-on-surface-variant">{{ item.titulo }}</p>
          <p class="text-headline-md font-bold text-primary">{{ item.valor }}</p>
        </div>
      </article>
    </div>

    <div class="mb-6 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
      <div class="relative w-full sm:max-w-sm">
        <span
          class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline"
          >search</span
        ><input
          v-model="busqueda"
          class="w-full rounded-lg border border-outline-variant/30 bg-surface-container py-2.5 pl-10 pr-4"
          placeholder="Buscar formatos..."
          type="search"
        />
      </div>
      <button
        class="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-bold text-white shadow-sm"
        type="button"
        @click="router.push({ name: 'decanatura-formatos-nuevo' })"
      >
        <span class="material-symbols-outlined">add</span><span>Agregar Formato</span>
      </button>
    </div>

    <section
      class="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm"
    >
      <header class="border-b border-outline-variant/30 bg-surface-container/50 px-4 py-4 sm:px-6">
        <h3 class="font-headline-sm text-headline-sm text-primary">
          Listado de Documentos Oficiales
        </h3>
      </header>
      <div v-if="cargando" class="p-12 text-center text-on-surface-variant">
        Cargando formatos...
      </div>
      <div v-else-if="!visibles.length" class="p-12 text-center text-on-surface-variant">
        No hay formatos que coincidan con la búsqueda.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr
              class="bg-surface-container-lowest text-nav-caps uppercase tracking-widest text-on-surface-variant"
            >
              <th class="border-b border-outline-variant/20 px-6 py-4">Nombre del documento</th>
              <th class="border-b border-outline-variant/20 px-6 py-4">Tipo</th>
              <th class="border-b border-outline-variant/20 px-6 py-4">Estado</th>
              <th class="border-b border-outline-variant/20 px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/10">
            <tr
              v-for="formato in visibles"
              :key="formato.id"
              class="hover:bg-surface-container-low"
            >
              <td class="px-6 py-5">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary-fixed/30 text-primary"
                  >
                    <span class="material-symbols-outlined">{{ icono(formato.tipo_archivo) }}</span>
                  </div>
                  <div>
                    <p class="font-semibold text-primary">{{ formato.nombre }}</p>
                    <p class="text-label-sm text-on-surface-variant">
                      v{{ formato.version }} · Actualizado {{ fecha(formato.actualizado_en) }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-5 uppercase text-on-surface-variant">
                {{ formato.tipo_archivo }}
              </td>
              <td class="px-6 py-5">
                <span
                  class="inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase"
                  :class="
                    formato.estado === 'activo'
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-error-container text-on-error-container'
                  "
                  >{{ formato.estado }}</span
                >
              </td>
              <td class="px-6 py-5">
                <div class="flex justify-end gap-1">
                  <button
                    class="rounded-lg p-2 text-primary hover:bg-primary-fixed/20"
                    title="Visualizar"
                    @click="abrir(formato)"
                  >
                    <span class="material-symbols-outlined">visibility</span></button
                  ><button
                    class="rounded-lg p-2 text-secondary hover:bg-secondary-container/50"
                    title="Descargar"
                    @click="abrir(formato, true)"
                  >
                    <span class="material-symbols-outlined">download</span></button
                  ><button
                    :disabled="formato.estado === 'depreciado' || procesando === formato.id"
                    class="rounded-lg p-2 text-error hover:bg-error-container/50 disabled:opacity-30"
                    title="Marcar como depreciado"
                    @click="depreciar(formato)"
                  >
                    <span class="material-symbols-outlined">archive</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer
        class="border-t border-outline-variant/30 px-4 py-4 text-label-sm text-on-surface-variant sm:px-6"
      >
        Mostrando {{ visibles.length }} de {{ metricas.total }} formatos registrados
      </footer>
    </section>
  </div>
</template>
