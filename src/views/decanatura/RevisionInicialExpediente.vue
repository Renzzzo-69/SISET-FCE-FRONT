<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import api, { verDocumentoPrivado } from '@/services/api'
import type { ExpedienteDetalle, ExpedienteDetalleResponse, ParticipanteExpediente } from '@/types/api'

const route = useRoute()
const router = useRouter()
const detalle = ref<ExpedienteDetalle | null>(null)
const cargando = ref(true)
const procesando = ref(false)
const error = ref('')
const mensaje = ref('')
const confirmar = ref(false)
const confirmarDevolucion = ref(false)
const motivoDevolucion = ref('')
const id = computed(() => Number(route.params.id))
const proyecto = computed(() => detalle.value?.informes.find((informe) => informe.es_tesis === 0) ?? null)

function nombre(persona: ParticipanteExpediente | null | undefined) {
  return persona
    ? [persona.apellido_paterno, persona.apellido_materno, persona.nombres].filter(Boolean).join(' ')
    : 'No registrado'
}

function mensajeError(causa: unknown) {
  if (axios.isAxiosError(causa)) {
    return causa.response?.data?.message ?? 'No se pudo completar la operación.'
  }

  return causa instanceof Error ? causa.message : 'No se pudo completar la operación.'
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<ExpedienteDetalleResponse>(`/expedientes/${id.value}`)
    if (!data.data) throw new Error('El expediente no contiene información disponible.')
    detalle.value = data.data
    if (data.data.estado_actual?.codigo !== 'pendiente_derivacion') {
      error.value = 'Este expediente ya no se encuentra pendiente de revisión inicial.'
    }
  } catch (causa) {
    error.value = mensajeError(causa)
  } finally {
    cargando.value = false
  }
}

async function abrir(rutaApi: string | null, etiqueta: string) {
  if (!rutaApi) {
    error.value = `El ${etiqueta} no tiene un archivo disponible.`
    return
  }
  error.value = ''
  try {
    await verDocumentoPrivado(rutaApi)
  } catch (causa) {
    error.value = mensajeError(causa)
  }
}

async function derivar() {
  procesando.value = true
  error.value = ''
  try {
    await api.post(`/expedientes/${id.value}/derivacion-udi`)
    confirmar.value = false
    mensaje.value = 'Expediente derivado correctamente a UDI.'
    window.setTimeout(() => router.replace({ name: 'decanatura-expedientes-pendientes' }), 1200)
  } catch (causa) {
    confirmar.value = false
    error.value = mensajeError(causa)
  } finally {
    procesando.value = false
  }
}

async function devolver() {
  const motivo = motivoDevolucion.value.trim()
  if (motivo.length < 10) {
    error.value = 'Ingrese un motivo de devolución de al menos 10 caracteres.'
    return
  }

  procesando.value = true
  error.value = ''
  try {
    await api.post(`/expedientes/${id.value}/devolucion-tesista`, { motivo })
    confirmarDevolucion.value = false
    mensaje.value = 'Expediente devuelto al tesista para su corrección.'
    window.setTimeout(() => router.replace({ name: 'decanatura-expedientes-pendientes' }), 1200)
  } catch (causa) {
    error.value = mensajeError(causa)
  } finally {
    procesando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <section class="mx-auto w-full max-w-7xl space-y-5">
    <button type="button" class="inline-flex items-center gap-2 font-semibold text-primary hover:underline" @click="router.push({ name: 'decanatura-expedientes-pendientes' })">
      <span class="material-symbols-outlined">arrow_back</span> Volver a la bandeja
    </button>

    <div v-if="cargando" class="rounded-xl bg-surface-container-lowest p-12 text-center text-on-surface-variant">Cargando expediente...</div>
    <template v-else-if="detalle">
      <header class="rounded-2xl bg-primary p-5 text-on-primary shadow-md sm:p-7">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <p class="text-sm opacity-80">REVISIÓN INICIAL · DECANATURA</p>
            <h1 class="mt-1 break-words text-2xl font-bold">Expediente {{ detalle.cod_expediente }}</h1>
            <p class="mt-2 max-w-3xl opacity-90">Compruebe la solicitud y el informe de proyecto antes de enviarlos a revisión técnica de UDI.</p>
          </div>
          <span class="w-fit shrink-0 rounded-full bg-on-primary/15 px-4 py-2 text-sm font-bold">Pendiente de derivación</span>
        </div>
      </header>

      <div v-if="error" class="rounded-xl border border-error/30 bg-error-container p-4 text-on-error-container">{{ error }}</div>
      <div v-if="mensaje" class="rounded-xl border border-secondary/30 bg-secondary-container p-4 font-bold text-on-secondary-container">{{ mensaje }}</div>

      <div class="grid gap-5 lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,2fr)]">
        <article class="min-w-0 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
          <div class="mb-4 flex items-center gap-2 text-primary"><span class="material-symbols-outlined">group</span><h2 class="font-bold">Tesista(s)</h2></div>
          <div class="space-y-3">
            <div class="rounded-xl bg-surface-container-low p-4"><span class="text-xs font-bold uppercase text-on-surface-variant">Tesista principal</span><p class="mt-1 break-words font-semibold">{{ nombre(detalle.tesista_1) }}</p></div>
            <div v-if="detalle.tesista_2" class="rounded-xl bg-surface-container-low p-4"><span class="text-xs font-bold uppercase text-on-surface-variant">Segundo tesista</span><p class="mt-1 break-words font-semibold">{{ nombre(detalle.tesista_2) }}</p></div>
          </div>
          <dl class="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div><dt class="text-on-surface-variant">Versión</dt><dd class="font-bold">{{ detalle.version }}</dd></div>
            <div><dt class="text-on-surface-variant">Declaraciones</dt><dd class="break-words font-bold">{{ detalle.declaro_normativas && detalle.declaro_documentos_fieles ? 'Aceptadas' : 'Incompletas' }}</dd></div>
          </dl>
        </article>

        <article class="min-w-0 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
          <div class="mb-4 flex items-center gap-2 text-primary"><span class="material-symbols-outlined">folder_open</span><h2 class="font-bold">Documentos presentados</h2></div>
          <div class="space-y-3">
            <div class="flex flex-col gap-3 rounded-xl border border-outline-variant/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex min-w-0 items-center gap-3"><span class="material-symbols-outlined shrink-0 rounded-lg bg-primary-container p-2 text-primary">description</span><div class="min-w-0"><strong>Solicitud de inscripción</strong><p class="text-sm text-on-surface-variant">Documento presentado por el tesista</p></div></div>
              <button type="button" class="shrink-0 rounded-lg border border-primary px-4 py-2 font-bold text-primary disabled:opacity-40" :disabled="!detalle.solicitud_adjunta" @click="abrir(`/api/expedientes/${id}/documentos/solicitud`, 'documento de solicitud')">Visualizar</button>
            </div>
            <div class="flex flex-col gap-3 rounded-xl border border-outline-variant/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex min-w-0 items-center gap-3"><span class="material-symbols-outlined shrink-0 rounded-lg bg-secondary-container p-2 text-secondary">picture_as_pdf</span><div class="min-w-0"><strong class="block break-words">{{ proyecto?.titulo ?? 'Informe de proyecto' }}</strong><p class="text-sm text-on-surface-variant">Proyecto de investigación · versión {{ proyecto?.version ?? '-' }}</p></div></div>
              <button type="button" class="shrink-0 rounded-lg border border-primary px-4 py-2 font-bold text-primary disabled:opacity-40" :disabled="!proyecto?.archivo_adjunto" @click="abrir(proyecto ? `/api/expedientes/${id}/informes/${proyecto.id_informe_proyecto_tesis}/documento` : null, 'informe del proyecto')">Visualizar</button>
            </div>
            <div v-if="proyecto?.carta_aceptacion_asesor" class="flex flex-col gap-3 rounded-xl border border-outline-variant/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex min-w-0 items-center gap-3"><span class="material-symbols-outlined shrink-0 rounded-lg bg-surface-container-high p-2 text-primary">verified</span><div class="min-w-0"><strong>Carta de aceptación del asesor</strong><p class="text-sm text-on-surface-variant">Documento complementario</p></div></div>
              <button type="button" class="shrink-0 rounded-lg border border-primary px-4 py-2 font-bold text-primary" @click="abrir(`/api/expedientes/${id}/informes/${proyecto.id_informe_proyecto_tesis}/carta-aceptacion`, 'carta de aceptación')">Visualizar</button>
            </div>
          </div>
        </article>
      </div>

      <footer class="flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div><h2 class="font-bold text-primary">Primer filtro de Decanatura</h2><p class="text-sm text-on-surface-variant"></p></div>
        <div class="flex flex-col gap-3 sm:flex-row">
          <button type="button" class="inline-flex items-center justify-center gap-2 rounded-xl border border-error px-5 py-3 font-bold text-error hover:bg-error-container disabled:opacity-50" :disabled="procesando || !!mensaje || detalle.estado_actual?.codigo !== 'pendiente_derivacion'" @click="confirmarDevolucion = true"><span class="material-symbols-outlined">undo</span>Devolver al tesista</button>
          <button type="button" class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-on-primary disabled:opacity-50" :disabled="procesando || !!mensaje || detalle.estado_actual?.codigo !== 'pendiente_derivacion'" @click="confirmar = true"><span class="material-symbols-outlined">forward_to_inbox</span>Derivar a UDI</button>
        </div>
      </footer>
    </template>

    <div v-if="confirmar" class="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" @click.self="confirmar = false">
      <div class="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl"><span class="material-symbols-outlined mb-3 rounded-full bg-primary-container p-3 text-3xl text-primary">forward_to_inbox</span><h2 class="text-xl font-bold text-primary">¿Derivar expediente a UDI?</h2><p class="mt-2 text-on-surface-variant"></p><div class="mt-6 flex justify-end gap-3"><button type="button" class="rounded-lg px-4 py-2 font-bold" :disabled="procesando" @click="confirmar = false">Cancelar</button><button type="button" class="rounded-lg bg-primary px-4 py-2 font-bold text-on-primary" :disabled="procesando" @click="derivar">{{ procesando ? 'Derivando...' : 'Confirmar derivación' }}</button></div></div>
    </div>

    <div v-if="confirmarDevolucion" class="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" @click.self="confirmarDevolucion = false">
      <div class="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-2xl">
        <span class="material-symbols-outlined mb-3 rounded-full bg-error-container p-3 text-3xl text-error">assignment_return</span>
        <p class="text-xs font-bold uppercase tracking-wider text-error">Observaciones de devolución</p>
        <h2 class="mt-1 text-xl font-bold text-on-surface">Devolver expediente al tesista</h2>
        <label class="mt-5 block"><span class="mb-2 block text-sm font-bold">Observaciones <span class="text-error">*</span></span><textarea v-model="motivoDevolucion" rows="5" maxlength="1000" class="w-full resize-y rounded-xl border border-outline-variant bg-surface-container-low p-3 outline-none focus:border-error" placeholder=""></textarea><span class="mt-1 flex justify-between text-xs text-on-surface-variant"><span></span><span>{{ motivoDevolucion.length }}/1000</span></span></label>
        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" class="rounded-lg px-4 py-2 font-bold" :disabled="procesando" @click="confirmarDevolucion = false">Cancelar</button><button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-error px-4 py-2 font-bold text-on-error disabled:opacity-50" :disabled="procesando || motivoDevolucion.trim().length < 10" @click="devolver"><span class="material-symbols-outlined text-lg">send</span>{{ procesando ? 'Enviando...' : 'Enviar devolución' }}</button></div>
      </div>
    </div>
  </section>
</template>
