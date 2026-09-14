<script setup lang="ts">
import DecanaturaSidebar from '../components/DecanaturaSidebar.vue'
import SecretariaSidebar from '../components/SecretariaSidebar.vue'
import { useRoute } from 'vue-router'
import { computed } from 'vue'
const route = useRoute()
const sidebarComponent = computed(() => (route.path.startsWith('/secretaria') ? SecretariaSidebar : DecanaturaSidebar))
</script>

<template>
  <div>
    <component :is="sidebarComponent" />

    <header class="fixed top-0 right-0 w-[calc(100%-250px)] h-header-height bg-surface border-b border-outline-variant/30 flex justify-between items-center px-gutter z-40">
      <div class="flex flex-col">
        <h1 class="font-headline-sm text-headline-sm font-bold text-primary">Decanatura</h1>
      </div>
      <div class="flex items-center gap-6">
        <div class="text-right hidden md:block">
          <div class="font-headline-sm text-headline-sm text-primary">Bienvenido Ing. Mg. Segundo Roger Ramírez Shupingahua</div>
          <div class="flex items-center justify-end gap-3 text-on-surface-variant font-label-sm text-label-sm">
            <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">mail</span> sramirez@mira.edu.pe</span>
            <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">call</span> +51 987 654 321</span>
          </div>
        </div>
        <div class="flex items-center gap-3 border-l border-outline-variant/30 pl-6">
          <button class="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <span class="material-symbols-outlined">notifications</span>
          </button>
          <img class="w-10 h-10 rounded-full object-cover border-2 border-primary-container" src="/logo2.jpeg" alt="avatar" />
        </div>
      </div>
    </header>

    <main class="pt-[calc(70px+2rem)] ml-sidebar-width min-h-screen pb-12 px-gutter">
      <div class="max-w-container-max-width mx-auto">
        <router-view />
      </div>
    </main>
  </div>
</template>



<style scoped>
.deca-layout{display:grid;grid-template-columns:260px 1fr;gap:1rem;align-items:start}
.deca-main{padding:8px}
@media (max-width:900px){
  .deca-layout{grid-template-columns:1fr}
}
</style>
