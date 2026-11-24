<script setup lang="ts">
import AppShell from '@/layouts/AppShell.vue'
</script>

<template><AppShell rol="docente"><slot /><RouterView /></AppShell></template>

<style scoped>
@media (max-width: 639px) {
  :deep(h1), :deep(h2), :deep(h3), :deep(p) { overflow-wrap: anywhere; }
  :deep(.overflow-x-auto) { -webkit-overflow-scrolling: touch; }
}
</style>
