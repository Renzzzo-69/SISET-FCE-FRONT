<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const cerrandoSesion = ref(false)

const etiquetaExpedientes = computed(() =>
  auth.tieneRol('administrador', 'udi', 'decanatura') ? 'Expedientes' : 'Mis expedientes',
)

async function cerrarSesion() {
  cerrandoSesion.value = true
  await auth.cerrarSesion()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <RouterLink class="brand" :to="{ name: 'dashboard' }">SISET-FCE</RouterLink>

      <div class="session">
        <span>{{ auth.usuario?.correo_electronico }}</span>
        <button type="button" :disabled="cerrandoSesion" @click="cerrarSesion">
          {{ cerrandoSesion ? 'Saliendo…' : 'Cerrar sesión' }}
        </button>
      </div>
    </header>

    <aside class="sidebar">
      <nav aria-label="Navegación principal">
        <RouterLink :to="{ name: 'dashboard' }">Dashboard</RouterLink>
        <RouterLink :to="{ name: 'expedientes' }">{{ etiquetaExpedientes }}</RouterLink>
      </nav>

      <p v-if="auth.codigosRol.length" class="roles">
        Roles: {{ auth.codigosRol.join(', ') }}
      </p>
    </aside>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: 220px 1fr;
  grid-template-rows: auto 1fr;
  min-height: 100vh;
}

.topbar {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  color: white;
  background: #534caf;
}

.brand {
  color: inherit;
  font-weight: 700;
  text-decoration: none;
}

.session {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.9rem;
}

.session button {
  padding: 0.45rem 0.75rem;
  color: inherit;
  cursor: pointer;
  background: transparent;
  border: 1px solid currentcolor;
  border-radius: 4px;
}

.sidebar {
  padding: 1.5rem 1rem;
  background: #fff;
  border-right: 1px solid #e5e7eb;
}

nav {
  display: grid;
  gap: 0.4rem;
}

nav a {
  padding: 0.65rem 0.75rem;
  color: #374151;
  text-decoration: none;
  border-radius: 4px;
}

nav a.router-link-active {
  color: #fff;
  background: #534caf;
}

.roles {
  margin-top: 1.5rem;
  color: #6b7280;
  font-size: 0.8rem;
  overflow-wrap: anywhere;
}

.content {
  padding: 2rem;
}

@media (max-width: 700px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    padding: 0.75rem;
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;
  }

  nav {
    grid-template-columns: repeat(2, max-content);
  }

  .content {
    padding: 1rem;
  }
}
</style>
