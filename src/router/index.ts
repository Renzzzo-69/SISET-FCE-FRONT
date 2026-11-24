import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const AuthenticatedLayout = () => import('@/layouts/AuthenticatedLayout.vue')
const CrearExpedienteView = () => import('@/views/CrearExpedienteView.vue')
const ExpedienteDetalleView = () => import('@/views/ExpedienteDetalleView.vue')
const ExpedientesView = () => import('@/views/ExpedientesView.vue')
const LoginView = () => import('@/views/LoginView.vue')
const PanelView = () => import('@/views/PanelView.vue')
const ObservacionesView = () => import('@/views/ObservacionesView.vue')
const TesisFinalView = () => import('@/views/TesisFinalView.vue')
const DocumentosView = () => import('@/views/DocumentosView.vue')
const FormatosView = () => import('@/views/FormatosView.vue')
const NotificacionesView = () => import('@/views/NotificacionesView.vue')
const PerfilView = () => import('@/views/PerfilView.vue')
const AgendaView = () => import('@/views/AgendaView.vue')
const AsesorJuradosView = () => import('@/views/AsesorJuradosView.vue')
const UdiExpedientesView = () => import('@/views/UdiExpedientesView.vue')
const UdiRevisionView = () => import('@/views/UdiRevisionView.vue')
const UdiExpedienteView = () => import('@/views/UdiExpedienteView.vue')
const UdiListosDerivarView = () => import('@/views/UdiListosDerivarView.vue')
const UdiLineasView = () => import('@/views/UdiLineasView.vue')
const UdiRequisitosView = () => import('@/views/UdiRequisitosView.vue')
const UdiAlumnosView = () => import('@/views/UdiAlumnosView.vue')
const UdiDocentesView = () => import('@/views/UdiDocentesView.vue')
const DecanaturaView = () => import('@/views/DecanaturaView.vue')
const DecanaturaLayout = () => import('@/layouts/DecanaturaLayout.vue')
const AsignacionJurados = () => import('@/views/decanatura/AsignacionJurados.vue')
const AsignacionIndividualJurados = () => import('@/views/decanatura/AsignacionIndividualJurados.vue')
const Documentos = () => import('@/views/decanatura/Documentos.vue')
const AgregarFormato = () => import('@/views/decanatura/AgregarFormato.vue')
const Notificaciones = () => import('@/views/decanatura/Notificaciones.vue')
const Resoluciones = () => import('@/views/secretaria/Resoluciones.vue')
const SecretariaSubirResolucion = () => import('@/views/secretaria/SubirResolucion.vue')
const CorregirResolucion = () => import('@/views/secretaria/CorregirResolucion.vue')
const DocenteLayout = () => import('@/layouts/DocenteLayout.vue')
const DocenteDashboard = () => import('@/views/docente/DocenteDashboard.vue')
const TesisRevision = () => import('@/views/docente/jurado/TesisRevision.vue')
const TesisAprobadas = () => import('@/views/docente/jurado/TesisAprobadas.vue')
const DetalleExpediente = () => import('@/views/docente/jurado/DetalleExpediente.vue')
const ProyectosRevision = () => import('@/views/docente/jurado/ProyectosRevision.vue')
const ProyectosAprobados = () => import('@/views/docente/jurado/ProyectosAprobados.vue')
const AsesorProyectosRevision = () => import('@/views/docente/asesor/AsesorProyectosRevision.vue')
const AsesorProyectosAprobados = () => import('@/views/docente/asesor/AsesorProyectosAprobados.vue')
const AsesorTesisRevision = () => import('@/views/docente/asesor/AsesorTesisRevision.vue')
const AsesorTesisAprobadas = () => import('@/views/docente/asesor/AsesorTesisAprobadas.vue')
const DocenteReportes = () => import('@/views/docente/DocenteReportes.vue')
const ConfiguracionView = () => import('@/views/ConfiguracionView.vue')
const CalendarioLaboralView = () => import('@/views/CalendarioLaboralView.vue')

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
          path: 'udi/mantenimiento/requisitos', name: 'udi-requisitos', component: UdiRequisitosView,
          meta: { roles: ['udi', 'administrador'] },
        },
        {
          path: 'calendario-laboral', name: 'calendario-laboral', component: CalendarioLaboralView,
          meta: { roles: ['udi', 'administrador', 'decanatura'] },
        },
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
          path: 'asesor-jurados',
          name: 'asesor-jurados',
          component: AsesorJuradosView,
        },
        {
          path: 'agenda',
          name: 'agenda',
          component: AgendaView,
        },
        {
          path: 'perfil',
          name: 'perfil',
          component: PerfilView,
        },
        {
          path: 'notificaciones',
          name: 'notificaciones',
          component: NotificacionesView,
        },
        {
          path: 'formatos',
          name: 'formatos',
          component: FormatosView,
        },
        {
          path: 'documentos',
          name: 'documentos',
          component: DocumentosView,
        },
        {
          path: 'tesis-final',
          name: 'tesis-final',
          component: TesisFinalView,
        },
        {
          path: 'observaciones',
          name: 'observaciones',
          component: ObservacionesView,
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
        {
          path: 'expedientes/:id',
          name: 'expedientes-detalle',
          component: ExpedienteDetalleView,
        },
        {
          path: 'udi/mantenimiento/docentes',
          name: 'udi-docentes',
          component: UdiDocentesView,
          meta: { roles: ['udi', 'administrador'] },
        },
        {
          path: 'udi/mantenimiento/alumnos',
          name: 'udi-alumnos',
          component: UdiAlumnosView,
          meta: { roles: ['udi', 'administrador'] },
        },
        {
          path: 'udi/mantenimiento/lineas',
          name: 'udi-lineas',
          component: UdiLineasView,
          meta: { roles: ['udi', 'administrador'] },
        },
        {
          path: 'udi/expedientes',
          name: 'udi-expedientes',
          redirect: { name: 'udi-expedientes-por-revisar' },
          meta: { roles: ['udi', 'administrador'] },
        },
        {
          path: 'udi/expedientes/por-revisar',
          name: 'udi-expedientes-por-revisar',
          component: UdiExpedientesView,
          meta: { roles: ['udi', 'administrador'] },
        },
        {
          path: 'udi/expedientes/revisados',
          name: 'udi-expedientes-revisados',
          component: UdiExpedientesView,
          meta: { roles: ['udi', 'administrador'] },
        },
        {
          path: 'udi/expedientes/:id(\\d+)',
          name: 'udi-expediente',
          component: UdiExpedienteView,
          meta: { roles: ['udi', 'administrador'] },
        },
        {
          path: 'udi/expedientes/:id/revision',
          name: 'udi-revision',
          component: UdiRevisionView,
          meta: { roles: ['udi', 'administrador'] },
        },
        {
          path: 'udi/jurados',
          name: 'udi-jurados',
          component: UdiListosDerivarView,
          meta: { roles: ['udi', 'administrador'] },
        },
        {
          path: 'udi/jurados/:id(\\d+)',
          name: 'udi-jurados-propuesta',
          component: AsignacionIndividualJurados,
          meta: { roles: ['udi', 'administrador'] },
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
      component: DecanaturaLayout,
      children: [{ path: '', name: 'decanatura-dev', component: DecanaturaView }],
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

  if (
    to.meta.requiereAutenticacion &&
    auth.autenticado &&
    auth.tieneRol('tesista') &&
    !auth.tieneRol('udi', 'administrador')
  ) {
    if (auth.tieneExpediente === null) await auth.actualizarExpediente()
    if (!auth.autenticado) return { name: 'login' }
    if (!auth.moduloTesistaDisponible(String(to.name))) {
      return {
        name:
          auth.tieneExpediente === null
            ? 'perfil'
            : auth.tieneExpediente
              ? 'dashboard'
              : 'expedientes-nuevo',
      }
    }
  }

  return true
})

export default router
