<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

interface MetricasDashboard {
  expedientes_totales: number
  expedientes_procesados: number
  porcentaje_procesados: number
  jurados_asignados: number
  resoluciones_pendientes: number
  recien_recibidos: number
  devueltos_udi: number
  listos_para_jurados: number
}

interface ExpedienteBandeja {
  id: number
  codigo: string
  interesado: string
  tramite: string
  fecha: string
  estado: string
  estado_codigo: string
}

interface DashboardResponse {
  metricas: MetricasDashboard
  bandejas: {
    recien_recibidos: ExpedienteBandeja[]
    devueltos_udi: ExpedienteBandeja[]
    listos_para_jurados: ExpedienteBandeja[]
  }
}

const router = useRouter()
const cargando = ref(true)
const error = ref('')
const metricas = ref<MetricasDashboard>({
  expedientes_totales: 0,
  expedientes_procesados: 0,
  porcentaje_procesados: 0,
  jurados_asignados: 0,
  resoluciones_pendientes: 0,
  recien_recibidos: 0,
  devueltos_udi: 0,
  listos_para_jurados: 0,
})
const recienRecibidos = ref<ExpedienteBandeja[]>([])
const devueltosUdi = ref<ExpedienteBandeja[]>([])
const listosParaJurados = ref<ExpedienteBandeja[]>([])

function formatearFecha(fecha: string) {
  const valor = new Date(fecha)
  return Number.isNaN(valor.getTime())
    ? 'Sin fecha'
    : new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(valor)
}

async function cargarDashboard() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<DashboardResponse>('/decanatura/dashboard')
    metricas.value = data.metricas
    recienRecibidos.value = data.bandejas.recien_recibidos
    devueltosUdi.value = data.bandejas.devueltos_udi
    listosParaJurados.value = data.bandejas.listos_para_jurados
  } catch {
    error.value = 'No se pudieron cargar las bandejas de Decanatura. Inténtelo nuevamente.'
  } finally {
    cargando.value = false
  }
}

function revisarIngreso(id: number) {
  router.push({ name: 'decanatura-expediente-revision', params: { id } })
}

function revisarRetorno(id: number) {
  router.push({ name: 'decanatura-asignacion-individual', params: { id } })
}

function designarJurados(id: number) {
  router.push({ name: 'decanatura-asignacion-individual', params: { id } })
}

onMounted(cargarDashboard)
</script>

<template>
  <section class="space-y-6">
    <header>
      <p class="text-sm font-bold uppercase tracking-wider text-secondary">Panel de trabajo</p>
      <h1 class="mt-1 text-2xl font-bold text-primary sm:text-3xl">Decanatura</h1>
      <p class="mt-1 text-on-surface-variant">
        Expedientes separados según su procedencia y el siguiente paso del flujo.
      </p>
    </header>

    <div v-if="error" class="rounded-xl border border-error/30 bg-error-container px-4 py-3 text-on-error-container">
      {{ error }}
      <button class="ml-2 font-bold underline" type="button" @click="cargarDashboard">Reintentar</button>
    </div>

    <div class="grid gap-4 md:grid-cols-3" :class="{ 'opacity-60': cargando }">
      <article class="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary p-5 text-on-primary shadow-md">
        <div class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"></div>
        <div class="relative flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-bold uppercase tracking-wide opacity-80">Llegaron del tesista</p>
            <p class="mt-2 text-4xl font-bold">{{ metricas.recien_recibidos }}</p>
            <p class="mt-2 text-sm opacity-90">Pendientes del primer filtro y envío a UDI.</p>
          </div>
          <span class="material-symbols-outlined rounded-xl bg-white/15 p-3 text-3xl">mark_email_unread</span>
        </div>
      </article>

      <article class="relative overflow-hidden rounded-2xl border border-secondary/25 bg-secondary-container p-5 text-on-secondary-container shadow-md">
        <div class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-secondary/10"></div>
        <div class="relative flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-bold uppercase tracking-wide">Devueltos por UDI</p>
            <p class="mt-2 text-4xl font-bold text-secondary">{{ metricas.devueltos_udi }}</p>
            <p class="mt-2 text-sm">Revisados por UDI y listos para continuar hacia Secretaría Académica.</p>
          </div>
          <span class="material-symbols-outlined rounded-xl bg-secondary/10 p-3 text-3xl text-secondary">assignment_returned</span>
        </div>
      </article>

      <article class="relative overflow-hidden rounded-2xl border border-tertiary/25 bg-tertiary-container p-5 text-on-tertiary-container shadow-md">
        <div class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-tertiary/10"></div>
        <div class="relative flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-bold uppercase tracking-wide">Listos para jurados</p>
            <p class="mt-2 text-4xl font-bold text-tertiary">{{ metricas.listos_para_jurados }}</p>
            <p class="mt-2 text-sm">Con resolución registrada, pendientes del envío final a los jurados.</p>
          </div>
          <span class="material-symbols-outlined rounded-xl bg-tertiary/10 p-3 text-3xl text-tertiary">groups</span>
        </div>
      </article>
    </div>

    <div class="grid items-start gap-6 xl:grid-cols-3">
      <article class="overflow-hidden rounded-2xl border border-primary/20 bg-surface-container-lowest shadow-sm">
        <header class="border-b border-primary/15 bg-primary/5 p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="flex gap-3">
              <span class="material-symbols-outlined rounded-xl bg-primary p-2.5 text-on-primary">inbox</span>
              <div>
                <h2 class="text-lg font-bold text-primary">1. Recién recibidos</h2>
                <p class="text-sm text-on-surface-variant">Enviados recientemente por los tesistas.</p>
              </div>
            </div>
            <span class="rounded-full bg-primary px-3 py-1 text-xs font-bold text-on-primary">{{ metricas.recien_recibidos }}</span>
          </div>
          <div class="mt-4 flex items-center gap-2 rounded-xl border border-primary/15 bg-surface p-3 text-sm text-on-surface-variant">
            <span class="material-symbols-outlined text-primary">route</span>
            Tesista → <strong class="text-primary">Decanatura</strong> → UDI
          </div>
        </header>

        <div v-if="cargando" class="p-10 text-center text-on-surface-variant">Cargando expedientes...</div>
        <div v-else-if="recienRecibidos.length === 0" class="p-10 text-center">
          <span class="material-symbols-outlined text-4xl text-outline">inbox</span>
          <p class="mt-2 font-bold text-primary">No hay ingresos pendientes</p>
          <p class="text-sm text-on-surface-variant">Los nuevos envíos aparecerán en esta sección.</p>
        </div>
        <ul v-else class="divide-y divide-outline-variant/25">
          <li v-for="expediente in recienRecibidos" :key="expediente.id" class="p-5 hover:bg-primary/5">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <strong class="text-primary">{{ expediente.codigo }}</strong>
                  <span class="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase text-primary">Nuevo ingreso</span>
                </div>
                <p class="mt-2 font-semibold">{{ expediente.interesado }}</p>
                <p class="mt-1 text-xs text-on-surface-variant">{{ formatearFecha(expediente.fecha) }}</p>
              </div>
              <button type="button" class="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary hover:opacity-90" @click="revisarIngreso(expediente.id)">Revisar y enviar a UDI</button>
            </div>
          </li>
        </ul>
        <footer class="border-t border-outline-variant/25 bg-surface-container-low p-4 text-right">
          <button type="button" class="font-bold text-primary hover:underline" @click="router.push({ name: 'decanatura-expedientes-pendientes' })">Ver toda la bandeja →</button>
        </footer>
      </article>

      <article class="overflow-hidden rounded-2xl border border-secondary/25 bg-surface-container-lowest shadow-sm">
        <header class="border-b border-secondary/15 bg-secondary-container/35 p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="flex gap-3">
              <span class="material-symbols-outlined rounded-xl bg-secondary p-2.5 text-on-secondary">task_alt</span>
              <div>
                <h2 class="text-lg font-bold text-secondary">2. Revisados por UDI</h2>
                <p class="text-sm text-on-surface-variant">UDI terminó la revisión y devolvió el expediente.</p>
              </div>
            </div>
            <span class="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-on-secondary">{{ metricas.devueltos_udi }}</span>
          </div>
          <div class="mt-4 flex items-center gap-2 rounded-xl border border-secondary/15 bg-surface p-3 text-sm text-on-surface-variant">
            <span class="material-symbols-outlined text-secondary">route</span>
            UDI → <strong class="text-secondary">Decanatura</strong> → Secretaría Académica
          </div>
        </header>

        <div v-if="cargando" class="p-10 text-center text-on-surface-variant">Cargando expedientes...</div>
        <div v-else-if="devueltosUdi.length === 0" class="p-10 text-center">
          <span class="material-symbols-outlined text-4xl text-outline">fact_check</span>
          <p class="mt-2 font-bold text-secondary">No hay devoluciones de UDI</p>
          <p class="text-sm text-on-surface-variant">Los expedientes conformes aparecerán aquí.</p>
        </div>
        <ul v-else class="divide-y divide-outline-variant/25">
          <li v-for="expediente in devueltosUdi" :key="expediente.id" class="p-5 hover:bg-secondary-container/20">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <strong class="text-secondary">{{ expediente.codigo }}</strong>
                  <span class="rounded-full bg-secondary-container px-2.5 py-1 text-[11px] font-bold uppercase text-on-secondary-container">Revisión UDI completa</span>
                </div>
                <p class="mt-2 font-semibold">{{ expediente.interesado }}</p>
                <p class="mt-1 text-xs text-on-surface-variant">{{ formatearFecha(expediente.fecha) }}</p>
              </div>
              <button type="button" class="shrink-0 rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold text-on-secondary hover:opacity-90" @click="revisarRetorno(expediente.id)">Revisar retorno</button>
            </div>
          </li>
        </ul>
      </article>

      <article class="overflow-hidden rounded-2xl border border-tertiary/25 bg-surface-container-lowest shadow-sm">
        <header class="border-b border-tertiary/15 bg-tertiary-container/35 p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="flex gap-3">
              <span class="material-symbols-outlined rounded-xl bg-tertiary p-2.5 text-on-tertiary">groups</span>
              <div>
                <h2 class="text-lg font-bold text-tertiary">3. Designar jurados</h2>
                <p class="text-sm text-on-surface-variant">Secretaría ya registró la resolución de designación.</p>
              </div>
            </div>
            <span class="rounded-full bg-tertiary px-3 py-1 text-xs font-bold text-on-tertiary">{{ metricas.listos_para_jurados }}</span>
          </div>
          <div class="mt-4 flex items-center gap-2 rounded-xl border border-tertiary/15 bg-surface p-3 text-sm text-on-surface-variant">
            <span class="material-symbols-outlined text-tertiary">route</span>
            Secretaría Académica → <strong class="text-tertiary">Decanatura</strong> → Jurados
          </div>
        </header>

        <div v-if="cargando" class="p-10 text-center text-on-surface-variant">Cargando expedientes...</div>
        <div v-else-if="listosParaJurados.length === 0" class="p-10 text-center">
          <span class="material-symbols-outlined text-4xl text-outline">group_off</span>
          <p class="mt-2 font-bold text-tertiary">No hay designaciones pendientes</p>
          <p class="text-sm text-on-surface-variant">Aparecerán cuando Secretaría registre la resolución.</p>
        </div>
        <ul v-else class="divide-y divide-outline-variant/25">
          <li v-for="expediente in listosParaJurados" :key="expediente.id" class="p-5 hover:bg-tertiary-container/20">
            <div class="flex flex-col gap-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <strong class="text-tertiary">{{ expediente.codigo }}</strong>
                  <span class="rounded-full bg-tertiary-container px-2.5 py-1 text-[11px] font-bold uppercase text-on-tertiary-container">Resolución registrada</span>
                </div>
                <p class="mt-2 font-semibold">{{ expediente.interesado }}</p>
                <p class="mt-1 text-xs text-on-surface-variant">{{ formatearFecha(expediente.fecha) }}</p>
              </div>
              <button type="button" class="w-full rounded-xl bg-tertiary px-4 py-2.5 text-sm font-bold text-on-tertiary hover:opacity-90" @click="designarJurados(expediente.id)">
                Revisar y designar jurados
              </button>
            </div>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>
