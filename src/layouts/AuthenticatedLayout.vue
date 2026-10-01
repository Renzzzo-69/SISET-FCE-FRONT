<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const cerrandoSesion = ref(false)
const menuAbierto = ref(false)

watch(
  () => route.fullPath,
  () => {
    menuAbierto.value = false
  },
)

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
const tituloModulo = computed(() => {
  if (auth.tieneRol('administrador')) return 'Administración'
  if (auth.tieneRol('udi')) return 'UDI'
  if (auth.tieneRol('tesista')) return 'Tesista'
  return 'SISET-FCE'
})

async function cerrarSesion() {
  cerrandoSesion.value = true
  await auth.cerrarSesion()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="app-shell">
    <div v-if="menuAbierto" class="mobile-overlay" @click="menuAbierto = false"></div>

    <aside class="sidebar" :class="{ 'is-open': menuAbierto }">
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

        <RouterLink class="nav-item" :to="{ name: 'configuracion' }">
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
        <button
          class="mobile-menu"
          type="button"
          aria-label="Abrir menú principal"
          @click="menuAbierto = true"
        >
          <span class="material-symbols-outlined">menu</span>
        </button>
        <h2>{{ tituloModulo }}</h2>
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

.dark body {
  color: rgb(var(--on-surface));
  background: rgb(var(--background));
}

.dark .app-shell {
  color: rgb(var(--on-surface));
  background: transparent;
}

.dark .topbar {
  background: rgb(var(--surface) / 0.84);
  border-color: rgb(var(--outline-variant) / 0.65);
  backdrop-filter: blur(18px) saturate(135%);
  box-shadow:
    0 1px 0 rgb(var(--primary) / 0.08),
    0 10px 30px rgb(0 0 0 / 0.16);
}

.dark .page-title h2,
.dark .welcome {
  color: rgb(var(--primary));
}

.dark .user-email,
.dark .icon-button {
  color: rgb(var(--on-surface-variant));
}

.dark aside.bg-primary {
  background-color: rgb(var(--sidebar-bg)) !important;
}

.dark .sidebar {
  background: linear-gradient(
    165deg,
    rgb(var(--primary-container) / 0.72),
    rgb(var(--sidebar-bg)) 40%,
    rgb(5 15 35)
  );
  box-shadow:
    10px 0 40px rgb(0 0 0 / 0.28),
    inset -1px 0 rgb(var(--primary) / 0.1);
}

.dark .nav-item:hover {
  background: rgb(var(--primary) / 0.1);
}

.dark .nav-item.is-active,
.dark .nav-item.router-link-active {
  background: linear-gradient(90deg, rgb(var(--primary) / 0.2), rgb(var(--primary) / 0.08));
  box-shadow:
    inset 3px 0 rgb(var(--secondary)),
    0 8px 20px rgb(0 0 0 / 0.14);
}

.dark .logout-button {
  background: rgb(var(--secondary-container));
  color: rgb(var(--on-secondary-container));
  box-shadow: 0 8px 24px rgb(var(--secondary) / 0.15);
}

button,
input {
  font: inherit;
}

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined', sans-serif;
  font-size: 22px;
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}

.app-shell {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 70px 1fr;
  min-height: 100vh;
  background: #f9f9ff;
}

.mobile-menu,
.mobile-overlay {
  display: none;
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

.page-title {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
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
    grid-template-rows: 64px 1fr;
  }

  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 80;
    width: min(86vw, 280px);
    height: 100dvh;
    padding: 1rem;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    overflow-y: auto;
    box-shadow: 12px 0 35px rgba(9, 20, 50, 0.25);
  }

  .sidebar.is-open {
    transform: translateX(0);
  }

  .mobile-overlay {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 70;
    background: rgba(0, 0, 0, 0.45);
  }

  .mobile-menu {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex: 0 0 auto;
    border: 0;
    border-radius: 10px;
    color: #0f2359;
    background: transparent;
    cursor: pointer;
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
    min-width: 0;
    overflow-x: hidden;
  }
}

@media (max-width: 520px) {
  .user-meta {
    display: none;
  }

  .topbar {
    gap: 0.5rem;
  }

  .page-title h2 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
