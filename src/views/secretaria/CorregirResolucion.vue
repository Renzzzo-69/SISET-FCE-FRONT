<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'
type Resolucion = {
  id: number
  numero: string
  tipo: string
  tipo_codigo: string
  fecha: string
  archivo: string
  version: number
  estado: string
  expediente: string
  tesista: string
  destinatario: string
  id_expediente: number | null
  proyecto: string
  id_escuela: number | null
  escuela: string
}
const route = useRoute()
const router = useRouter()
const resoluciones = ref<Resolucion[]>([])
const escuelasCatalogo = ref<Array<{ id: number; nombre: string }>>([])
const busqueda = ref('')
const escuelasSeleccionadas = ref<number[]>([])
const seleccionada = ref<Resolucion | null>(null)
const numero = ref('')
const fecha = ref(new Date().toISOString().slice(0, 10))
const archivo = ref<File | null>(null)
const motivo = ref('')
const mostrarArchivo = ref(false)
const propuesta = ref<number | null>(null)
const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')
const escuelas = computed(() => escuelasCatalogo.value)
const proyectos = computed(() => {
  const grupos = new Map<number, { id: number; proyecto: string; expediente: string; tesista: string; escuela: string; resoluciones: Resolucion[] }>()
  resoluciones.value.filter((r) => r.id_expediente !== null).forEach((r) => {
    const id = r.id_expediente as number
    if (!grupos.has(id)) grupos.set(id, { id, proyecto: r.proyecto, expediente: r.expediente, tesista: r.tesista, escuela: r.escuela, resoluciones: [] })
    grupos.get(id)?.resoluciones.push(r)
  })
  return [...grupos.values()]
})
const resultados = computed(() => {
  const q = busqueda.value.toLocaleLowerCase('es').trim()
  return proyectos.value.filter((proyecto) => {
    const primera = proyecto.resoluciones[0]
    const coincideEscuela = !escuelasSeleccionadas.value.length || (primera?.id_escuela !== null && primera?.id_escuela !== undefined && escuelasSeleccionadas.value.includes(primera.id_escuela))
    const coincideTexto = !q || `${proyecto.proyecto} ${proyecto.tesista}`.toLocaleLowerCase('es').includes(q)
    return coincideEscuela && coincideTexto
  })
})
const proyectoSeleccionado = computed(() => {
  const id = Number(route.params.idExpediente ?? 0)
  return id ? proyectos.value.find((proyecto) => proyecto.id === id) ?? null : null
})
function nombreArchivo(ruta: string) {
  return decodeURIComponent(ruta.split('/').pop() ?? ruta)
}
async function cargar() {
  try {
    const { data } = await api.get('/secretaria/resoluciones')
    resoluciones.value = data.resoluciones
    escuelasCatalogo.value = data.escuelas ?? []
    const id = Number(route.query.id)
    if (id) seleccionar(resoluciones.value.find((r: Resolucion) => r.id === id) ?? null)
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'No se pudieron cargar las resoluciones.'
  } finally {
    cargando.value = false
  }
}
function abrirProyecto(id: number) {
  router.push({ name: 'secretaria-corregir-resolucion-proyecto', params: { idExpediente: id } })
}
function volverAProyectos() {
  router.push({ name: 'secretaria-corregir-resolucion' })
}
async function seleccionar(r: Resolucion | null) {
  seleccionada.value = r
  numero.value = ''
  archivo.value = null
  motivo.value = ''
  mostrarArchivo.value = false
  error.value = ''
  mensaje.value = ''
  propuesta.value = null
  if (r?.tipo_codigo === 'designacion_jurados') {
    try {
      const { data } = await api.get('/secretaria/resoluciones/opciones')
      const exp = data.expedientes.find((e: any) => e.id_expediente === r.id_expediente)
      propuesta.value = exp?.id_designacion_propuesta ?? null
    } catch {
      /* se valida al guardar */
    }
  }
}
function elegirArchivo(event: Event) {
  archivo.value = (event.target as HTMLInputElement).files?.[0] ?? null
}
async function guardar() {
  if (
    !seleccionada.value ||
    !numero.value ||
    !fecha.value ||
    !archivo.value ||
    !motivo.value.trim()
  ) {
    error.value = 'Complete el nuevo número, fecha, motivo y archivo PDF.'
    return
  }
  if (seleccionada.value.tipo_codigo === 'designacion_jurados' && !propuesta.value) {
    error.value =
      'Para corregir una designación, UDI debe registrar primero una nueva propuesta de terna.'
    return
  }
  guardando.value = true
  error.value = ''
  mensaje.value = ''
  try {
    const form = new FormData()
    form.append('numero_resolucion', numero.value)
    form.append('fecha_emision', fecha.value)
    form.append('archivo_pdf', archivo.value)
    form.append('motivo_reemplazo', motivo.value)
    if (propuesta.value) form.append('id_designacion', String(propuesta.value))
    const { data } = await api.post(
      `/secretaria/resoluciones/${seleccionada.value.id}/reemplazo`,
      form,
    )
    mensaje.value = data.message
    seleccionada.value = null
    await cargar()
  } catch (e: any) {
    const errs = e.response?.data?.errors
    error.value =
      e.response?.data?.message ??
      (errs ? Object.values(errs).flat().join(' ') : 'No se pudo corregir la resolución.')
  } finally {
    guardando.value = false
  }
}
onMounted(cargar)
</script>

<template>
  <div class="max-w-container-max-width mx-auto pb-24">
    <div class="flex items-center gap-4 mb-2">
      <span class="material-symbols-outlined text-primary">edit_document</span>
      <h2 class="font-headline-lg text-headline-lg text-primary">Corrección de Subidas</h2>
    </div>
    <p class="text-on-surface-variant mb-8 max-w-2xl">
      Busca una resolución ya subida para corregir sus datos o el archivo adjunto, sin eliminarla ni
      perder su historial.
    </p>
    <div
      v-if="mensaje"
      class="mb-5 rounded-xl bg-secondary-container p-4 text-on-secondary-container"
    >
      {{ mensaje }}
    </div>
    <div v-if="error" class="mb-5 rounded-xl bg-error-container p-4 text-error">{{ error }}</div>
    <div
      v-if="!seleccionada && !proyectoSeleccionado"
      class="mb-8 space-y-5"
    >
      <section class="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]">
          <div>
            <label class="mb-2 block text-xs font-bold uppercase tracking-wider text-outline">Buscar proyecto o tesista</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input v-model="busqueda" class="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-primary/20" placeholder="Nombre del proyecto o del tesista..." />
            </div>
          </div>
          <fieldset>
            <legend class="mb-2 text-xs font-bold uppercase tracking-wider text-outline">Escuelas</legend>
            <div class="flex flex-wrap gap-2">
              <label v-for="escuela in escuelas" :key="escuela.id" class="flex cursor-pointer items-center gap-2 rounded-lg border border-outline-variant/40 px-3 py-2 text-sm transition" :class="escuelasSeleccionadas.includes(escuela.id) ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface'">
                <input v-model="escuelasSeleccionadas" type="checkbox" :value="escuela.id" class="h-4 w-4 accent-primary" />
                {{ escuela.nombre }}
              </label>
            </div>
          </fieldset>
        </div>
      </section>
      <p v-if="cargando" class="py-10 text-center text-on-surface-variant">Cargando proyectos y resoluciones...</p>
      <div v-else-if="resultados.length" class="space-y-5">
        <button v-for="proyecto in resultados" :key="proyecto.id" type="button" class="w-full overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md" @click="abrirProyecto(proyecto.id)">
          <header class="bg-surface-container-low px-5 py-5 sm:px-6">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <p class="text-xs font-bold uppercase tracking-wider text-secondary">{{ proyecto.escuela }}</p>
                <h3 class="mt-1 text-lg font-bold leading-snug text-primary">{{ proyecto.proyecto }}</h3>
                <p class="mt-1 text-sm text-on-surface-variant">{{ proyecto.expediente }} · {{ proyecto.tesista }}</p>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <span class="rounded-full bg-primary-fixed px-3 py-1 text-xs font-bold text-on-primary-fixed-variant">{{ proyecto.resoluciones.length }} resolución{{ proyecto.resoluciones.length === 1 ? '' : 'es' }}</span>
                <span class="material-symbols-outlined text-primary">chevron_right</span>
              </div>
            </div>
          </header>
        </button>
      </div>
      <div v-else class="rounded-2xl border border-dashed border-outline-variant/50 bg-surface-container-lowest px-6 py-12 text-center text-on-surface-variant">
        <span class="material-symbols-outlined mb-2 text-4xl">search_off</span>
        <p class="font-bold">No se encontraron proyectos con esos filtros.</p>
      </div>
    </div>
    <section v-else-if="!seleccionada && proyectoSeleccionado" class="space-y-5">
      <button type="button" class="flex items-center gap-2 font-bold text-primary hover:underline" @click="volverAProyectos">
        <span class="material-symbols-outlined">arrow_back</span>Volver a proyectos
      </button>
      <div class="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
        <header class="border-b border-outline-variant/30 bg-surface-container-low px-5 py-5 sm:px-6">
          <p class="text-xs font-bold uppercase tracking-wider text-secondary">{{ proyectoSeleccionado.escuela }}</p>
          <h3 class="mt-1 text-xl font-bold leading-snug text-primary">{{ proyectoSeleccionado.proyecto }}</h3>
          <p class="mt-2 text-sm text-on-surface-variant">{{ proyectoSeleccionado.expediente }} · {{ proyectoSeleccionado.tesista }}</p>
        </header>
        <div class="px-5 py-4 sm:px-6">
          <h4 class="font-bold text-primary">Resoluciones subidas</h4>
          <p class="text-sm text-on-surface-variant">Seleccione una resolución vigente para reemplazarla.</p>
        </div>
        <div class="divide-y divide-outline-variant/20 border-t border-outline-variant/20">
          <div v-for="r in proyectoSeleccionado.resoluciones" :key="r.id" class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-bold text-primary">{{ r.numero }}</p>
                <span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="r.estado === 'vigente' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant'">{{ r.estado }}</span>
              </div>
              <p class="mt-1 text-sm text-on-surface-variant">{{ r.tipo }} · Versión {{ r.version }} · {{ new Date(`${r.fecha}T00:00:00`).toLocaleDateString('es-PE') }}</p>
            </div>
            <button v-if="r.estado === 'vigente'" type="button" class="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white" @click="seleccionar(r)">
              <span class="material-symbols-outlined text-[19px]">published_with_changes</span>Reemplazar
            </button>
            <span v-else class="text-xs font-semibold text-on-surface-variant">Conservada en el historial</span>
          </div>
        </div>
      </div>
    </section>
    <form
      v-else-if="seleccionada"
      class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden"
      @submit.prevent="guardar"
    >
      <div
        class="bg-surface-container-low px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between"
      >
        <div class="flex items-center gap-2">
          <span
            class="w-6 h-6 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-bold"
            >2</span
          >
          <h3 class="font-bold text-primary">Corrige los datos</h3>
        </div>
        <button
          type="button"
          class="text-sm text-primary hover:underline flex items-center gap-1"
          @click="seleccionar(null)"
        >
          <span class="material-symbols-outlined text-[16px]">sync_alt</span>Elegir otra resolución
        </button>
      </div>
      <div class="p-6 space-y-8">
        <div
          class="flex items-start gap-3 bg-warning-container/40 border border-warning/30 rounded-xl p-4"
        >
          <span class="material-symbols-outlined text-warning">warning</span>
          <div>
            <strong>Editando:</strong> {{ seleccionada.numero }} — subida el
            {{ new Date(`${seleccionada.fecha}T00:00:00`).toLocaleDateString('es-PE') }}. El cambio
            quedará registrado como una nueva versión.
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label class="text-xs text-outline uppercase tracking-wider">Tipo de resolución</label
            ><input
              :value="seleccionada.tipo"
              readonly
              class="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container cursor-not-allowed"
            />
          </div>
          <div class="space-y-2">
            <label class="text-xs text-outline uppercase tracking-wider">Destinatario</label
            ><input
              :value="seleccionada.destinatario"
              readonly
              class="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container cursor-not-allowed"
            />
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label class="text-xs text-outline uppercase tracking-wider">Nuevo número</label
            ><input
              v-model.trim="numero"
              class="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest"
              placeholder="Número único"
            />
          </div>
          <div class="space-y-2">
            <label class="text-xs text-outline uppercase tracking-wider"
              >Nueva fecha de emisión</label
            ><input
              v-model="fecha"
              type="date"
              class="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest"
            />
          </div>
        </div>
        <div class="space-y-2">
          <label class="text-xs text-outline uppercase tracking-wider">Archivo actual</label>
          <div
            class="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-surface-container-low rounded-xl border border-outline-variant/30"
          >
            <span class="material-symbols-outlined text-primary">description</span>
            <div class="flex-1 min-w-0">
              <p class="font-bold truncate">{{ nombreArchivo(seleccionada.archivo) }}</p>
              <p class="text-sm text-on-surface-variant">
                Versión {{ seleccionada.version }} · {{ seleccionada.fecha }}
              </p>
            </div>
            <button
              type="button"
              class="w-full sm:w-auto px-4 py-2 rounded-lg border border-primary text-primary flex justify-center gap-2"
              @click="mostrarArchivo = true"
            >
              <span class="material-symbols-outlined text-[18px]">sync</span>Reemplazar archivo
            </button>
          </div>
          <label
            v-if="mostrarArchivo"
            class="border-2 border-dashed border-outline-variant/60 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer"
            ><span class="material-symbols-outlined text-secondary text-4xl">cloud_upload</span>
            <p class="font-bold">{{ archivo?.name ?? 'Arrastra y suelta el archivo corregido' }}</p>
            <p class="text-sm text-on-surface-variant">PDF, máximo 30 MB</p>
            <input class="hidden" type="file" accept="application/pdf,.pdf" @change="elegirArchivo"
          /></label>
        </div>
        <div class="space-y-2">
          <label class="text-xs text-outline uppercase tracking-wider"
            >Motivo de la corrección</label
          ><textarea
            v-model.trim="motivo"
            rows="3"
            maxlength="1000"
            placeholder="Explique brevemente por qué se reemplaza esta resolución."
            class="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest resize-none"
          ></textarea>
          <p class="text-xs text-on-surface-variant">
            Este comentario quedará guardado en la nueva versión.
          </p>
        </div>
        <p
          v-if="seleccionada.tipo_codigo === 'designacion_jurados' && !propuesta"
          class="text-error text-sm"
        >
          UDI debe registrar una nueva propuesta de terna antes de reemplazar esta designación.
        </p>
      </div>
      <div
        class="bg-surface-container-low px-6 py-6 border-t border-outline-variant/30 flex justify-end gap-4"
      >
        <button
          type="button"
          class="px-8 py-3 rounded-xl font-bold text-secondary border border-secondary"
          @click="seleccionar(null)"
        >
          Cancelar</button
        ><button
          :disabled="guardando"
          class="px-10 py-3 rounded-xl font-bold text-white bg-primary-container flex items-center gap-2 disabled:opacity-50"
        >
          <span class="material-symbols-outlined text-[20px]">save</span
          >{{ guardando ? 'Guardando...' : 'Guardar corrección' }}
        </button>
      </div>
    </form>
  </div>
</template>
