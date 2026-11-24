<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppNavigation, { type RolNavegacion } from '@/components/AppNavigation.vue'
import SelectorEtapaTesista from '@/components/SelectorEtapaTesista.vue'
import { useAuthStore } from '@/stores/auth'
import { useActividadTesistaStore } from '@/stores/actividadTesista'

const props = defineProps<{ rol: RolNavegacion }>()
const auth = useAuthStore()
const actividad = useActividadTesistaStore()
const route = useRoute()
const router = useRouter()
const menuAbierto = ref(false)
const cerrando = ref(false)
const sidebar = ref<HTMLElement>()
const toggle = ref<HTMLButtonElement>()
const titulos: Record<RolNavegacion, string> = {
  tesista: 'Tesista', udi: 'Unidad de Investigación', docente: 'Docente',
  secretaria: 'Secretaría Académica', decanatura: 'Decanatura',
}
const inicio = computed(() => ({ name: {
  tesista: 'dashboard', udi: 'dashboard', docente: 'docente-dashboard',
  secretaria: 'secretaria-resoluciones', decanatura: 'decanatura',
}[props.rol] }))
const notificaciones = computed(() => {
  if (props.rol === 'tesista' && auth.tieneExpediente) return { name: 'notificaciones' }
  if (props.rol === 'decanatura') return { name: 'decanatura-notificaciones' }
  return undefined
})
const perfil = computed(() => props.rol === 'tesista' ? 'perfil' :
  props.rol === 'udi' ? undefined : `${props.rol}-configuracion`)
const inicial = computed(() => auth.usuario?.correo_electronico.trim().charAt(0).toUpperCase() || '?')
function cerrarMenu() {
  menuAbierto.value = false
}
async function abrirMenu() {
  menuAbierto.value = true
  await nextTick()
  sidebar.value?.querySelector<HTMLElement>('a, button')?.focus()
}
function manejarTecla(event: KeyboardEvent) {
  if (!menuAbierto.value) return
  if (event.key === 'Escape') {
    cerrarMenu()
    toggle.value?.focus()
  }
  if (event.key === 'Tab') {
    const elementos = [...(sidebar.value?.querySelectorAll<HTMLElement>('a, button:not(:disabled), summary') ?? [])]
      .filter(elemento => elemento.getClientRects().length > 0)
    const primero = elementos[0]
    const ultimo = elementos.at(-1)
    if (event.shiftKey && document.activeElement === primero) {
      event.preventDefault()
      ultimo?.focus()
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault()
      primero?.focus()
    }
  }
}
async function cerrarSesion() {
  if (cerrando.value) return
  cerrando.value = true
  await auth.cerrarSesion()
  await router.replace({ name: 'login' })
}
watch(() => route.fullPath, cerrarMenu)
watch(() => [props.rol, auth.usuario?.id_usuario, auth.usuario?.alumno?.id_alumno, auth.tieneExpediente, route.query.expediente] as const, () => {
  const usuario = auth.usuario
  if (props.rol === 'tesista' && auth.tieneExpediente && usuario?.alumno) {
    actividad.iniciar(usuario.id_usuario, usuario.alumno.id_alumno, Number(route.query.expediente) || null, auth.expedientes)
    void actividad.visitar(String(route.name ?? ''))
  } else actividad.detener()
}, { immediate: true })
watch(() => route.name, (nombre) => { void actividad.visitar(String(nombre ?? '')) })
onMounted(() => window.addEventListener('keydown', manejarTecla))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', manejarTecla)
  actividad.detener()
})
</script>

<template>
  <div class="siset-shell" :class="`role-${rol}`">
    <a class="skip-link" href="#app-content">Ir al contenido</a>
    <button v-if="menuAbierto" class="menu-backdrop" type="button" aria-label="Cerrar menú de navegación" @click="cerrarMenu"></button>
    <aside ref="sidebar" class="siset-sidebar" :class="{ 'is-open': menuAbierto }" aria-label="Barra lateral">
      <RouterLink class="faculty-brand" :to="inicio" @click="cerrarMenu">
        <span class="faculty-logo"><img src="/images/fce-unsm.png" alt="Facultad de Ciencias Económicas de la Universidad Nacional de San Martín" width="120" height="120" /></span>
        <strong>SISET-FCE</strong>
        <span class="faculty-name">Facultad de Ciencias Económicas</span>
        <span class="university-name">Universidad Nacional de San Martín</span>
      </RouterLink>
      <div class="sidebar-navigation"><AppNavigation :rol="rol" @navegar="cerrarMenu" /></div>
      <div class="sidebar-session">
        <span class="session-label">{{ titulos[rol] }}</span>
        <button type="button" :disabled="cerrando" @click="cerrarSesion">
          <span class="material-symbols-outlined" aria-hidden="true">logout</span>
          {{ cerrando ? 'Cerrando sesión…' : 'Cerrar sesión' }}
        </button>
      </div>
    </aside>
    <div class="siset-workspace">
      <header class="siset-header">
        <button ref="toggle" class="menu-toggle icon-button" type="button" aria-label="Abrir menú de navegación" aria-controls="app-navigation" :aria-expanded="menuAbierto" @click="abrirMenu">
          <span class="material-symbols-outlined" aria-hidden="true">menu</span>
        </button>
        <div class="module-heading"><span>SISET-FCE</span><strong>{{ titulos[rol] }}</strong></div>
        <div v-if="rol === 'tesista' && auth.tieneExpediente" class="header-stage"><SelectorEtapaTesista /></div>
        <div class="header-actions">
          <RouterLink v-if="notificaciones" class="icon-button notification-bell" :to="notificaciones" :aria-label="rol === 'tesista' && actividad.conteos.notificaciones ? `Ver notificaciones: ${actividad.conteos.notificaciones} sin leer` : 'Ver notificaciones'" title="Notificaciones"><span class="material-symbols-outlined" aria-hidden="true">notifications</span><span v-if="rol === 'tesista' && actividad.conteos.notificaciones" class="bell-count" aria-hidden="true">{{ actividad.conteos.notificaciones > 99 ? '99+' : actividad.conteos.notificaciones }}</span></RouterLink>
          <div class="account">
            <span class="account-avatar" aria-hidden="true">{{ inicial }}</span>
            <div class="account-details"><span class="account-email" :title="auth.usuario?.correo_electronico">{{ auth.usuario?.correo_electronico || 'SISET-FCE' }}</span>
              <RouterLink v-if="perfil" :to="{ name: perfil }">{{ rol === 'tesista' ? 'Mi perfil' : 'Mi cuenta' }}</RouterLink>
              <span v-else>{{ titulos[rol] }}</span>
            </div>
          </div>
        </div>
      </header>
      <main id="app-content" class="siset-content" :class="{ 'docente-content': rol === 'docente' }" tabindex="-1"><slot /></main>
      <footer class="siset-footer"><strong>SISET-FCE</strong><span>© {{ new Date().getFullYear() }} Facultad de Ciencias Económicas · UNSM</span></footer>
    </div>
  </div>
</template>

<style scoped>
.notification-bell { position: relative; }
.bell-count { position: absolute; top: 0; right: -5px; min-width: 19px; padding: 1px 4px; border: 2px solid white; border-radius: 20px; background: #b42332; color: white; font-size: 10px; line-height: 15px; font-weight: 700; text-align: center; }
.siset-shell { display: flex; height: 100dvh; overflow: hidden; background: #f3f4f8; color: #191c20; font-family: var(--siset-font-body); }
.siset-sidebar { display: flex; flex-direction: column; flex-shrink: 0; width: 260px; min-height: 0; background: #263968; color: #e1e7f5; }
.faculty-brand { display: flex; flex-direction: column; align-items: center; padding: 24px 14px 21px; border-bottom: 1px solid #ffffff12; text-decoration: none; text-align: center; }
.faculty-logo { display: grid; place-items: center; width: 132px; height: 132px; margin-bottom: 14px; padding: 8px; background: white; border: 1px solid #e7ebf3; border-radius: 18px; }
.faculty-logo img { width: 100%; height: 100%; object-fit: contain; }
.faculty-brand strong { color: white; font-family: var(--siset-font-heading); font-size: 20px; font-weight: 750; letter-spacing: .5px; }
.faculty-name { margin-top: 3px; color: #e1e7f5; font-size: 11px; }
.university-name { margin-top: 4px; color: #aebbd9; font-size: 9px; }
.sidebar-navigation { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #64749a transparent; }
.sidebar-session { padding: 14px 20px 18px; border-top: 1px solid #ffffff12; }
.session-label { display: block; margin: 0 4px 8px; color: #aebbd9; font-size: 10px; }
.sidebar-session button { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 42px; padding: 9px 12px; border: 1px solid #ffffff26; border-radius: 8px; background: transparent; color: #e1e7f5; font-size: 12px; text-align: left; }
.sidebar-session button:hover:not(:disabled) { background: #ffffff0d; }
.sidebar-session button:focus-visible, .faculty-brand:focus-visible { outline: 2px solid #8ee4ce; outline-offset: -3px; }
.sidebar-session .material-symbols-outlined { font-size: 20px; }
.siset-workspace { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.siset-header { display: flex; flex-shrink: 0; align-items: center; gap: 24px; min-height: 76px; padding: 12px 32px; border-bottom: 1px solid #e2e5ed; background: white; }
.module-heading { display: flex; flex-direction: column; flex-shrink: 0; gap: 2px; }
.module-heading > span { color: #7b8498; font-size: 9px; font-weight: 650; letter-spacing: 1.5px; }
.module-heading strong { color: #263968; font-family: var(--siset-font-heading); font-size: 18px; line-height: 24px; font-weight: 700; }
.header-actions { display: flex; align-items: center; gap: 18px; min-width: 0; margin-left: auto; }
.icon-button { display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; width: 40px; height: 40px; padding: 8px; border: 0; border-radius: 9px; background: transparent; color: #576176; text-decoration: none; }
.icon-button:hover { background: #f0f3f8; color: #263968; }
.icon-button .material-symbols-outlined { font-size: 22px; }
.account { display: flex; align-items: center; gap: 10px; min-width: 0; padding-left: 20px; border-left: 1px solid #e2e5ed; }
.account-avatar { display: grid; place-items: center; flex-shrink: 0; width: 38px; height: 38px; border: 1px solid #dce3f0; border-radius: 50%; background: #edf1f9; color: #354b7d; font-size: 13px; font-weight: 700; }
.account-details { display: flex; flex-direction: column; gap: 2px; min-width: 0; font-size: 10px; color: #6a7385; }
.account-email { max-width: 240px; overflow: hidden; color: #374156; font-size: 11px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.account-details a { width: fit-content; text-decoration: none; }
.account-details a:hover { text-decoration: underline; }
.siset-content { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 32px; }
.siset-content.docente-content { padding: 0; }
.siset-footer { display: flex; flex-shrink: 0; align-items: center; gap: 12px; padding: 12px 32px; border-top: 1px solid #e2e5ed; color: #727b8c; font-size: 9px; }
.siset-footer strong { color: #3b4f7b; font-size: 9px; }
.menu-toggle, .menu-backdrop { display: none; }
.skip-link { position: fixed; top: 8px; left: 280px; z-index: 100; padding: 10px 16px; border-radius: 8px; background: white; color: #263968; transform: translateY(-150%); }
.skip-link:focus { transform: none; }
@media (max-width: 1100px) { .siset-header { gap: 16px; padding: 12px 24px; } .account-email { max-width: 180px; } .header-stage :deep(.phase-selector > span) { display: none; } }
@media (max-width: 1023px) {
  .siset-sidebar { position: fixed; inset: 0 auto 0 0; z-index: 80; width: min(280px, calc(100vw - 48px)); transform: translateX(-100%); visibility: hidden; transition: transform 160ms, visibility 160ms; }
  .siset-sidebar.is-open { transform: none; visibility: visible; }
  .menu-backdrop { display: block; position: fixed; inset: 0; z-index: 79; border: 0; background: #10213c80; }
  .menu-toggle { display: inline-flex; }
  .siset-header { min-height: 72px; gap: 12px; padding: 12px 20px; }
  .skip-link { left: 16px; }
}
@media (max-width: 639px) {
  .siset-header { flex-wrap: wrap; gap: 8px; min-height: 68px; padding: 10px 12px; }
  .module-heading { flex-shrink: 1; min-width: 0; }
  .module-heading strong { max-width: 165px; font-size: 14px; line-height: 20px; }
  .module-heading > span { font-size: 8px; }
  .header-actions { gap: 4px; }
  .account { padding-left: 8px; }
  .account-avatar { width: 32px; height: 32px; }
  .account-email { display: none; }
  .account-details { font-size: 9px; }
  .account-details > span:not(.account-email) { display: none; }
  .header-stage { order: 3; width: 100%; padding: 6px 4px 2px; border-top: 1px solid #edf0f5; }
  .header-stage :deep(.phase-selector > span) { display: inline; }
  .siset-content { padding: 20px 16px; }
  .siset-footer { flex-wrap: wrap; gap: 4px 10px; padding: 10px 16px; font-size: 8px; }
}
@media (prefers-reduced-motion: reduce) { .siset-sidebar { transition: none; } }
</style>
