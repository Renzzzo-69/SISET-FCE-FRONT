import { createRouter, createWebHistory } from 'vue-router'

import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue'
import { useAuthStore } from '@/stores/auth'
import CrearExpedienteView from '@/views/CrearExpedienteView.vue'
import ExpedienteDetalleView from '@/views/ExpedienteDetalleView.vue'
import ExpedientesView from '@/views/ExpedientesView.vue'
import LoginView from '@/views/LoginView.vue'
import PanelView from '@/views/PanelView.vue'
import ObservacionesView from '@/views/ObservacionesView.vue'
import TesisFinalView from '@/views/TesisFinalView.vue'
import DocumentosView from '@/views/DocumentosView.vue'
import FormatosView from '@/views/FormatosView.vue'
import NotificacionesView from '@/views/NotificacionesView.vue'
import PerfilView from '@/views/PerfilView.vue'
import AgendaView from '@/views/AgendaView.vue'
import AsesorJuradosView from '@/views/AsesorJuradosView.vue'
import UdiExpedientesView from '@/views/UdiExpedientesView.vue'
import UdiRevisionView from '@/views/UdiRevisionView.vue'

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
          path: 'udi/expedientes',
          name: 'udi-expedientes',
          component: UdiExpedientesView,
        },
        {
          path: 'udi/expedientes/:id/revision',
          name: 'udi-revision',
          component: UdiRevisionView,
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'dashboard' },
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
