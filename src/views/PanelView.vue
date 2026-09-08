<script setup lang="ts">
import { computed } from 'vue'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const roles = computed(() => auth.usuario?.roles ?? [])
</script>

<template>
  <section>
    <h1>Dashboard</h1>
    <p class="intro">Bienvenido, {{ auth.usuario?.correo_electronico }}.</p>

    <div class="card">
      <h2>Sesión actual</h2>
      <p v-if="roles.length">Roles activos: {{ roles.map((rol) => rol.nombre).join(', ') }}</p>
      <p v-else>No tiene roles activos asignados.</p>
    </div>
  </section>
</template>

<style scoped>
h1,
h2,
p {
  margin-top: 0;
}

.intro {
  color: #6b7280;
}

.card {
  max-width: 560px;
  margin-top: 1.5rem;
  padding: 1.25rem;
  background: #fff;
  border-radius: 6px;
}

.card h2 {
  margin-bottom: 0.5rem;
}

.card p {
  margin-bottom: 0;
}
</style>
