<script setup lang="ts">
import { ref } from 'vue'
import DecanaturaSidebar from '../components/DecanaturaSidebar.vue'

const expedientes = ref([
  { id: '#EXP-2023-0891', interesado: 'García Mendoza, Carlos', tipo: 'Grado de Bachiller', fecha: 'hace 2 horas', estado: 'PROCESADO', estadoBadge: 'secondary' },
  { id: '#EXP-2023-0902', interesado: 'Luna Rojas, Sofia', tipo: 'Título Profesional', fecha: 'hace 5 horas', estado: 'EN REVISIÓN', estadoBadge: 'primary' },
  { id: '#EXP-2023-0915', interesado: 'Perez Soto, Juan', tipo: 'Cambio de Facultad', fecha: 'Ayer', estado: 'OBSERVADO', estadoBadge: 'error' },
])

function accionMás(exp: { id: string }) {
  // placeholder for action menu
  // In real app show contextual menu or navigate to detail
  alert(`Acciones para ${exp.id}`)
}
</script>

<template>
  <div class="deca-layout">
    <DecanaturaSidebar />

    <main class="deca-main">
      <header class="deca-header">
        <h1>Decanatura</h1>
        <p>Panel principal — acciones de resolución y asignación</p>
      </header>

      <div class="grid grid-cols-12 gap-5">
        <!-- Metric Card: Expedientes -->
        <div class="col-span-12 md:col-span-4 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-card-padding shadow-sm hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start mb-4">
            <div class="p-2 bg-secondary-container/30 rounded-lg text-secondary"><span class="material-symbols-outlined">folder_open</span></div>
            <span class="text-status-success font-label-md bg-status-success/10 px-2 py-1 rounded">+12%</span>
          </div>
          <div class="font-label-md text-on-surface-variant uppercase tracking-wider">Expedientes Totales</div>
          <div class="font-headline-lg text-headline-lg text-primary mt-1">1,248</div>
          <div class="mt-4 h-1 bg-surface-variant rounded-full overflow-hidden"><div class="h-full bg-secondary w-3/4"></div></div>
          <div class="font-label-sm text-on-surface-variant mt-2">75% Procesados satisfactoriamente</div>
        </div>

        <!-- Metric Card: Jurados -->
        <div class="col-span-12 md:col-span-4 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-card-padding shadow-sm hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start mb-4">
            <div class="p-2 bg-primary-container/10 rounded-lg text-primary"><span class="material-symbols-outlined">group</span></div>
            <span class="text-on-surface-variant font-label-md bg-surface-variant px-2 py-1 rounded">Hoy</span>
          </div>
          <div class="font-label-md text-on-surface-variant uppercase tracking-wider">Jurados Asignados</div>
          <div class="font-headline-lg text-headline-lg text-primary mt-1">84</div>
          <div class="flex -space-x-2 mt-5">
            <img class="w-8 h-8 rounded-full border-2 border-white" src="/logo2.jpeg" alt="j1" />
            <img class="w-8 h-8 rounded-full border-2 border-white" src="/fce-logo.png" alt="j2" />
            <div class="w-8 h-8 rounded-full border-2 border-white bg-primary-fixed-dim flex items-center justify-center text-[10px] font-bold text-primary">+81</div>
          </div>
        </div>

        <!-- Metric Card: Resoluciones -->
        <div class="col-span-12 md:col-span-4 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-card-padding shadow-sm hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start mb-4">
            <div class="p-2 bg-error-container/30 rounded-lg text-status-error"><span class="material-symbols-outlined">pending_actions</span></div>
            <span class="text-status-error font-label-md bg-status-error/10 px-2 py-1 rounded">Urgente</span>
          </div>
          <div class="font-label-md text-on-surface-variant uppercase tracking-wider">Resoluciones Pendientes</div>
          <div class="font-headline-lg text-headline-lg text-status-error mt-1">16</div>
          <button class="mt-4 w-full border border-status-error text-status-error font-label-md py-2 rounded-xl hover:bg-status-error/5 transition-colors">Revisar Ahora</button>
        </div>

        <!-- Recent Transactions / List -->
        <div class="col-span-12 bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm">
          <div class="px-card-padding py-4 border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center">
            <h3 class="font-headline-sm text-headline-sm text-primary">Actividad Reciente</h3>
            <button class="text-primary font-label-md hover:underline">Ver todo</button>
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
                <tr v-for="exp in expedientes" :key="exp.id" class="hover:bg-surface-container transition-colors">
                  <td class="px-6 py-4 font-label-md">{{ exp.id }}</td>
                  <td class="px-6 py-4">{{ exp.interesado }}</td>
                  <td class="px-6 py-4 text-on-surface-variant">{{ exp.tipo }}</td>
                  <td class="px-6 py-4 text-on-surface-variant">{{ exp.fecha }}</td>
                  <td class="px-6 py-4">
                    <span v-if="exp.estadoBadge === 'secondary'" class="bg-secondary-container text-on-secondary-container px-2 py-1 rounded-full text-[10px] font-bold">{{ exp.estado }}</span>
                    <span v-else-if="exp.estadoBadge === 'primary'" class="bg-primary-fixed-dim text-primary px-2 py-1 rounded-full text-[10px] font-bold uppercase">{{ exp.estado }}</span>
                    <span v-else class="bg-error-container text-on-error-container px-2 py-1 rounded-full text-[10px] font-bold uppercase">{{ exp.estado }}</span>
                  </td>
                  <td class="px-6 py-4 text-right"><button class="material-symbols-outlined text-outline hover:text-primary transition-colors">more_vert</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.deca-layout{display:grid;grid-template-columns:260px 1fr;gap:1rem;align-items:start}
.deca-main{background:transparent}
.deca-header{margin-bottom:1rem}
.deca-header h1{margin:0;color:#0f2359;font-family:'Hanken Grotesk',sans-serif}
.deca-header p{margin:0;color:#45464f;font-size:0.9rem}
.deca-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:1rem;align-items:start}

@media (max-width: 900px){
  .deca-layout{grid-template-columns:1fr}
  .deca-sidebar{order:-1}
  .deca-grid{grid-template-columns:1fr}
}
</style>
