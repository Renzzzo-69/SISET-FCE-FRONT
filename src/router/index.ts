import { createRouter, createWebHistory } from 'vue-router'

import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue'
import { useAuthStore } from '@/stores/auth'
import CrearExpedienteView from '@/views/CrearExpedienteView.vue'
import ExpedientesView from '@/views/ExpedientesView.vue'
import LoginView from '@/views/LoginView.vue'
import PanelView from '@/views/PanelView.vue'
import DecanaturaView from '@/views/DecanaturaView.vue'
import DecanaturaLayout from '@/layouts/DecanaturaLayout.vue'
import AsignacionJurados from '@/views/decanatura/AsignacionJurados.vue'
import SubirResolucion from '@/views/decanatura/SubirResolucion.vue'
import Documentos from '@/views/decanatura/Documentos.vue'
import Notificaciones from '@/views/decanatura/Notificaciones.vue'
import Resoluciones from '@/views/secretaria/Resoluciones.vue'
import SecretariaSubirResolucion from '@/views/secretaria/SubirResolucion.vue'
import CorregirResolucion from '@/views/secretaria/CorregirResolucion.vue'
import DocenteLayout from '@/layouts/DocenteLayout.vue'
import DocenteDashboard from '@/views/docente/DocenteDashboard.vue'
import TesisRevision from '@/views/docente/jurado/TesisRevision.vue'
import TesisAprobadas from '@/views/docente/jurado/TesisAprobadas.vue'
import DetalleExpediente from '@/views/docente/jurado/DetalleExpediente.vue'
import ProyectosRevision from '@/views/docente/jurado/ProyectosRevision.vue'
import ProyectosAprobados from '@/views/docente/jurado/ProyectosAprobados.vue'
import AsesorProyectosRevision from '@/views/docente/asesor/AsesorProyectosRevision.vue'
import AsesorProyectosAprobados from '@/views/docente/asesor/AsesorProyectosAprobados.vue'
import AsesorTesisRevision from '@/views/docente/asesor/AsesorTesisRevision.vue'
import AsesorTesisAprobadas from '@/views/docente/asesor/AsesorTesisAprobadas.vue'
import DocenteReportes from '@/views/docente/DocenteReportes.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { soloInvitado: true },
    },
    {
      path: '/',
      component: AuthenticatedLayout,
      meta: { requiereAutenticacion: true },
      children: [
        {
          path: '',
          redirect: { name: 'dashboard' },
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: PanelView,
        },
        {
          path: 'decanatura',
          component: DecanaturaLayout,
          children: [
            { path: '', name: 'decanatura', component: DecanaturaView },
            { path: 'asignacion', name: 'decanatura-asignacion', component: AsignacionJurados },
            { path: 'subir-resolucion', name: 'decanatura-subir-resolucion', component: SubirResolucion },
            { path: 'documentos', name: 'decanatura-documentos', component: Documentos },
            { path: 'notificaciones', name: 'decanatura-notificaciones', component: Notificaciones },
          ],
        },
        {
          path: 'secretaria',
          component: DecanaturaLayout,
          children: [
            { path: '', name: 'secretaria-resoluciones', component: Resoluciones },
            { path: 'subir-resolucion', name: 'secretaria-subir-resolucion', component: SecretariaSubirResolucion },
            { path: 'corregir-resolucion', name: 'secretaria-corregir-resolucion', component: CorregirResolucion },
          ],
        },
        {
          path: 'docente',
          component: DocenteLayout,
          children: [
            { path: '', name: 'docente-dashboard', component: DocenteDashboard },
            { path: 'jurado/tesis/revision', name: 'docente-jurado-tesis-revision', component: TesisRevision },
            { path: 'jurado/tesis/aprobadas', name: 'docente-jurado-tesis-aprobadas', component: TesisAprobadas },
            { path: 'jurado/tesis/detalle', name: 'docente-jurado-tesis-detalle', component: DetalleExpediente, props: { kind: 'tesis', status: 'revision' } },
            { path: 'jurado/tesis/detalle-aprobada', name: 'docente-jurado-tesis-detalle-aprobada', component: DetalleExpediente, props: { kind: 'tesis', status: 'aprobada' } },
            { path: 'jurado/proyectos/revision', name: 'docente-jurado-proyectos-revision', component: ProyectosRevision },
            { path: 'jurado/proyectos/aprobados', name: 'docente-jurado-proyectos-aprobados', component: ProyectosAprobados },
            { path: 'jurado/proyectos/detalle', name: 'docente-jurado-proyectos-detalle', component: DetalleExpediente, props: { kind: 'proyecto', status: 'revision' } },
            { path: 'jurado/proyectos/detalle-aprobada', name: 'docente-jurado-proyectos-detalle-aprobada', component: DetalleExpediente, props: { kind: 'proyecto', status: 'aprobada' } },
            { path: 'asesor/proyectos/revision', name: 'docente-asesor-proyectos-revision', component: AsesorProyectosRevision },
            { path: 'asesor/proyectos/aprobados', name: 'docente-asesor-proyectos-aprobados', component: AsesorProyectosAprobados },
            { path: 'asesor/proyectos/detalle', name: 'docente-asesor-proyectos-detalle', component: DetalleExpediente, props: { kind: 'proyecto', status: 'revision' } },
            { path: 'asesor/proyectos/detalle-aprobada', name: 'docente-asesor-proyectos-detalle-aprobada', component: DetalleExpediente, props: { kind: 'proyecto', status: 'aprobada' } },
            { path: 'asesor/tesis/revision', name: 'docente-asesor-tesis-revision', component: AsesorTesisRevision },
            { path: 'asesor/tesis/aprobadas', name: 'docente-asesor-tesis-aprobadas', component: AsesorTesisAprobadas },
            { path: 'asesor/tesis/detalle', name: 'docente-asesor-tesis-detalle', component: DetalleExpediente, props: { kind: 'tesis', status: 'revision' } },
            { path: 'asesor/tesis/detalle-aprobada', name: 'docente-asesor-tesis-detalle-aprobada', component: DetalleExpediente, props: { kind: 'tesis', status: 'aprobada' } },
            { path: 'reportes', name: 'docente-reportes', component: DocenteReportes },
            // jurado and asesor subroutes will be added later
          ],
        },
        {
          path: 'expedientes',
          name: 'expedientes',
          component: ExpedientesView,
        },
        {
          path: 'expedientes/nuevo',
          name: 'expedientes-nuevo',
          component: CrearExpedienteView,
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'dashboard' },
    },
    // Development-only preview route for Decanatura (no auth required)
    {
      path: '/decanatura-dev',
      name: 'decanatura-dev',
      component: DecanaturaLayout,
      children: [
        { path: '', component: DecanaturaView },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.inicializado) {
    await auth.restaurarSesion()
  }

  if (to.meta.requiereAutenticacion && !auth.autenticado) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.soloInvitado && auth.autenticado) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
