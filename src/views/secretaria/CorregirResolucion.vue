<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
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
  id_expediente: number
}
const route = useRoute()
const resoluciones = ref<Resolucion[]>([])
const busqueda = ref('')
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
const resultados = computed(() => {
  const q = busqueda.value.toLocaleLowerCase('es').trim()
  return resoluciones.value.filter(
    (r) =>
      r.estado === 'vigente' &&
      (!q ||
        `${r.numero} ${r.tipo} ${r.expediente} ${r.tesista}`.toLocaleLowerCase('es').includes(q)),
  )
})
function nombreArchivo(ruta: string) {
  return decodeURIComponent(ruta.split('/').pop() ?? ruta)
}
async function cargar() {
  try {
    const { data } = await api.get('/secretaria/resoluciones')
    resoluciones.value = data.resoluciones
    const id = Number(route.query.id)
    if (id) seleccionar(resoluciones.value.find((r: Resolucion) => r.id === id) ?? null)
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'No se pudieron cargar las resoluciones.'
  } finally {
    cargando.value = false
  }
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
      v-if="!seleccionada"
      class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm mb-8"
    >
      <div
        class="bg-surface-container-low px-6 py-4 border-b border-outline-variant/30 flex items-center gap-2"
      >
        <span
          class="w-6 h-6 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-bold"
          >1</span
        >
        <h3 class="font-bold text-primary">Selecciona la resolución a corregir</h3>
      </div>
      <div class="p-6">
        <div class="relative mb-4">
          <span
            class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline"
            >search</span
          ><input
            v-model="busqueda"
            class="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/30 rounded-full focus:ring-2 focus:ring-primary/20 outline-none"
            placeholder="Buscar por número, expediente o tesista..."
          />
        </div>
        <p v-if="cargando" class="text-center py-6">Cargando...</p>
        <div
          v-else
          class="divide-y divide-outline-variant/20 border border-outline-variant/20 rounded-xl overflow-hidden"
        >
          <button
            v-for="r in resultados"
            :key="r.id"
            class="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-surface-container-low"
            @click="seleccionar(r)"
          >
            <div>
              <p class="font-bold text-primary">{{ r.numero }}</p>
              <p class="text-sm text-on-surface-variant">
                {{ r.tipo }} — {{ r.expediente }} · {{ r.tesista }}
              </p>
            </div>
            <span class="material-symbols-outlined text-outline">chevron_right</span>
          </button>
          <p v-if="!resultados.length" class="text-center py-6 text-on-surface-variant">
            No se encontraron resoluciones con ese criterio.
          </p>
        </div>
      </div>
    </div>
    <form
      v-else
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
              :value="`${seleccionada.expediente} — ${seleccionada.tesista}`"
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
