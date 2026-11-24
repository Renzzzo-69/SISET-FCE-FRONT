<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import type { Expediente, ParticipanteExpediente } from '@/types/api'

const router = useRouter()
const expedientes = ref<Expediente[]>([])
const cargando = ref(true)
const error = ref('')
const busqueda = ref('')

const filtrados = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase('es')
  if (!termino) return expedientes.value
  return expedientes.value.filter((expediente) =>
    [expediente.cod_expediente, nombre(expediente.tesista), nombre(expediente.co_tesista)]
      .join(' ')
      .toLocaleLowerCase('es')
      .includes(termino),
  )
})

function nombre(persona: ParticipanteExpediente | null) {
  return persona
    ? [persona.apellido_paterno, persona.apellido_materno, persona.nombres].filter(Boolean).join(' ')
    : ''
}

function interesados(expediente: Expediente) {
  return [nombre(expediente.tesista), nombre(expediente.co_tesista)].filter(Boolean).join(' / ')
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<Expediente[]>('/expedientes', {
      params: { etapa: 'registro_expediente_digital', estado: 'pendiente_derivacion' },
    })
    expedientes.value = data
  } catch {
    error.value = 'No se pudo cargar la bandeja inicial de Decanatura.'
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <section class="space-y-5">
    <button
      type="button"
      class="inline-flex items-center gap-2 font-semibold text-primary hover:underline"
      @click="router.push({ name: 'decanatura' })"
    >
      <span class="material-symbols-outlined">arrow_back</span>
      Volver al panel principal
    </button>

    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm font-semibold text-secondary">RECEPCIÓN DE EXPEDIENTES</p>
        <h1 class="mt-1 text-2xl font-bold text-primary sm:text-3xl">Solicitudes por revisar</h1>
        <p class="mt-1 text-on-surface-variant">Revise la solicitud y el proyecto antes de derivarlos a UDI.</p>
      </div>
      <div class="rounded-xl bg-primary px-4 py-3 text-on-primary shadow-sm">
        <span class="text-2xl font-bold">{{ expedientes.length }}</span>
        <span class="ml-2 text-sm">pendientes</span>
      </div>
    </header>

    <div v-if="error" class="rounded-xl border border-error/30 bg-error-container p-4 text-on-error-container">
      {{ error }}
      <button type="button" class="ml-2 font-bold underline" @click="cargar">Reintentar</button>
    </div>

    <div class="rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
      <div class="flex flex-col gap-3 border-b border-outline-variant/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-bold text-primary">Bandeja inicial</h2>
          <p class="text-sm text-on-surface-variant">Estado: pendiente de derivación</p>
        </div>
        <label class="relative block w-full sm:max-w-sm">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input v-model="busqueda" class="w-full rounded-xl border border-outline-variant bg-surface py-2.5 pl-11 pr-4 outline-none focus:border-primary" placeholder="Buscar expediente o tesista" />
        </label>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left">
          <thead class="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
            <tr><th class="px-5 py-3">Expediente</th><th class="px-5 py-3">Tesista(s)</th><th class="px-5 py-3">Documentos</th><th class="px-5 py-3">Estado</th><th class="px-5 py-3 text-right">Acción</th></tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/20">
            <tr v-for="expediente in filtrados" :key="expediente.id_expediente" class="hover:bg-surface-container-low">
              <td class="px-5 py-4 font-bold text-primary">{{ expediente.cod_expediente }}</td>
              <td class="px-5 py-4">{{ interesados(expediente) || 'Sin participantes' }}</td>
              <td class="px-5 py-4"><span class="inline-flex items-center gap-1 text-sm text-on-surface-variant"><span class="material-symbols-outlined text-lg">folder_open</span> Solicitud y proyecto</span></td>
              <td class="px-5 py-4"><span class="rounded-full bg-tertiary-container px-3 py-1 text-xs font-bold text-on-tertiary-container">Pendiente</span></td>
              <td class="px-5 py-4 text-right"><button type="button" class="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary hover:opacity-90" @click="router.push({ name: 'decanatura-expediente-revision', params: { id: expediente.id_expediente } })">Revisar expediente</button></td>
            </tr>
            <tr v-if="cargando"><td colspan="5" class="px-5 py-12 text-center text-on-surface-variant">Cargando expedientes...</td></tr>
            <tr v-else-if="filtrados.length === 0"><td colspan="5" class="px-5 py-12 text-center"><span class="material-symbols-outlined mb-2 block text-4xl text-outline">inbox</span><strong class="text-primary">No hay expedientes pendientes</strong><p class="mt-1 text-sm text-on-surface-variant">Los nuevos registros del tesista aparecerán aquí.</p></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
