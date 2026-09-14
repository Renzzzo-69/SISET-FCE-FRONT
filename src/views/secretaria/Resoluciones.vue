<script setup lang="ts">
// UI-only: Lista de resoluciones (mock data)
import { ref } from 'vue'

type Resolucion = { id: string; titulo: string; fecha: string; tipo: string }

const resoluciones = ref<Resolucion[]>([
  { id: 'RES-DEC-2024-045', titulo: 'Aprobación de Proyecto de Tesis: "Sistemas Distribuidos"', fecha: '12 Oct, 2024', tipo: 'Aprobación' },
  { id: 'RES-DEC-2024-044', titulo: 'Designación de Jurados de Sustentación', fecha: '10 Oct, 2024', tipo: 'Jurado' },
  { id: 'RES-DEC-2024-043', titulo: 'Autorización de Sustentación Presencial', fecha: '08 Oct, 2024', tipo: 'Sustentación' },
])
</script>

<template>
  <div class="max-w-container-max-width mx-auto p-gutter pb-24">
    <div class="flex items-center gap-4 mb-6">
      <button class="p-2 rounded-full hover:bg-surface-container transition-colors">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div>
        <h2 class="font-headline-lg text-headline-lg text-primary">Resoluciones</h2>
        <p class="text-on-surface-variant">Gestión de resoluciones subidas al sistema</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-surface-container-lowest p-card-padding rounded-xl border border-outline-variant/30 shadow-sm">
        <p class="font-label-md text-label-md text-on-surface-variant">Total Resoluciones</p>
        <h3 class="font-headline-md text-headline-md text-primary mt-1">1,248</h3>
      </div>
      <div class="bg-surface-container-lowest p-card-padding rounded-xl border border-outline-variant/30 shadow-sm">
        <p class="font-label-md text-label-md text-on-surface-variant">Emitidas este mes</p>
        <h3 class="font-headline-md text-headline-md text-primary mt-1">32</h3>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
      <div class="px-gutter py-4 border-b border-outline-variant/30 bg-surface-container-low/50 flex justify-between items-center">
        <h4 class="font-headline-sm text-headline-sm text-primary">Bandeja de Resoluciones</h4>
        <span class="font-label-sm text-label-sm text-on-surface-variant">Mostrando {{ resoluciones.length }} de 1,248</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-container-low/30">
              <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Título / Número</th>
              <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Fecha Emisión</th>
              <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant">Tipo</th>
              <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/20">
            <tr v-for="r in resoluciones" :key="r.id" class="hover:bg-surface-container-low transition-colors">
              <td class="px-6 py-4">
                <p class="font-label-md text-label-md font-bold text-primary">{{ r.id }}</p>
                <p class="font-label-sm text-label-sm text-on-surface-variant">{{ r.titulo }}</p>
              </td>
              <td class="px-6 py-4 font-body-md text-on-surface-variant">{{ r.fecha }}</td>
              <td class="px-6 py-4"><span class="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full font-label-sm text-label-sm">{{ r.tipo }}</span></td>
              <td class="px-6 py-4 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button class="p-2 text-primary hover:bg-primary-fixed rounded-lg transition-colors" title="Visualizar">
                    <span class="material-symbols-outlined text-[20px]">visibility</span>
                  </button>
                  <button class="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors" title="Editar">
                    <span class="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button class="p-2 text-error hover:bg-error-container rounded-lg transition-colors" title="Eliminar">
                    <span class="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.p-card-padding { padding: 1.5rem; }
</style>
