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
import AsignacionIndividualJurados from '@/views/decanatura/AsignacionIndividualJurados.vue'
import Documentos from '@/views/decanatura/Documentos.vue'
import AgregarFormato from '@/views/decanatura/AgregarFormato.vue'
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
import ConfiguracionView from '@/views/ConfiguracionView.vue'

function rutaInicialPorRol(auth: ReturnType<typeof useAuthStore>) {
  if (auth.tieneRol('decanatura')) return { name: 'decanatura' }
  if (auth.tieneRol('secretaria_academica')) return { name: 'secretaria-resoluciones' }
  if (auth.tieneRol('docente')) return { name: 'docente-dashboard' }
  return { name: 'dashboard' }
}

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
          path: 'expedientes',
          name: 'expedientes',
          component: ExpedientesView,
        },
        {
          path: 'expedientes/nuevo',
          name: 'expedientes-nuevo',
          component: CrearExpedienteView,
        },
        { path: 'configuracion', name: 'configuracion', component: ConfiguracionView },
      ],
    },
    {
      path: '/decanatura',
      component: DecanaturaLayout,
      meta: { requiereAutenticacion: true, roles: ['decanatura'] },
      children: [
        { path: '', name: 'decanatura', component: DecanaturaView },
        { path: 'asignacion', name: 'decanatura-asignacion', component: AsignacionJurados },
        {
          path: 'asignacion/:id(\\d+)',
          name: 'decanatura-asignacion-individual',
          component: AsignacionIndividualJurados,
        },
        { path: 'documentos', name: 'decanatura-documentos', component: Documentos },
        { path: 'documentos/nuevo', name: 'decanatura-formatos-nuevo', component: AgregarFormato },
        { path: 'notificaciones', name: 'decanatura-notificaciones', component: Notificaciones },
        { path: 'configuracion', name: 'decanatura-configuracion', component: ConfiguracionView },
      ],
    },
    {
      path: '/secretaria',
      component: DecanaturaLayout,
      meta: { requiereAutenticacion: true, roles: ['secretaria_academica'] },
      children: [
        { path: '', name: 'secretaria-resoluciones', component: Resoluciones },
        {
          path: 'subir-resolucion',
          name: 'secretaria-subir-resolucion',
          component: SecretariaSubirResolucion,
        },
        {
          path: 'corregir-resolucion',
          name: 'secretaria-corregir-resolucion',
          component: CorregirResolucion,
        },
        { path: 'configuracion', name: 'secretaria-configuracion', component: ConfiguracionView },
      ],
    },
    {
      path: '/docente',
      component: DocenteLayout,
      meta: { requiereAutenticacion: true, roles: ['docente'] },
      children: [
        { path: '', name: 'docente-dashboard', component: DocenteDashboard },
        {
          path: 'jurado/tesis/revision',
          name: 'docente-jurado-tesis-revision',
          component: TesisRevision,
        },
        {
          path: 'jurado/tesis/aprobadas',
          name: 'docente-jurado-tesis-aprobadas',
          component: TesisAprobadas,
        },
        {
          path: 'jurado/tesis/detalle/:id(\\d+)',
          name: 'docente-jurado-tesis-detalle',
          component: DetalleExpediente,
          props: (route) => ({
            kind: 'tesis',
            status: 'revision',
            responsibility: 'jurado',
            id: Number(route.params.id),
          }),
        },
        {
          path: 'jurado/tesis/detalle-aprobada/:id(\\d+)',
          name: 'docente-jurado-tesis-detalle-aprobada',
          component: DetalleExpediente,
          props: (route) => ({
            kind: 'tesis',
            status: 'aprobada',
            responsibility: 'jurado',
            id: Number(route.params.id),
          }),
        },
        {
          path: 'jurado/proyectos/revision',
          name: 'docente-jurado-proyectos-revision',
          component: ProyectosRevision,
        },
        {
          path: 'jurado/proyectos/aprobados',
          name: 'docente-jurado-proyectos-aprobados',
          component: ProyectosAprobados,
        },
        {
          path: 'jurado/proyectos/detalle/:id(\\d+)',
          name: 'docente-jurado-proyectos-detalle',
          component: DetalleExpediente,
          props: (route) => ({
            kind: 'proyecto',
            status: 'revision',
            responsibility: 'jurado',
            id: Number(route.params.id),
          }),
        },
        {
          path: 'jurado/proyectos/detalle-aprobada/:id(\\d+)',
          name: 'docente-jurado-proyectos-detalle-aprobada',
          component: DetalleExpediente,
          props: (route) => ({
            kind: 'proyecto',
            status: 'aprobada',
            responsibility: 'jurado',
            id: Number(route.params.id),
          }),
        },
        {
          path: 'asesor/proyectos/revision',
          name: 'docente-asesor-proyectos-revision',
          component: AsesorProyectosRevision,
        },
        {
          path: 'asesor/proyectos/aprobados',
          name: 'docente-asesor-proyectos-aprobados',
          component: AsesorProyectosAprobados,
        },
        {
          path: 'asesor/proyectos/detalle/:id(\\d+)',
          name: 'docente-asesor-proyectos-detalle',
          component: DetalleExpediente,
          props: (route) => ({
            kind: 'proyecto',
            status: 'revision',
            responsibility: 'asesor',
            id: Number(route.params.id),
          }),
        },
        {
          path: 'asesor/proyectos/detalle-aprobada/:id(\\d+)',
          name: 'docente-asesor-proyectos-detalle-aprobada',
          component: DetalleExpediente,
          props: (route) => ({
            kind: 'proyecto',
            status: 'aprobada',
            responsibility: 'asesor',
            id: Number(route.params.id),
          }),
        },
        {
          path: 'asesor/tesis/revision',
          name: 'docente-asesor-tesis-revision',
          component: AsesorTesisRevision,
        },
        {
          path: 'asesor/tesis/aprobadas',
          name: 'docente-asesor-tesis-aprobadas',
          component: AsesorTesisAprobadas,
        },
        {
          path: 'asesor/tesis/detalle/:id(\\d+)',
          name: 'docente-asesor-tesis-detalle',
          component: DetalleExpediente,
          props: (route) => ({
            kind: 'tesis',
            status: 'revision',
            responsibility: 'asesor',
            id: Number(route.params.id),
          }),
        },
        {
          path: 'asesor/tesis/detalle-aprobada/:id(\\d+)',
          name: 'docente-asesor-tesis-detalle-aprobada',
          component: DetalleExpediente,
          props: (route) => ({
            kind: 'tesis',
            status: 'aprobada',
            responsibility: 'asesor',
            id: Number(route.params.id),
          }),
        },
        { path: 'reportes', name: 'docente-reportes', component: DocenteReportes },
        { path: 'configuracion', name: 'docente-configuracion', component: ConfiguracionView },
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
      children: [{ path: '', component: DecanaturaView }],
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
    return rutaInicialPorRol(auth)
  }

  if (auth.autenticado) {
    const rolesPermitidos = to.matched.flatMap(
      (record) => (record.meta.roles as string[] | undefined) ?? [],
    )

    if (rolesPermitidos.length > 0 && !auth.tieneRol(...rolesPermitidos)) {
      return rutaInicialPorRol(auth)
    }

    if (to.name === 'dashboard' && auth.tieneRol('decanatura', 'secretaria_academica', 'docente')) {
      return rutaInicialPorRol(auth)
    }
  }

  return true
})

export default router
