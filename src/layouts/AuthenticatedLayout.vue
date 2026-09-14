<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const cerrandoSesion = ref(false)

watch(
  () => auth.autenticado,
  (autenticado) => {
    if (!autenticado && router.currentRoute.value.meta.requiereAutenticacion) {
      router.replace({ name: 'login' })
    }
  },
)

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
    <aside class="sidebar">
      <div class="brand-box">
        <div class="brand-mark">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvsUsFA4onb_wKPIR11nV6iZH2vRQ3wbVclzK1hQh3wuTYaUGDAt5nTEflbRvyhb5QNIrziMu7lNwm4sIvRw4qKrpCuoNX1O9sWwA3Q3fvU5-JnVAEByp7-BXCv7OgfwAK-FdrT_qj3uh4SqKjE44JmY7EqzWv118GTEJWpJV109PL7U_eQtIjU5WswR5NFIUEwc2Urf9L9san9ZbfK0ZmPoZp-lWMziO9vzDw4KCZjJR4zFCF37ly5Q3KftmxVGmXgd28lCzOUIzQ"
            alt="Logo SISET-FCE"
          />
        </div>
        <div class="brand-text">
          <h1>SISET-FCE</h1>
          <span>Sistema de seguimiento de Tesis</span>
        </div>
      </div>

      <nav class="nav" aria-label="Navegación principal">
        <div class="nav-section-title">Menú Principal</div>

        <RouterLink class="nav-item is-active" :to="{ name: 'dashboard' }">
          <span class="material-symbols-outlined">dashboard</span>
          <span>Principal</span>
        </RouterLink>

        <RouterLink class="nav-item" :to="{ name: 'expedientes' }">
          <span class="material-symbols-outlined">assignment_ind</span>
          <span>{{ etiquetaExpedientes }}</span>
        </RouterLink>

        <RouterLink class="nav-item" :to="{ name: 'dashboard' }">
          <span class="material-symbols-outlined">settings</span>
          <span>Configuración</span>
        </RouterLink>
      </nav>

      <button class="logout-button" type="button" :disabled="cerrandoSesion" @click="cerrarSesion">
        <span class="material-symbols-outlined">logout</span>
        <span>{{ cerrandoSesion ? 'Saliendo…' : 'Cerrar Sesión' }}</span>
      </button>
    </aside>

    <header class="topbar">
      <div class="page-title">
        <h2>Docente</h2>
      </div>

      <div class="session-panel">
        <div class="user-meta" v-if="auth.usuario">
          <p class="welcome">Bienvenido</p>
          <p class="user-email">{{ auth.usuario.correo_electronico }}</p>
        </div>

        <button class="icon-button" type="button" aria-label="Notificaciones">
          <span class="material-symbols-outlined">notifications</span>
        </button>
      </div>
    </header>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Hanken+Grotesk:wght@400;600;700&display=swap');

* {
  box-sizing: border-box;
}

html,
body,
#app {
  margin: 0;
  min-height: 100%;
  height: 100%;
}

body {
  color: #1f2937;
  font-family: 'Inter', sans-serif;
  background: #f9f9ff;
}

button,
input {
  font: inherit;
}

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined', sans-serif;
  font-size: 22px;
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

.app-shell {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 70px 1fr;
  min-height: 100vh;
  background: #f9f9ff;
}

.sidebar {
  grid-row: 1 / span 2;
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  background: #283a70;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-box {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 1.75rem;
  padding: 0.25rem 0.25rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.brand-mark {
  width: 42px;
  height: 42px;
  overflow: hidden;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-mark img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.brand-text h1 {
  margin: 0;
  color: #ffffff;
  font-size: 1.1rem;
  line-height: 1.2;
  font-family: 'Hanken Grotesk', sans-serif;
  font-weight: 700;
}

.brand-text span {
  color: rgba(148, 166, 227, 0.9);
  font-size: 0.72rem;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.nav-section-title {
  margin: 0.25rem 0.5rem 0.5rem;
  color: rgba(148, 166, 227, 0.7);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.nav-item.is-active {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  font-weight: 700;
}

.logout-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  width: 100%;
  margin-top: 1rem;
  padding: 0.8rem 1rem;
  border: 0;
  border-radius: 12px;
  background: #9cefdc;
  color: #0b6f60;
  font-weight: 700;
  cursor: pointer;
}

.topbar {
  grid-column: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 1.25rem;
  background: #f9f9ff;
  border-bottom: 1px solid rgba(117, 118, 129, 0.2);
}

.page-title h2 {
  margin: 0;
  color: #0f2359;
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
}

.session-panel {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.user-meta {
  text-align: right;
}

.welcome {
  margin: 0;
  color: #0f2359;
  font-weight: 600;
  font-size: 0.82rem;
}

.user-email {
  margin: 0.1rem 0 0;
  color: #45464f;
  font-size: 0.7rem;
}

.icon-button {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #45464f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.icon-button:hover {
  background: #eef0f8;
}

.content {
  grid-column: 2;
  padding: 1.5rem 1.25rem 2rem;
}

@media (max-width: 900px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    grid-row: auto;
    padding: 1rem;
  }

  .topbar,
  .content {
    grid-column: auto;
  }

  .topbar {
    padding: 0.85rem 1rem;
  }

  .content {
    padding: 1rem;
  }
}
</style>
