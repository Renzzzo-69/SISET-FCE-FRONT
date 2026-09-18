<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const cerrandoSesion = ref(false)
const menuAbierto = ref(false)

const navegacion = computed(() => {
  const enlaces = new Map<string, { nombre: string; etiqueta: string; icono: string }>()
  const agregar = (nombre: string, etiqueta: string, icono: string) =>
    enlaces.set(nombre, { nombre, etiqueta, icono })

  agregar('dashboard', 'Dashboard', 'dashboard')

  if (auth.tieneRol('tesista')) {
    agregar('expedientes', 'Mis expedientes', 'folder_open')
    agregar('expedientes-nuevo', 'Registrar expediente', 'app_registration')
  }

  if (auth.tieneRol('udi', 'administrador')) {
    agregar('udi-expedientes', 'Bandeja UDI', 'inbox')
  }

  return [...enlaces.values()]
})

const rolesActivos = computed(() =>
  [...new Set(auth.usuario?.roles.map((rol) => rol.nombre || rol.codigo) ?? [])].join(', '),
)
const inicialUsuario = computed(() => auth.usuario?.correo_electronico.trim().charAt(0).toUpperCase() || '?')

function cerrarMenu() {
  menuAbierto.value = false
}

function alternarMenu() {
  menuAbierto.value = !menuAbierto.value
}

function enlaceActivo(nombre: string) {
  if (nombre === 'expedientes') {
    return route.name === 'expedientes' || route.name === 'expedientes-detalle'
  }

  if (nombre === 'udi-expedientes') {
    return route.name === 'udi-expedientes' || route.name === 'udi-revision'
  }

  return route.name === nombre
}

function manejarTecla(evento: KeyboardEvent) {
  if (evento.key === 'Escape') {
    cerrarMenu()
  }
}

async function cerrarSesion() {
  cerrandoSesion.value = true
  await auth.cerrarSesion()
  await router.replace({ name: 'login' })
}

onMounted(() => window.addEventListener('keydown', manejarTecla))
onBeforeUnmount(() => window.removeEventListener('keydown', manejarTecla))
</script>

<template>
  <div class="app-shell">
    <aside class="app-sidebar" :class="{ 'is-open': menuAbierto }">
      <RouterLink class="brand" :to="{ name: 'dashboard' }" @click="cerrarMenu">
        <span class="brand-mark" aria-hidden="true">SF</span>
        <span>
          <strong>SISET-FCE</strong>
          <small>Sistema de Seguimiento</small>
        </span>
      </RouterLink>

      <nav id="main-navigation" class="main-navigation" aria-label="Navegación principal">
        <RouterLink
          v-for="enlace in navegacion"
          v-slot="{ href, navigate }"
          :key="enlace.nombre"
          custom
          :to="{ name: enlace.nombre }"
        >
          <a
            :href="href"
            class="nav-link"
            :class="{ 'is-active': enlaceActivo(enlace.nombre) }"
            :aria-current="enlaceActivo(enlace.nombre) ? 'page' : undefined"
            @click="
              (evento) => {
                cerrarMenu()
                navigate(evento)
              }
            "
          >
            <span class="material-symbols-outlined" aria-hidden="true">{{ enlace.icono }}</span>
            <span>{{ enlace.etiqueta }}</span>
          </a>
        </RouterLink>
      </nav>
    </aside>

    <button
      v-if="menuAbierto"
      class="menu-backdrop"
      type="button"
      aria-label="Cerrar menú de navegación"
      @click="cerrarMenu"
    ></button>

    <header class="app-header">
      <button
        class="mobile-menu-button"
        type="button"
        aria-controls="main-navigation"
        :aria-expanded="menuAbierto"
        :aria-label="menuAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'"
        @click="alternarMenu"
      >
        <span class="material-symbols-outlined" aria-hidden="true">{{ menuAbierto ? 'close' : 'menu' }}</span>
      </button>

      <RouterLink class="mobile-brand" :to="{ name: 'dashboard' }" @click="cerrarMenu">SISET-FCE</RouterLink>

      <div class="header-spacer" aria-hidden="true"></div>

      <div class="user-session">
        <span class="user-avatar" aria-hidden="true">{{ inicialUsuario }}</span>
        <div class="user-details">
          <span class="user-email">{{ auth.usuario?.correo_electronico }}</span>
          <span v-if="rolesActivos" class="user-roles">{{ rolesActivos }}</span>
        </div>
        <button
          class="logout-button"
          type="button"
          :disabled="cerrandoSesion"
          aria-label="Cerrar sesión"
          @click="cerrarSesion"
        >
          <span class="material-symbols-outlined" aria-hidden="true">logout</span>
          <span>{{ cerrandoSesion ? 'Saliendo…' : 'Cerrar sesión' }}</span>
        </button>
      </div>
    </header>

    <main class="app-content">
      <RouterView />
    </main>

    <footer class="app-footer">SISET-FCE</footer>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-rows: var(--siset-header-height) minmax(0, 1fr) auto;
  grid-template-columns: var(--siset-sidebar-width) minmax(0, 1fr);
  min-height: 100vh;
  background: var(--siset-color-background);
}

.app-sidebar {
  grid-row: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: var(--siset-space-8);
  padding: var(--siset-space-6) var(--siset-space-4);
  color: var(--siset-color-surface);
  background: var(--siset-color-primary);
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--siset-space-3);
  color: inherit;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: var(--siset-space-10);
  height: var(--siset-space-10);
  place-items: center;
  color: var(--siset-color-primary);
  font-weight: 700;
  background: var(--siset-color-surface);
  border-radius: var(--siset-radius-lg);
}

.brand strong,
.brand small {
  display: block;
}

.brand strong {
  font-family: var(--siset-font-heading);
}

.brand small,
.user-roles {
  color: var(--siset-color-secondary-container);
  font-size: 0.75rem;
}

.main-navigation {
  display: grid;
  gap: var(--siset-space-1);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--siset-space-3);
  padding: var(--siset-space-3);
  color: inherit;
  text-decoration: none;
  border-radius: var(--siset-radius-lg);
}

.nav-link:hover,
.nav-link.is-active {
  color: var(--siset-color-primary);
  background: var(--siset-color-surface);
}

.nav-link .material-symbols-outlined,
.mobile-menu-button .material-symbols-outlined,
.logout-button .material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
}

.app-header {
  grid-column: 2;
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 0 var(--siset-space-6);
  background: var(--siset-color-surface);
  border-bottom: 1px solid var(--siset-color-border);
  box-shadow: var(--siset-shadow-sm);
}

.header-spacer {
  flex: 1;
}

.user-session {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: var(--siset-space-3);
}

.user-avatar {
  display: grid;
  flex: 0 0 auto;
  width: var(--siset-space-8);
  height: var(--siset-space-8);
  place-items: center;
  color: var(--siset-color-primary);
  font-weight: 700;
  background: var(--siset-color-secondary-container);
  border-radius: var(--siset-radius-xl);
}

.user-details {
  display: grid;
  min-width: 0;
}

.user-email {
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-roles {
  overflow: hidden;
  color: var(--siset-color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-button,
.mobile-menu-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--siset-space-2);
  min-height: var(--siset-space-8);
  padding: var(--siset-space-2) var(--siset-space-3);
  color: var(--siset-color-primary);
  background: transparent;
  border: 1px solid var(--siset-color-border);
  border-radius: var(--siset-radius-lg);
}

.logout-button:hover,
.mobile-menu-button:hover {
  background: var(--siset-color-surface-muted);
}

.mobile-menu-button,
.mobile-brand,
.menu-backdrop {
  display: none;
}

.app-content {
  grid-column: 2;
  min-width: 0;
  padding: var(--siset-space-8);
}

.app-footer {
  grid-column: 2;
  padding: var(--siset-space-3) var(--siset-space-6);
  color: var(--siset-color-text-muted);
  font-size: 0.75rem;
  text-align: right;
  border-top: 1px solid var(--siset-color-border);
}

@media (max-width: 48rem) {
  .app-shell {
    grid-template-rows: var(--siset-header-height) minmax(0, 1fr) auto;
    grid-template-columns: 1fr;
  }

  .app-sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 2;
    width: min(var(--siset-sidebar-width), 100vw);
    transform: translateX(-100%);
    visibility: hidden;
    transition: transform 160ms ease, visibility 160ms ease;
    box-shadow: var(--siset-shadow-md);
  }

  .app-sidebar.is-open {
    transform: translateX(0);
    visibility: visible;
  }

  .menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1;
    display: block;
    padding: 0;
    background: var(--siset-color-text);
    border: 0;
    opacity: 0.35;
  }

  .app-header,
  .app-content,
  .app-footer {
    grid-column: 1;
  }

  .app-header {
    padding: 0 var(--siset-space-4);
  }

  .mobile-menu-button {
    display: inline-flex;
  }

  .mobile-brand {
    display: block;
    margin-left: var(--siset-space-3);
    color: var(--siset-color-primary);
    font-family: var(--siset-font-heading);
    font-weight: 700;
    text-decoration: none;
  }

  .app-content {
    padding: var(--siset-space-4);
  }

  .app-footer {
    padding: var(--siset-space-3) var(--siset-space-4);
  }

  .user-details {
    display: none;
  }

  .logout-button span:last-child {
    display: none;
  }
}
</style>
