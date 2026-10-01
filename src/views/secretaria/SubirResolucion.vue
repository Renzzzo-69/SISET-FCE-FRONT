<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

type Expediente = {
  id_expediente: number
  codigo: string
  tesista: string
  tipos_disponibles: string[]
  id_designacion_propuesta: number | null
}
const router = useRouter()
const expedientes = ref<Expediente[]>([])
const tipos = ref<Record<string, string>>({})
const idExpediente = ref<number | null>(null)
const tipo = ref('')
const numero = ref('')
const fecha = ref(new Date().toISOString().slice(0, 10))
const archivo = ref<File | null>(null)
const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const expediente = computed(() =>
  expedientes.value.find((e) => e.id_expediente === idExpediente.value),
)
const tiposDisponibles = computed(() => expediente.value?.tipos_disponibles ?? [])
async function cargar() {
  try {
    const { data } = await api.get('/secretaria/resoluciones/opciones')
    expedientes.value = data.expedientes
    tipos.value = data.tipos
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'No se pudieron cargar los expedientes.'
  } finally {
    cargando.value = false
  }
}
function seleccionarArchivo(event: Event) {
  archivo.value = (event.target as HTMLInputElement).files?.[0] ?? null
}
function mensajeError(e: any) {
  const errores = e.response?.data?.errors
  return (
    e.response?.data?.message ??
    (errores ? Object.values(errores).flat().join(' ') : 'No se pudo registrar la resolución.')
  )
}
async function guardar() {
  if (!idExpediente.value || !tipo.value || !numero.value || !fecha.value || !archivo.value) {
    error.value = 'Complete todos los campos y seleccione un PDF.'
    return
  }
  if (tipo.value === 'designacion_jurados' && !expediente.value?.id_designacion_propuesta) {
    error.value = 'Este expediente todavía no tiene una terna propuesta por UDI.'
    return
  }
  guardando.value = true
  error.value = ''
  try {
    const form = new FormData()
    form.append('id_expediente', String(idExpediente.value))
    form.append('tipo_resolucion', tipo.value)
    form.append('numero_resolucion', numero.value)
    form.append('fecha_emision', fecha.value)
    form.append('archivo_pdf', archivo.value)
    if (expediente.value?.id_designacion_propuesta)
      form.append('id_designacion', String(expediente.value.id_designacion_propuesta))
    await api.post('/secretaria/resoluciones', form)
    router.push({ name: 'secretaria-resoluciones' })
  } catch (e: any) {
    error.value = mensajeError(e)
  } finally {
    guardando.value = false
  }
}
onMounted(cargar)
</script>

<template>
  <div class="max-w-4xl mx-auto py-10">
    <div class="flex items-center gap-4 mb-8">
      <button class="p-2 rounded-full hover:bg-surface-container group" @click="router.back()">
        <span class="material-symbols-outlined text-primary group-active:scale-90">arrow_back</span>
      </button>
      <h2 class="font-headline-lg text-headline-lg text-primary">Subir Resolución</h2>
    </div>
    <form
      class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden"
      @submit.prevent="guardar"
    >
      <div class="bg-surface-container-low px-6 py-4 border-b border-outline-variant/30">
        <h3 class="font-headline-sm text-headline-sm text-primary">Detalles del Documento</h3>
      </div>
      <div class="p-6 space-y-8">
        <div v-if="error" class="rounded-xl bg-error-container p-4 text-error">{{ error }}</div>
        <div class="space-y-3">
          <label class="text-xs text-outline uppercase tracking-wider">Tipo de Carga</label>
          <div class="flex flex-col gap-3 sm:flex-row sm:gap-6">
            <label class="flex items-center gap-3"
              ><input checked type="radio" class="accent-primary" name="carga" /><span
                >Carga Única</span
              ></label
            ><label
              class="flex items-center gap-3 text-outline cursor-not-allowed"
              title="Disponible próximamente"
              ><input disabled type="radio" name="carga" /><span>Carga Masiva</span></label
            >
          </div>
        </div>
        <div class="space-y-2">
          <label class="text-xs text-outline uppercase tracking-wider">Expediente</label
          ><select
            v-model="idExpediente"
            :disabled="cargando"
            class="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            @change="tipo = ''"
          >
            <option :value="null">Selecciona el expediente destinatario</option>
            <option v-for="e in expedientes" :key="e.id_expediente" :value="e.id_expediente">
              {{ e.codigo }} — {{ e.tesista }}
            </option>
          </select>
        </div>
        <div class="space-y-2">
          <label class="text-xs text-outline uppercase tracking-wider">Tipo de resolución</label
          ><select
            v-model="tipo"
            :disabled="!idExpediente"
            class="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option value="">Selecciona el tipo de resolución</option>
            <option v-for="codigo in tiposDisponibles" :key="codigo" :value="codigo">
              {{ tipos[codigo] }}
            </option>
          </select>
          <p
            v-if="tipo === 'designacion_jurados' && !expediente?.id_designacion_propuesta"
            class="text-sm text-error"
          >
            UDI debe registrar primero la propuesta de terna.
          </p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label class="text-xs text-outline uppercase tracking-wider">Número de resolución</label
            ><input
              v-model.trim="numero"
              maxlength="50"
              class="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="Ej. RES-DEC-2026-001"
            />
          </div>
          <div class="space-y-2">
            <label class="text-xs text-outline uppercase tracking-wider">Fecha de emisión</label
            ><input
              v-model="fecha"
              type="date"
              class="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>
        <div class="space-y-2">
          <label class="text-xs text-outline uppercase tracking-wider">Seleccionar Archivo</label
          ><label
            class="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-outline-variant/60 p-5 hover:bg-surface-container/50 sm:p-10"
            ><div
              class="w-16 h-16 rounded-full bg-secondary-container/30 flex items-center justify-center"
            >
              <span class="material-symbols-outlined text-secondary text-4xl">cloud_upload</span>
            </div>
            <div class="text-center">
              <p class="font-headline-sm text-on-surface">
                {{ archivo?.name ?? 'Arrastra y suelta tu archivo aquí' }}
              </p>
              <p class="text-on-surface-variant">o haz clic para explorar tus carpetas</p>
            </div>
            <p class="text-xs text-outline">Formato permitido: PDF (Máx. 30 MB)</p>
            <input
              type="file"
              accept="application/pdf,.pdf"
              class="hidden"
              @change="seleccionarArchivo"
          /></label>
          <div
            v-if="archivo"
            class="flex items-center gap-3 p-3 bg-secondary-container/20 rounded-lg border border-secondary/20"
          >
            <span class="material-symbols-outlined text-secondary">description</span
            ><span class="flex-1 truncate">{{ archivo.name }}</span
            ><button type="button" class="text-error p-1" @click="archivo = null">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      </div>
      <div
        class="flex flex-col-reverse justify-end gap-3 border-t border-outline-variant/30 bg-surface-container-low px-4 py-5 sm:flex-row sm:gap-4 sm:px-6 sm:py-6"
      >
        <button
          type="button"
          class="w-full rounded-xl border border-secondary px-8 py-3 font-bold text-secondary hover:bg-secondary-container/10 sm:w-auto"
          @click="router.back()"
        >
          Cancelar</button
        ><button
          :disabled="guardando"
          class="w-full rounded-xl bg-primary-container px-10 py-3 font-bold text-white hover:brightness-110 disabled:opacity-50 sm:w-auto"
        >
          {{ guardando ? 'Guardando...' : 'Aceptar' }}
        </button>
      </div>
    </form>
  </div>
</template>
