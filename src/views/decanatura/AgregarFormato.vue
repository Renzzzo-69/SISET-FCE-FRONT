<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()
const nombre = ref('')
const descripcion = ref('')
const version = ref('1.0')
const archivo = ref<File | null>(null)
const guardando = ref(false)
const error = ref('')

function seleccionar(event: Event) {
  archivo.value = (event.target as HTMLInputElement).files?.[0] ?? null
}
async function guardar() {
  if (!archivo.value) {
    error.value = 'Seleccione un archivo PDF, Word o Excel.'
    return
  }
  guardando.value = true
  error.value = ''
  try {
    const datos = new FormData()
    datos.append('nombre', nombre.value)
    datos.append('descripcion', descripcion.value)
    datos.append('version', version.value)
    datos.append('archivo', archivo.value)
    await api.post('/decanatura/formatos', datos)
    await router.push({ name: 'decanatura-documentos' })
  } catch (e: any) {
    const errores = e.response?.data?.errors
    error.value =
      e.response?.data?.message ??
      (errores ? Object.values(errores).flat().join(' ') : 'No se pudo registrar el formato.')
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl py-4 sm:py-8">
    <div class="mb-7 flex items-center gap-3">
      <button
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
        type="button"
        aria-label="Volver"
        @click="router.back()"
      >
        <span class="material-symbols-outlined text-primary">arrow_back</span>
      </button>
      <div>
        <h2 class="font-headline-lg text-headline-lg text-primary">Agregar Formato Oficial</h2>
        <p class="text-sm text-on-surface-variant">
          Registre una nueva plantilla o documento institucional.
        </p>
      </div>
    </div>
    <form
      class="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm"
      @submit.prevent="guardar"
    >
      <header class="border-b border-outline-variant/30 bg-surface-container-low px-4 py-4 sm:px-6">
        <h3 class="font-headline-sm text-primary">Información del formato</h3>
      </header>
      <div class="space-y-6 p-4 sm:p-6">
        <div v-if="error" class="rounded-xl bg-error-container p-4 text-error">{{ error }}</div>
        <label class="block space-y-2"
          ><span class="text-xs font-bold uppercase text-on-surface-variant"
            >Nombre del formato</span
          ><input
            v-model.trim="nombre"
            required
            maxlength="150"
            class="w-full rounded-lg border border-outline-variant bg-surface-container px-4 py-3"
            placeholder="Ej. Acta de sustentación"
        /></label>
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label class="block space-y-2"
            ><span class="text-xs font-bold uppercase text-on-surface-variant">Versión</span
            ><input
              v-model.trim="version"
              required
              maxlength="20"
              class="w-full rounded-lg border border-outline-variant bg-surface-container px-4 py-3"
              placeholder="1.0"
          /></label>
          <div class="space-y-2">
            <span class="text-xs font-bold uppercase text-on-surface-variant">Tipo permitido</span>
            <div
              class="rounded-lg border border-outline-variant bg-surface-container px-4 py-3 text-on-surface-variant"
            >
              PDF, Word o Excel
            </div>
          </div>
        </div>
        <label class="block space-y-2"
          ><span class="text-xs font-bold uppercase text-on-surface-variant">Descripción</span
          ><textarea
            v-model.trim="descripcion"
            maxlength="1000"
            rows="3"
            class="w-full resize-y rounded-lg border border-outline-variant bg-surface-container px-4 py-3"
            placeholder="Indique para qué se utiliza este formato"
          ></textarea>
        </label>
        <label
          class="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-outline-variant/50 bg-surface-container/30 p-6 text-center hover:border-primary/40 sm:p-10"
          ><input
            class="absolute inset-0 cursor-pointer opacity-0"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            @change="seleccionar"
          /><span class="material-symbols-outlined text-4xl text-primary">cloud_upload</span>
          <p class="font-semibold text-on-surface">
            {{ archivo?.name ?? 'Arrastre el archivo o haga clic para seleccionarlo' }}
          </p>
          <p class="text-xs text-on-surface-variant">Tamaño máximo: 30 MB</p></label
        >
      </div>
      <footer
        class="flex flex-col-reverse gap-3 border-t border-outline-variant/30 bg-surface-container-low px-4 py-5 sm:flex-row sm:justify-end sm:px-6"
      >
        <button
          class="w-full rounded-lg border border-primary/20 px-6 py-3 font-bold text-primary sm:w-auto"
          type="button"
          @click="router.back()"
        >
          Cancelar</button
        ><button
          :disabled="guardando"
          class="w-full rounded-lg bg-primary px-6 py-3 font-bold text-white disabled:opacity-50 sm:w-auto"
        >
          {{ guardando ? 'Guardando...' : 'Guardar formato' }}
        </button>
      </footer>
    </form>
  </div>
</template>
