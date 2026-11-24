<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppShell from '@/layouts/AppShell.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const rol = computed(() => auth.tieneRol('udi', 'administrador') ? 'udi' : 'tesista')
const esTesista = computed(() => rol.value === 'tesista')

async function comprobarExpedienteAlVolver() {
  if (!esTesista.value || auth.tieneExpediente !== false) return
  await auth.actualizarExpediente()
  if (auth.tieneExpediente && route.name === 'expedientes-nuevo') {
    await router.replace({ name: 'expedientes' })
  }
}

onMounted(() => window.addEventListener('focus', comprobarExpedienteAlVolver))
onBeforeUnmount(() => window.removeEventListener('focus', comprobarExpedienteAlVolver))
</script>

<template>
  <AppShell :rol="rol">
    <p v-if="esTesista && auth.errorExpediente" role="alert">
      {{ auth.errorExpediente }}
      <RouterLink :to="{ name: 'dashboard' }">Reintentar</RouterLink>
    </p>
    <RouterView />
  </AppShell>
</template>
