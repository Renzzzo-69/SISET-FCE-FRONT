<script setup lang="ts">
import { ref } from 'vue'

const formatos = ref([
  { id: 1, title: 'Plantilla de Dictamen de Tesis', subtitle: 'v2.4 - Actualizado hace 2 días', icon: 'description', color: 'blue', format: 'Word .docx', status: 'Activo', statusType: 'active' },
  { id: 2, title: 'Guía de Estilo APA', subtitle: 'v7.0 - Manual oficial UNM', icon: 'picture_as_pdf', color: 'red', format: 'PDF .pdf', status: 'Activo', statusType: 'active' },
  { id: 3, title: 'Reglamento de Grados 2022', subtitle: 'Reemplazado por versión 2024', icon: 'history', color: 'gray', format: 'PDF .pdf', status: 'Depreciado', statusType: 'deprecated' },
])
</script>

<template>
  <div>
    <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
      <div>
        <div class="flex items-center gap-2 mb-2"><span class="w-4 h-px bg-outline-variant"></span></div>
        <h2 class="font-headline-lg text-headline-lg text-primary mb-1">Gestión de Formatos Oficiales</h2>
        <p class="font-body-md text-body-md text-on-surface-variant">Bienvenido, <span class="font-semibold text-on-surface">Ing. Mg. Segundo Roger Ramírez Shupingahua</span>. Administre los documentos y plantillas oficiales de la facultad.</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-surface border border-outline-variant/30 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
        <div class="w-12 h-12 rounded-lg bg-primary-fixed/30 flex items-center justify-center text-primary"><span class="material-symbols-outlined">folder_open</span></div>
        <div>
          <p class="text-label-sm text-on-surface-variant uppercase font-bold tracking-tight">Total Archivos</p>
          <p class="text-headline-md font-bold text-primary">42</p>
        </div>
      </div>
      <div class="bg-surface border border-outline-variant/30 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
        <div class="w-12 h-12 rounded-lg bg-secondary-container/50 flex items-center justify-center text-secondary"><span class="material-symbols-outlined">check_circle</span></div>
        <div>
          <p class="text-label-sm text-on-surface-variant uppercase font-bold tracking-tight">Activos</p>
          <p class="text-headline-md font-bold text-primary">38</p>
        </div>
      </div>
      <div class="bg-surface border border-outline-variant/30 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
        <div class="w-12 h-12 rounded-lg bg-error-container/50 flex items-center justify-center text-error"><span class="material-symbols-outlined">history</span></div>
        <div>
          <p class="text-label-sm text-on-surface-variant uppercase font-bold tracking-tight">Depreciados</p>
          <p class="text-headline-md font-bold text-primary">1</p>
        </div>
      </div>
    </div>

    <div class="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
      <div class="relative w-full md:w-80">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
        <input class="pl-10 pr-4 py-2 bg-surface-container rounded-lg border border-outline-variant/30 focus:ring-2 focus:ring-primary/20 text-body-md w-full transition-all" placeholder="Buscar formatos..." type="text" />
      </div>
      <button class="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold text-body-md hover:brightness-110 active:scale-95 transition-all shadow-sm"><span class="material-symbols-outlined">add</span><span>Agregar Formato</span></button>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
      <div class="px-6 py-4 bg-surface-container/50 border-b border-outline-variant/30 flex justify-between items-center">
        <h3 class="font-headline-sm text-headline-sm text-primary">Listado de Documentos Oficiales</h3>
        <div class="flex items-center gap-2">
          <button class="p-2 text-on-surface-variant hover:bg-surface-variant/50 rounded-lg transition-colors"><span class="material-symbols-outlined">filter_list</span></button>
          <button class="p-2 text-on-surface-variant hover:bg-surface-variant/50 rounded-lg transition-colors"><span class="material-symbols-outlined">download</span></button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-container-lowest">
              <th class="px-6 py-4 text-nav-caps font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/20">Nombre del Documento</th>
              <th class="px-6 py-4 text-nav-caps font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/20">Tipo de Formato</th>
              <th class="px-6 py-4 text-nav-caps font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/20">Estado</th>
              <th class="px-6 py-4 text-nav-caps font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/20 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/10">
            <tr v-for="f in formatos" :key="f.id" class="hover:bg-surface-container-low transition-colors group">
              <td class="px-6 py-5">
                <div class="flex items-center gap-3">
                  <div :class="['w-10 h-10 rounded flex items-center justify-center', f.color === 'blue' ? 'bg-blue-50 text-blue-700' : f.color === 'red' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500']">
                    <span class="material-symbols-outlined text-xl">{{ f.icon }}</span>
                  </div>
                  <div>
                    <p class="font-semibold text-primary">{{ f.title }}</p>
                    <p class="text-label-sm text-on-surface-variant">{{ f.subtitle }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-5">
                <div class="flex items-center gap-2 text-on-surface-variant">
                  <span class="material-symbols-outlined text-current">{{ f.icon }}</span>
                  <span class="text-body-md">{{ f.format }}</span>
                </div>
              </td>
              <td class="px-6 py-5">
                <span v-if="f.statusType === 'active'" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-secondary-container text-on-secondary-container">
                  <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  Activo
                </span>
                <span v-else class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-error-container text-on-error-container">
                  <span class="w-1.5 h-1.5 rounded-full bg-error"></span>
                  Depreciado
                </span>
              </td>
              <td class="px-6 py-5 text-right">
                <div class="flex items-center justify-end gap-2 transition-opacity">
                  <button class="p-2 text-on-surface-variant hover:text-primary hover:bg-primary-fixed/20 rounded-lg transition-all" title="Visualizar"><span class="material-symbols-outlined text-[20px]">visibility</span></button>
                  <button class="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary-container/50 rounded-lg transition-all" title="Descargar"><span class="material-symbols-outlined text-[20px]">download</span></button>
                  <button class="p-2 text-on-surface-variant hover:text-primary hover:bg-primary-fixed/20 rounded-lg transition-all" title="Editar"><span class="material-symbols-outlined text-[20px]">edit</span></button>
                  <button class="p-2 text-on-surface-variant hover:text-error hover:bg-error-container/50 rounded-lg transition-all" title="Eliminar"><span class="material-symbols-outlined text-[20px]">delete</span></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-6 py-4 bg-surface-container-lowest border-t border-outline-variant/30 flex items-center justify-between">
        <p class="text-label-sm text-on-surface-variant">Mostrando 1-4 de 42 formatos registrados</p>
        <div class="flex items-center gap-1">
          <button class="p-2 rounded-lg hover:bg-surface-variant transition-colors disabled:opacity-30" disabled>
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <button class="w-8 h-8 rounded-lg bg-primary text-white font-bold text-label-sm">1</button>
          <button class="w-8 h-8 rounded-lg hover:bg-surface-variant transition-colors text-label-sm">2</button>
          <button class="w-8 h-8 rounded-lg hover:bg-surface-variant transition-colors text-label-sm">3</button>
          <button class="p-2 rounded-lg hover:bg-surface-variant transition-colors"><span class="material-symbols-outlined">chevron_right</span></button>
        </div>
      </div>
    </div>
  </div>
</template>

