<template>
  <div class="min-w-0">
    <DocenteSidebar />
    <div
      v-if="menuAbierto"
      class="fixed inset-0 z-[60] bg-black/45 lg:hidden"
      @click="menuAbierto = false"
    >
      <div @click.stop><DocenteSidebar class="!flex lg:!hidden" /></div>
    </div>
    <header
      class="sticky top-0 z-50 h-14 px-4 flex items-center gap-3 bg-primary text-white shadow lg:hidden"
    >
      <button
        class="p-2 rounded-lg hover:bg-white/10"
        aria-label="Abrir menú"
        @click="menuAbierto = true"
      >
        <span class="material-symbols-outlined">menu</span></button
      ><img src="/fce-logo.png" alt="FCE" class="w-8 h-8 rounded bg-white p-1" /><span
        class="font-bold truncate"
        >SISET-FCE · Docente</span
      >
    </header>
    <main class="lg:ml-[260px] min-h-screen min-w-0 overflow-x-hidden">
      <slot />
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import DocenteSidebar from '@/components/DocenteSidebar.vue'
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const menuAbierto = ref(false)
const route = useRoute()
watch(
  () => route.fullPath,
  () => {
    menuAbierto.value = false
  },
)
</script>

<style scoped>
@media (max-width: 1023px) {
  main :deep(header.sticky) {
    top: 3.5rem;
  }
}

@media (max-width: 639px) {
  main :deep(h1),
  main :deep(h2),
  main :deep(h3),
  main :deep(p) {
    overflow-wrap: anywhere;
  }

  main :deep(.overflow-x-auto) {
    -webkit-overflow-scrolling: touch;
  }
}
</style>
