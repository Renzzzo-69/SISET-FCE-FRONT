<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const cerrandoSesion = ref(false)
const menuAbierto = ref(false)
const esTesista = computed(() => auth.tieneRol('tesista') && !auth.tieneRol('udi', 'administrador'))
const opcionTesistaActiva = computed(() => {
  if (route.name === 'dashboard') {
    return 'Principal'
  }
  if (route.name === 'expedientes-nuevo') return 'Registrar Expediente'
  if (route.name === 'observaciones') return 'Observaciones y Subsanaciones'
  if (route.name === 'formatos') return 'Formatos Oficiales'
  if (route.name === 'notificaciones') return 'Notificaciones'
  if (route.name === 'perfil') return 'Perfil'
  if (route.name === 'agenda') return 'Agenda Académica'
  if (route.name === 'asesor-jurados') return 'Asesor y Jurados'
  if (
    route.name === 'documentos' ||
    (route.name === 'expedientes-detalle' && route.query.registrar === 'documento')
  )
    return 'Documentos y Resoluciones'
  if (
    route.name === 'tesis-final' ||
    (route.name === 'expedientes-detalle' && route.query.registrar === 'tesis-final')
  )
    return 'Tesis Final'
  if (route.name === 'expedientes' || route.name === 'expedientes-detalle') return 'Mi Expediente'
  return ''
})
const opcionesTesista = computed(() =>
  [
    { etiqueta: 'Principal', icono: 'dashboard', ruta: 'dashboard' },
    { etiqueta: 'Registrar Expediente', icono: 'app_registration', ruta: 'expedientes-nuevo' },
    { etiqueta: 'Mi Expediente', icono: 'folder_shared', ruta: 'expedientes' },
    { etiqueta: 'Observaciones y Subsanaciones', icono: 'edit_note', ruta: 'observaciones' },
    { etiqueta: 'Tesis Final', icono: 'school', ruta: 'tesis-final' },
    { etiqueta: 'Documentos y Resoluciones', icono: 'description', ruta: 'documentos' },
    { etiqueta: 'Formatos Oficiales', icono: 'format_list_bulleted', ruta: 'formatos' },
    { etiqueta: 'Asesor y Jurados', icono: 'groups', ruta: 'asesor-jurados' },
    { etiqueta: 'Agenda Académica', icono: 'calendar_month', ruta: 'agenda' },
    {
      etiqueta: 'Notificaciones',
      icono: 'notifications',
      ruta: 'notificaciones',
      hash: '',
    },
    { etiqueta: 'Perfil', icono: 'person', ruta: 'perfil' },
  ].filter((enlace) => auth.moduloTesistaDisponible(enlace.ruta)),
)

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
const inicialUsuario = computed(
  () => auth.usuario?.correo_electronico.trim().charAt(0).toUpperCase() || '?',
)

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

async function comprobarExpedienteAlVolver() {
  if (!esTesista.value || auth.tieneExpediente !== false) return
  await auth.actualizarExpediente()
  if (auth.tieneExpediente && route.name === 'expedientes-nuevo') {
    await router.replace({ name: 'expedientes' })
  }
}

onMounted(() => {
  window.addEventListener('keydown', manejarTecla)
  window.addEventListener('focus', comprobarExpedienteAlVolver)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', manejarTecla)
  window.removeEventListener('focus', comprobarExpedienteAlVolver)
})
</script>

<template>
  <div class="app-shell" :class="{ 'tesista-shell': esTesista }">
    <aside class="app-sidebar" :class="{ 'is-open': menuAbierto }">
      <RouterLink class="brand" :to="{ name: 'dashboard' }" @click="cerrarMenu">
        <span v-if="!esTesista" class="brand-mark" aria-hidden="true">SF</span>
        <span>
          <strong>SISET-FCE</strong>
          <small>{{
            esTesista ? 'Facultad de Ciencias Económicas' : 'Sistema de Seguimiento'
          }}</small>
        </span>
      </RouterLink>

      <nav id="main-navigation" class="main-navigation" aria-label="Navegación principal">
        <template v-if="esTesista">
          <component
            :is="enlace.ruta ? RouterLink : 'button'"
            v-for="enlace in opcionesTesista"
            :key="enlace.etiqueta"
            :to="enlace.ruta ? { name: enlace.ruta, hash: enlace.hash } : undefined"
            class="nav-link"
            :class="{ 'is-active': enlace.etiqueta === opcionTesistaActiva }"
            :disabled="!enlace.ruta"
            :title="!enlace.ruta ? 'Función pendiente de implementación' : undefined"
            :aria-current="enlace.etiqueta === opcionTesistaActiva ? 'page' : undefined"
            @click="cerrarMenu"
          >
            <span class="material-symbols-outlined" aria-hidden="true">{{ enlace.icono }}</span
            ><span>{{ enlace.etiqueta }}</span>
          </component>
        </template>
        <template v-else>
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
        </template>
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
        <span class="material-symbols-outlined" aria-hidden="true">{{
          menuAbierto ? 'close' : 'menu'
        }}</span>
      </button>

      <RouterLink class="mobile-brand" :to="{ name: 'dashboard' }" @click="cerrarMenu"
        >SISET-FCE</RouterLink
      >
      <nav v-if="esTesista" class="tesista-header-nav" aria-label="Módulo actual">
        <span>SISET-FCE</span><RouterLink :to="{ name: 'dashboard' }">Tesista</RouterLink>
      </nav>

      <div class="header-spacer" aria-hidden="true"></div>

      <template v-if="esTesista">
        <RouterLink
          v-if="auth.tieneExpediente"
          class="header-icon"
          :to="{ name: 'notificaciones' }"
          aria-label="Ver notificaciones"
          ><span class="material-symbols-outlined" aria-hidden="true"
            >notifications</span
          ></RouterLink
        >
        <button
          class="header-icon"
          disabled
          title="Ayuda pendiente de implementación"
          aria-label="Ayuda"
        >
          <span class="material-symbols-outlined" aria-hidden="true">help</span>
        </button>
        <div class="tesista-session">
          <span class="user-avatar" :title="auth.usuario?.correo_electronico">{{
            inicialUsuario
          }}</span>
          <div>
            <RouterLink :to="{ name: 'perfil' }">Perfil</RouterLink
            ><button :disabled="cerrandoSesion" @click="cerrarSesion">
              {{ cerrandoSesion ? 'Saliendo…' : 'Cerrar Sesión' }}
            </button>
          </div>
        </div>
      </template>
      <div v-else class="user-session">
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
      <p v-if="esTesista && auth.errorExpediente" role="alert">
        {{ auth.errorExpediente }}
        <RouterLink :to="{ name: 'dashboard' }">Reintentar</RouterLink>
      </p>
      <RouterView />
    </main>

    <footer class="app-footer">
      <template v-if="esTesista"
        ><span
          >© 2024 Facultad de Ciencias Económicas - SISET. Todos los derechos reservados. OS: Web
          Cloud</span
        >
        <div class="footer-links">
          <span>Términos y Condiciones</span><span>Soporte Técnico</span><span>Privacidad</span>
        </div></template
      ><template v-else>SISET-FCE</template>
    </footer>
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
  font-variation-settings:
    'FILL' 0,
    'wght' 500,
    'GRAD' 0,
    'opsz' 24;
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

.tesista-shell {
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  background: #f3f3f9;
}
.tesista-shell .app-sidebar {
  gap: 0;
  padding: 0;
  overflow-y: auto;
}
.tesista-shell .brand {
  padding: 70px 20px 40px;
}
.tesista-shell .brand strong {
  font-size: 22px;
  line-height: 30px;
}
.tesista-shell .brand small {
  color: white;
  font-size: 12px;
  margin-top: 4px;
}
.tesista-shell .main-navigation {
  gap: 4px;
  padding: 0 8px;
}
.tesista-shell .nav-link {
  width: 100%;
  padding: 12px 16px;
  gap: 12px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  text-align: left;
}
.tesista-shell .nav-link:hover {
  background: #405189;
  color: white;
}
.tesista-shell .nav-link.is-active {
  background: #33447b;
  color: #b5c4ff;
}
.tesista-shell .app-header {
  padding: 0 20px;
  background: #f9f9ff;
  box-shadow: none;
}
.tesista-header-nav {
  display: flex;
  gap: 24px;
  align-items: center;
  color: #283a70;
  font-family: var(--siset-font-heading);
  font-size: 16px;
  font-weight: 700;
}
.tesista-header-nav a {
  text-decoration: none;
  border-bottom: 2px solid #283a70;
}
.header-icon {
  display: grid;
  place-items: center;
  margin-right: 24px;
  padding: 8px;
  color: #45464f;
  border: 0;
  background: transparent;
  text-decoration: none;
}
.tesista-session {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 24px;
  border-left: 1px solid #c5c6d1;
  font-size: 12px;
  line-height: 16px;
  color: #45464f;
}
.tesista-session .user-avatar {
  background: #dce1ff;
}
.tesista-session button {
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 11px;
  line-height: 14px;
}
.tesista-shell .app-content {
  padding: 24px;
  overflow-y: auto;
  scroll-behavior: smooth;
}
.tesista-shell .app-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  font-size: 11px;
  line-height: 14px;
  text-align: left;
}
.footer-links {
  display: flex;
  gap: 16px;
}
@media (max-width: 48rem) {
  .tesista-shell .brand {
    padding: 24px 20px;
  }
  .tesista-header-nav {
    display: none;
  }
  .header-icon {
    margin-right: 4px;
    padding: 4px;
  }
  .tesista-session {
    padding-left: 8px;
    gap: 8px;
  }
  .tesista-shell .app-footer {
    flex-wrap: wrap;
    padding: 12px 16px;
  }
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
    transition:
      transform 160ms ease,
      visibility 160ms ease;
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
