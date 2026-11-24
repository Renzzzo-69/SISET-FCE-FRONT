<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useActividadTesistaStore } from '@/stores/actividadTesista'

export type RolNavegacion = 'tesista' | 'udi' | 'docente' | 'secretaria' | 'decanatura'
type Enlace = { etiqueta: string; icono?: string; ruta?: string; activo?: string[] }
type Grupo = Enlace & { hijos?: Enlace[] }
const props = defineProps<{ rol: RolNavegacion }>()
const emit = defineEmits<{ navegar: [] }>()
const route = useRoute()
const auth = useAuthStore()
const actividad = useActividadTesistaStore()
const menus: Record<RolNavegacion, Grupo[]> = {
  tesista: [
    { etiqueta: 'Principal', icono: 'dashboard', ruta: 'dashboard' },
    { etiqueta: 'Registrar Expediente', icono: 'app_registration', ruta: 'expedientes-nuevo' },
    { etiqueta: 'Mi Expediente', icono: 'folder_shared', ruta: 'expedientes', activo: ['expedientes-detalle'] },
    { etiqueta: 'Observaciones y Subsanaciones', icono: 'edit_note', ruta: 'observaciones' },
    { etiqueta: 'Tesis Final', icono: 'school', ruta: 'tesis-final' },
    { etiqueta: 'Documentos y Resoluciones', icono: 'description', ruta: 'documentos' },
    { etiqueta: 'Formatos Oficiales', icono: 'format_list_bulleted', ruta: 'formatos' },
    { etiqueta: 'Asesor y Jurados', icono: 'groups', ruta: 'asesor-jurados' },
    { etiqueta: 'Agenda Académica', icono: 'calendar_month', ruta: 'agenda' },
    { etiqueta: 'Notificaciones', icono: 'notifications', ruta: 'notificaciones' },
    { etiqueta: 'Perfil', icono: 'person', ruta: 'perfil' },
  ],
  udi: [
    { etiqueta: 'Principal', icono: 'dashboard', ruta: 'dashboard' },
    { etiqueta: 'Bandeja de Archivos', icono: 'folder_open', activo: ['udi-expediente'], hijos: [
      { etiqueta: 'Por revisar', ruta: 'udi-expedientes-por-revisar', activo: ['udi-revision'] },
      { etiqueta: 'Revisados', ruta: 'udi-expedientes-revisados' },
    ] },
    { etiqueta: 'Listos para derivar', icono: 'inventory_2', ruta: 'udi-jurados', activo: ['udi-jurados-propuesta'] },
    { etiqueta: 'Alertas', icono: 'warning' },
    { etiqueta: 'Mantenimiento', icono: 'settings', hijos: [
      { etiqueta: 'Calendario laboral', ruta: 'calendario-laboral' },
      { etiqueta: 'Líneas de investigación', ruta: 'udi-lineas' },
      { etiqueta: 'Alumnos', ruta: 'udi-alumnos' },
      { etiqueta: 'Docentes', ruta: 'udi-docentes' },
      { etiqueta: 'Gestión de requisitos', ruta: 'udi-requisitos' },
    ] },
  ],
  docente: [
    { etiqueta: 'Principal', icono: 'dashboard', ruta: 'docente-dashboard' },
    { etiqueta: 'Jurado', icono: 'gavel', hijos: [
      { etiqueta: 'Tesis en revisión', ruta: 'docente-jurado-tesis-revision', activo: ['docente-jurado-tesis-detalle'] },
      { etiqueta: 'Tesis aprobadas', ruta: 'docente-jurado-tesis-aprobadas', activo: ['docente-jurado-tesis-detalle-aprobada'] },
      { etiqueta: 'Proyectos en revisión', ruta: 'docente-jurado-proyectos-revision', activo: ['docente-jurado-proyectos-detalle'] },
      { etiqueta: 'Proyectos aprobados', ruta: 'docente-jurado-proyectos-aprobados', activo: ['docente-jurado-proyectos-detalle-aprobada'] },
    ] },
    { etiqueta: 'Asesor', icono: 'school', hijos: [
      { etiqueta: 'Proyectos en revisión', ruta: 'docente-asesor-proyectos-revision', activo: ['docente-asesor-proyectos-detalle'] },
      { etiqueta: 'Proyectos aprobados', ruta: 'docente-asesor-proyectos-aprobados', activo: ['docente-asesor-proyectos-detalle-aprobada'] },
      { etiqueta: 'Tesis en revisión', ruta: 'docente-asesor-tesis-revision', activo: ['docente-asesor-tesis-detalle'] },
      { etiqueta: 'Tesis aprobadas', ruta: 'docente-asesor-tesis-aprobadas', activo: ['docente-asesor-tesis-detalle-aprobada'] },
    ] },
    { etiqueta: 'Reportes', icono: 'bar_chart', ruta: 'docente-reportes' },
    { etiqueta: 'Configuración', icono: 'settings', ruta: 'docente-configuracion' },
  ],
  secretaria: [
    { etiqueta: 'Resoluciones', icono: 'gavel', ruta: 'secretaria-resoluciones', activo: ['secretaria-subir-resolucion'] },
    { etiqueta: 'Corrección de Subidas', icono: 'edit_note', ruta: 'secretaria-corregir-resolucion' },
    { etiqueta: 'Configuración', icono: 'settings', ruta: 'secretaria-configuracion' },
  ],
  decanatura: [
    { etiqueta: 'Principal', icono: 'dashboard', ruta: 'decanatura', activo: ['decanatura-dev'] },
    { etiqueta: 'Formatos Oficiales', icono: 'description', ruta: 'decanatura-documentos', activo: ['decanatura-formatos-nuevo'] },
    { etiqueta: 'Asignación de Jurados', icono: 'assignment_ind', ruta: 'decanatura-asignacion', activo: ['decanatura-asignacion-individual'] },
    { etiqueta: 'Configuración', icono: 'settings', ruta: 'decanatura-configuracion' },
  ],
}
const enlaces = computed(() => menus[props.rol].filter(
  (item) => props.rol !== 'tesista' || auth.moduloTesistaDisponible(item.ruta ?? ''),
))
function activo(item: Grupo): boolean {
  if (props.rol === 'tesista' && route.name === 'expedientes-detalle') {
    if (route.query.registrar === 'documento') return item.ruta === 'documentos'
    if (route.query.registrar === 'tesis-final') return item.ruta === 'tesis-final'
  }
  return route.name === item.ruta || !!item.activo?.includes(String(route.name)) || !!item.hijos?.some(activo)
}
function navegar(item: Enlace) {
  if (props.rol === 'tesista' && item.ruta) void actividad.visitar(item.ruta)
  emit('navegar')
}
</script>

<template>
  <nav id="app-navigation" aria-label="Navegación principal">
    <span class="navigation-label">Menú principal</span>
    <template v-for="item in enlaces" :key="item.etiqueta">
      <details v-if="item.hijos" :open="activo(item)">
        <summary class="nav-link" :class="{ 'is-parent-active': activo(item) }">
          <span class="material-symbols-outlined" aria-hidden="true">{{ item.icono }}</span>
          <span>{{ item.etiqueta }}</span>
          <span class="material-symbols-outlined chevron" aria-hidden="true">expand_more</span>
        </summary>
        <div class="submenu">
          <component :is="hijo.ruta ? RouterLink : 'button'" v-for="hijo in item.hijos" :key="hijo.etiqueta"
            :to="hijo.ruta ? { name: hijo.ruta } : undefined" :disabled="!hijo.ruta"
            :title="!hijo.ruta ? 'Módulo pendiente de implementación' : undefined"
            :class="{ 'is-active': activo(hijo) }" :aria-current="activo(hijo) ? 'page' : undefined"
            @click="emit('navegar')">{{ hijo.etiqueta }}</component>
        </div>
      </details>
      <component :is="item.ruta ? RouterLink : 'button'" v-else :to="item.ruta ? { name: item.ruta } : undefined"
        class="nav-link" :class="{ 'is-active': activo(item) }" :disabled="!item.ruta"
        :title="!item.ruta ? 'Módulo pendiente de implementación' : undefined"
        :aria-current="activo(item) ? 'page' : undefined" @click="navegar(item)">
        <span class="material-symbols-outlined" aria-hidden="true">{{ item.icono }}</span>
        <span>{{ item.etiqueta }}</span>
        <span v-if="rol === 'tesista' && item.ruta && actividad.conteos[item.ruta]" class="novelty-count" :aria-label="`${actividad.conteos[item.ruta]} ${item.ruta === 'notificaciones' ? 'notificaciones sin leer' : 'novedades'}`" :title="item.ruta === 'notificaciones' ? 'Notificaciones sin leer' : 'Novedades desde tu última visita'">{{ actividad.conteos[item.ruta]! > 99 ? '99+' : actividad.conteos[item.ruta] }}</span>
      </component>
    </template>
  </nav>
</template>

<style scoped>
.novelty-count { flex-shrink: 0; margin-left: auto; min-width: 22px; padding: 1px 6px; border-radius: 20px; background: #ffdd91; color: #654600; font-size: 10px; line-height: 18px; font-weight: 750; text-align: center; }
.is-active .novelty-count { background: #bde9db; color: #075e53; }
@media (prefers-reduced-motion: no-preference) { .novelty-count { animation: aparecer .2s ease-out; } @keyframes aparecer { from { opacity: 0; transform: scale(.8); } to { opacity: 1; transform: scale(1); } } }
nav { display: flex; flex-direction: column; gap: 4px; padding: 20px 12px; }
.navigation-label { padding: 0 12px 10px; color: #aebbd9; font-size: 10px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; }
.nav-link { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 44px; padding: 11px 12px; border: 0; border-radius: 8px; background: transparent; color: #e1e7f5; text-align: left; text-decoration: none; font-size: 12px; font-weight: 500; line-height: 18px; cursor: pointer; }
.nav-link .material-symbols-outlined { flex-shrink: 0; font-size: 21px; }
.nav-link:hover:not(:disabled), .is-parent-active { background: #ffffff0d; color: white; }
.nav-link.is-active { background: #dff7f1; color: #075e53; font-weight: 650; }
.nav-link:disabled, .submenu button:disabled { color: #abb8d4; cursor: not-allowed; }
summary { list-style: none; }
summary::-webkit-details-marker { display: none; }
.chevron { margin-left: auto; transition: transform 150ms; }
details[open] .chevron { transform: rotate(180deg); }
.submenu { display: grid; gap: 3px; margin: 5px 8px 8px 22px; padding-left: 12px; border-left: 1px solid #ffffff26; }
.submenu a, .submenu button { padding: 9px 12px; border: 0; border-radius: 6px; background: transparent; color: #dce4f5; font-size: 12px; line-height: 18px; text-align: left; text-decoration: none; }
.submenu a:hover, .submenu .is-active { color: #b4f1df; background: #ffffff0d; }
.submenu .is-active { font-weight: 650; }
a:focus-visible, summary:focus-visible, button:focus-visible { outline: 2px solid #8ee4ce; outline-offset: 2px; }
</style>
