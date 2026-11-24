<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

type Notificacion = {
  id: number
  expediente: string
  tesistas: string
  tipo_resolucion: 'designacion_jurados' | 'aprobacion_proyecto'
  titulo: string
  mensaje: string
  prioridad: 'alta' | 'normal'
  fecha: string
  estado: string
}

const router = useRouter()
const cargando = ref(true)
const error = ref('')
const notificaciones = ref<Notificacion[]>([])

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get('/secretaria/resoluciones/notificaciones')
    notificaciones.value = data.notificaciones
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'No se pudieron cargar las notificaciones.'
  } finally {
    cargando.value = false
  }
}

function atender(item: Notificacion) {
  router.push({
    name: 'secretaria-subir-resolucion',
    query: { tipo: item.tipo_resolucion, expediente: String(item.id) },
  })
}

function fecha(valor: string) {
  return new Date(valor).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(cargar)
</script>

<template>
  <section class="mx-auto max-w-5xl pb-20">
    <header class="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="font-headline-lg text-headline-lg font-bold text-primary">Notificaciones</h2>
        <p class="mt-1 text-on-surface-variant">Tareas que requieren una resolución de Secretaría Académica.</p>
      </div>
      <span class="w-fit rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary">{{ notificaciones.length }} pendientes</span>
    </header>

    <div v-if="error" class="mb-5 rounded-xl border border-error/30 bg-error-container p-4 text-error">
      {{ error }} <button type="button" class="font-bold underline" @click="cargar">Reintentar</button>
    </div>
    <div v-if="cargando" class="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center text-on-surface-variant">Cargando notificaciones...</div>
    <div v-else-if="!notificaciones.length" class="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center shadow-sm">
      <span class="material-symbols-outlined text-5xl text-secondary">task_alt</span>
      <h3 class="mt-3 text-lg font-bold text-primary">No hay resoluciones pendientes</h3>
      <p class="mt-1 text-on-surface-variant">Las nuevas tareas aparecerán automáticamente aquí.</p>
    </div>
    <div v-else class="space-y-4">
      <article v-for="item in notificaciones" :key="`${item.tipo_resolucion}-${item.id}`" class="overflow-hidden rounded-2xl border bg-surface-container-lowest shadow-sm" :class="item.prioridad === 'alta' ? 'border-tertiary/35' : 'border-primary/25'">
        <div class="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 gap-4">
            <span class="material-symbols-outlined flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" :class="item.prioridad === 'alta' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-primary-fixed text-on-primary-fixed-variant'">{{ item.prioridad === 'alta' ? 'verified' : 'group_add' }}</span>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-bold text-primary">{{ item.titulo }}</h3>
                <span v-if="item.prioridad === 'alta'" class="rounded-full bg-error-container px-2.5 py-1 text-[11px] font-bold uppercase text-error">Atención requerida</span>
              </div>
              <p class="mt-1 text-sm text-on-surface-variant">{{ item.mensaje }}</p>
              <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <strong>{{ item.expediente }}</strong><span>{{ item.tesistas }}</span><span class="text-outline">{{ fecha(item.fecha) }}</span>
              </div>
            </div>
          </div>
          <button type="button" class="shrink-0 rounded-xl bg-primary-container px-5 py-3 font-bold text-white hover:bg-primary" @click="atender(item)">Subir resolución</button>
        </div>
      </article>
    </div>
  </section>
</template>
