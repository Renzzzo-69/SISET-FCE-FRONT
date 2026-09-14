<template>
  <div>
    <DocenteSidebar />
    <main class="lg:ml-[250px] min-h-screen">
      <slot />
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import DocenteSidebar from '@/components/DocenteSidebar.vue'
</script>

<style scoped>
/* layout-level styles (if any) */
</style>
