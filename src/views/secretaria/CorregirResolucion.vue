<script setup lang="ts">
import { ref } from 'vue'

type ResultItem = { id: string; titulo: string; archivo: string; tamano: string; fecha: string }
const results = ref<ResultItem[]>([
  { id: 'RES-DEC-2024-045', titulo: 'Aprobación de Proyecto de Tesis: "Sistemas Distribuidos"', archivo: 'RES-DEC-2024-045_Sistemas_Distribuidos.pdf', tamano: '2.4', fecha: '12 Oct, 2024' },
  { id: 'RES-DEC-2024-044', titulo: 'Designación de Jurados de Sustentación', archivo: 'RES-DEC-2024-044_Jurados.pdf', tamano: '1.1', fecha: '10 Oct, 2024' },
])

const editing = ref<ResultItem | null>(null)
</script>

<template>
  <div class="max-w-container-max-width mx-auto p-gutter pb-24">
    <div class="flex items-center gap-4 mb-6">
      <span class="material-symbols-outlined text-primary">edit_document</span>
      <h2 class="font-headline-lg text-headline-lg text-primary">Corrección de Subidas</h2>
    </div>

    <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm mb-6">
      <div class="bg-surface-container-low px-card-padding py-4 border-b border-outline-variant/30 flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-primary-container text-white flex items-center justify-center font-label-sm text-label-sm font-bold">1</span>
        <h3 class="font-headline-sm text-headline-sm text-primary">Selecciona la resolución a corregir</h3>
      </div>
      <div class="p-card-padding">
        <div class="space-y-2 mb-4">
          <input class="w-full pl-4 pr-4 py-3 bg-white border border-outline-variant/30 rounded-full" placeholder="Buscar por número o título..." />
        </div>
        <div class="divide-y divide-outline-variant/20 rounded-xl overflow-hidden">
          <button v-for="r in results" :key="r.id" class="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-surface-container-low transition-colors" @click="editing = r">
            <div>
              <p class="font-label-md text-label-md font-bold text-primary">{{ r.id }}</p>
              <p class="font-label-sm text-label-sm text-on-surface-variant">{{ r.titulo }}</p>
            </div>
            <span class="material-symbols-outlined text-outline">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="editing" class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
      <div class="bg-surface-container-low px-card-padding py-4 border-b border-outline-variant/30 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-primary-container text-white flex items-center justify-center font-label-sm text-label-sm font-bold">2</span>
          <h3 class="font-headline-sm text-headline-sm text-primary">Corrige los datos</h3>
        </div>
        <button class="font-label-sm text-primary" @click="editing = null">Elegir otra resolución</button>
      </div>
      <div class="p-card-padding space-y-6">
        <div class="bg-warning-container/40 border border-warning/30 rounded-xl p-4">
          <p><strong>Editando:</strong> {{ editing.id }} — subida el {{ editing.fecha }}</p>
        </div>

        <div>
          <label class="font-label-md text-label-md text-outline uppercase tracking-wider">Título de la resolución</label>
          <input class="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest" v-model="editing.titulo" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="font-label-md text-label-md text-outline uppercase tracking-wider">Tipo de resolución</label>
            <select class="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest">
              <option>Resolución de Decanato</option>
              <option>Designación de Jurado</option>
            </select>
          </div>
          <div>
            <label class="font-label-md text-label-md text-outline uppercase tracking-wider">Destinatario</label>
            <select class="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest">
              <option>Estudiante</option>
              <option>Docente</option>
            </select>
          </div>
        </div>

        <div>
          <label class="font-label-md text-label-md text-outline uppercase tracking-wider">Archivo actual</label>
          <div class="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
            <span class="material-symbols-outlined text-primary">description</span>
            <div class="flex-1 min-w-0">
              <p class="font-label-md font-bold truncate">{{ editing.archivo }}</p>
              <p class="font-label-sm text-on-surface-variant">{{ editing.tamano }} MB · Subido el {{ editing.fecha }}</p>
            </div>
            <button class="px-4 py-2 rounded-lg border border-primary text-primary">Reemplazar archivo</button>
          </div>
        </div>

        <div class="flex justify-end gap-4">
          <button class="px-6 py-2 rounded-lg border border-outline-variant">Cancelar</button>
          <button class="px-6 py-2 rounded-lg bg-primary-container text-white">Guardar cambios</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.p-card-padding { padding: 1.5rem; }
</style>
