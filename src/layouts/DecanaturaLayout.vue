<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import DecanaturaSidebar from '@/components/DecanaturaSidebar.vue'
import SecretariaSidebar from '@/components/SecretariaSidebar.vue'
import { useAuthStore } from '@/stores/auth'

const route=useRoute();const auth=useAuthStore();const menuAbierto=ref(false)
const sidebarComponent=computed(()=>route.path.startsWith('/secretaria')?SecretariaSidebar:DecanaturaSidebar)
const tituloModulo=computed(()=>route.path.startsWith('/secretaria')?'Secretaría Académica':'Decanatura')
watch(()=>route.fullPath,()=>{menuAbierto.value=false})
</script>

<template><div class="min-w-0"><component :is="sidebarComponent" class="!hidden lg:!flex"/><div v-if="menuAbierto" class="fixed inset-0 z-[60] bg-black/45 lg:hidden" @click="menuAbierto=false"><div @click.stop><component :is="sidebarComponent" class="!flex lg:!hidden"/></div></div><header class="fixed top-0 right-0 left-0 lg:left-sidebar-width h-header-height bg-surface border-b border-outline-variant/30 flex justify-between items-center px-4 sm:px-gutter z-40"><div class="flex items-center gap-2 min-w-0"><button class="lg:hidden p-2 -ml-2 rounded-lg hover:bg-surface-container shrink-0" aria-label="Abrir menú" @click="menuAbierto=true"><span class="material-symbols-outlined">menu</span></button><h1 class="font-headline-sm text-base sm:text-headline-sm font-bold text-primary truncate">{{tituloModulo}}</h1></div><div class="flex items-center gap-2 sm:gap-6 shrink-0"><div class="text-right hidden md:block"><div class="font-headline-sm text-primary">Bienvenido</div><div class="text-on-surface-variant text-xs">{{auth.usuario?.correo_electronico}}</div></div><button class="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high"><span class="material-symbols-outlined">notifications</span></button><img class="hidden sm:block w-10 h-10 rounded-full object-cover border-2 border-primary-container" src="/logo2.jpeg" alt="avatar"></div></header><main class="pt-[calc(70px+1rem)] sm:pt-[calc(70px+2rem)] lg:ml-sidebar-width min-h-screen pb-12 px-3 sm:px-gutter bg-background text-on-surface transition-colors min-w-0 overflow-x-hidden"><div class="max-w-container-max-width mx-auto min-w-0"><router-view/></div></main></div></template>
