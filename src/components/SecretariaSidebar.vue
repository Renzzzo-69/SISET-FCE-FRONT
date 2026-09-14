<template>
  <aside class="fixed left-0 top-0 h-screen w-sidebar-width bg-sidebar-bg flex flex-col p-gutter border-r border-outline-variant/20 z-50" role="navigation" aria-label="Menú Secretaria">
    <div class="flex items-center gap-3 mb-10">
      <img alt="FCE Logo" class="w-10 h-10 object-contain rounded" src="/fce-logo.png" />
      <div class="flex flex-col">
        <span class="font-headline-lg text-headline-lg font-bold text-on-primary">SISET-FCE</span>
        <span class="font-label-md text-label-md text-on-primary-container">Secretaría Académica</span>
      </div>
    </div>

    <nav class="flex-grow space-y-1">
      <div class="font-nav-caps text-nav-caps text-on-primary-container mb-2 uppercase">Menú Principal</div>
      <router-link class="bg-primary-container text-on-primary-fixed rounded-xl flex items-center gap-3 px-4 py-3 transition-colors" :to="{ name: 'secretaria-resoluciones' }">
        <span class="material-symbols-outlined">dashboard</span>
        <span class="font-label-md text-label-md">Principal</span>
      </router-link>
      <router-link class="text-primary-fixed/70 hover:text-primary-fixed hover:bg-primary-container/50 flex items-center gap-3 px-4 py-3 transition-colors rounded-xl" :to="{ name: 'secretaria-subir-resolucion' }">
        <span class="material-symbols-outlined">upload</span>
        <span class="font-label-md text-label-md">Subir Resolución</span>
      </router-link>
      <router-link class="text-primary-fixed/70 hover:text-primary-fixed hover:bg-primary-container/50 flex items-center gap-3 px-4 py-3 transition-colors rounded-xl" :to="{ name: 'secretaria-corregir-resolucion' }">
        <span class="material-symbols-outlined">edit_note</span>
        <span class="font-label-md text-label-md">Corregir Resolución</span>
      </router-link>

    </nav>

    <div class="mt-auto pt-6 space-y-1">
      <button class="w-full mt-4 bg-secondary-container text-on-secondary-container font-label-md text-label-md py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all">
        <span class="material-symbols-outlined">logout</span>
        Cerrar Sesión
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
// Sidebar para Secretaría Académica
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px }
</style>
