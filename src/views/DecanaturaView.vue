<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import api from '@/services/api'

interface MetricasDashboard {
  expedientes_totales: number
  expedientes_procesados: number
  porcentaje_procesados: number
  jurados_asignados: number
  resoluciones_pendientes: number
}

interface ActividadReciente {
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
  actividad_reciente: ActividadReciente[]
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
})
const expedientes = ref<ActividadReciente[]>([])

const juradosAdicionales = computed(() => Math.max(metricas.value.jurados_asignados - 2, 0))

function formatearNumero(valor: number) {
  return new Intl.NumberFormat('es-PE').format(valor)
}

function formatearFecha(fecha: string) {
  if (!fecha) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(fecha))
}

function claseEstado(codigo: string) {
  if (['observado', 'improcedente'].includes(codigo)) return 'error'
  if (['proyecto_aprobado', 'tesis_final_aprobada', 'cerrado', 'archivado'].includes(codigo))
    return 'secondary'
  return 'primary'
}

async function cargarDashboard() {
  cargando.value = true
  error.value = ''

  try {
    const { data } = await api.get<DashboardResponse>('/decanatura/dashboard')
    metricas.value = data.metricas
    expedientes.value = data.actividad_reciente
  } catch {
    error.value = 'No se pudieron cargar los datos del panel. Inténtalo nuevamente.'
  } finally {
    cargando.value = false
  }
}

function verExpedientes() {
  router.push({ name: 'expedientes' })
}

onMounted(cargarDashboard)
</script>

<template>
  <div class="deca-main">
    <header class="deca-header">
      <h1>Decanatura</h1>
      <p>Panel principal — gestión de formatos y asignación de jurados</p>
    </header>

    <div
      v-if="error"
      class="mb-4 rounded-xl border border-status-error/30 bg-error-container px-4 py-3 text-status-error"
    >
      {{ error }}
      <button class="ml-2 font-bold underline" type="button" @click="cargarDashboard">
        Reintentar
      </button>
    </div>

    <div class="grid grid-cols-12 gap-5" :class="{ 'opacity-60': cargando }" aria-live="polite">
      <div
        class="col-span-12 md:col-span-6 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-card-padding shadow-sm hover:shadow-md transition-shadow"
      >
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-secondary-container/30 rounded-lg text-secondary">
            <span class="material-symbols-outlined">folder_open</span>
          </div>
          <span class="text-status-success font-label-md bg-status-success/10 px-2 py-1 rounded"
            >{{ metricas.porcentaje_procesados }}%</span
          >
        </div>
        <div class="font-label-md text-on-surface-variant uppercase tracking-wider">
          Expedientes Totales
        </div>
        <div class="font-headline-lg text-headline-lg text-primary mt-1">
          {{ formatearNumero(metricas.expedientes_totales) }}
        </div>
        <div class="mt-4 h-1 bg-surface-variant rounded-full overflow-hidden">
          <div
            class="h-full bg-secondary"
            :style="{ width: `${metricas.porcentaje_procesados}%` }"
          ></div>
        </div>
        <div class="font-label-sm text-on-surface-variant mt-2">
          {{ metricas.porcentaje_procesados }}% procesados satisfactoriamente
        </div>
      </div>

      <div
        class="col-span-12 md:col-span-6 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-card-padding shadow-sm hover:shadow-md transition-shadow"
      >
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-primary-container/10 rounded-lg text-primary">
            <span class="material-symbols-outlined">group</span>
          </div>
          <span class="text-on-surface-variant font-label-md bg-surface-variant px-2 py-1 rounded"
            >Actual</span
          >
        </div>
        <div class="font-label-md text-on-surface-variant uppercase tracking-wider">
          Jurados Asignados
        </div>
        <div class="font-headline-lg text-headline-lg text-primary mt-1">
          {{ formatearNumero(metricas.jurados_asignados) }}
        </div>
        <div v-if="metricas.jurados_asignados" class="flex -space-x-2 mt-5">
          <img
            class="w-8 h-8 rounded-full border-2 border-white"
            src="/logo2.jpeg"
            alt="Jurado asignado"
          />
          <img
            v-if="metricas.jurados_asignados > 1"
            class="w-8 h-8 rounded-full border-2 border-white"
            src="/fce-logo.png"
            alt="Jurado asignado"
          />
          <div
            v-if="juradosAdicionales"
            class="w-8 h-8 rounded-full border-2 border-white bg-primary-fixed-dim flex items-center justify-center text-[10px] font-bold text-primary"
          >
            +{{ juradosAdicionales }}
          </div>
        </div>
      </div>

      <div
        class="col-span-12 bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm"
      >
        <div
          class="px-card-padding py-4 border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center"
        >
          <h3 class="font-headline-sm text-headline-sm text-primary">Actividad Reciente</h3>
          <button
            class="text-primary font-label-md hover:underline"
            type="button"
            @click="verExpedientes"
          >
            Ver todo
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-surface-variant/30 text-on-surface-variant font-label-sm uppercase">
              <tr>
                <th class="px-6 py-3">Expediente</th>
                <th class="px-6 py-3">Interesado</th>
                <th class="px-6 py-3">Tipo de Trámite</th>
                <th class="px-6 py-3">Fecha</th>
                <th class="px-6 py-3">Estado</th>
                <th class="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/20">
              <tr
                v-for="exp in expedientes"
                :key="exp.id"
                class="hover:bg-surface-container transition-colors"
              >
                <td class="px-6 py-4 font-label-md">{{ exp.codigo }}</td>
                <td class="px-6 py-4">{{ exp.interesado }}</td>
                <td class="px-6 py-4 text-on-surface-variant">{{ exp.tramite }}</td>
                <td class="px-6 py-4 text-on-surface-variant">{{ formatearFecha(exp.fecha) }}</td>
                <td class="px-6 py-4">
                  <span
                    v-if="claseEstado(exp.estado_codigo) === 'secondary'"
                    class="bg-secondary-container text-on-secondary-container px-2 py-1 rounded-full text-[10px] font-bold uppercase"
                    >{{ exp.estado }}</span
                  >
                  <span
                    v-else-if="claseEstado(exp.estado_codigo) === 'primary'"
                    class="bg-primary-fixed-dim text-primary px-2 py-1 rounded-full text-[10px] font-bold uppercase"
                    >{{ exp.estado }}</span
                  >
                  <span
                    v-else
                    class="bg-error-container text-on-error-container px-2 py-1 rounded-full text-[10px] font-bold uppercase"
                    >{{ exp.estado }}</span
                  >
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    class="material-symbols-outlined text-outline hover:text-primary transition-colors"
                    type="button"
                    @click="verExpedientes"
                  >
                    more_vert
                  </button>
                </td>
              </tr>
              <tr v-if="!cargando && expedientes.length === 0">
                <td colspan="6" class="px-6 py-8 text-center text-on-surface-variant">
                  No hay expedientes registrados todavía.
                </td>
              </tr>
              <tr v-if="cargando">
                <td colspan="6" class="px-6 py-8 text-center text-on-surface-variant">
                  Cargando información...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deca-main {
  background: transparent;
}
.deca-header {
  margin-bottom: 1rem;
}
.deca-header h1 {
  margin: 0;
  color: #0f2359;
  font-family: 'Hanken Grotesk', sans-serif;
}
.deca-header p {
  margin: 0;
  color: #45464f;
  font-size: 0.9rem;
}
</style>
