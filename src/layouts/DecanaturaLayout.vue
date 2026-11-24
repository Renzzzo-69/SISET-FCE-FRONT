<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/layouts/AppShell.vue'

const route = useRoute()
const rol = computed(() => route.path.startsWith('/secretaria') ? 'secretaria' : 'decanatura')
</script>

<template><AppShell :rol="rol"><RouterView /></AppShell></template>
