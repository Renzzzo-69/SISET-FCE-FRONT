import { createRouter, createWebHistory } from 'vue-router'

import AuthenticatedLayout from '@/layouts/AuthenticatedLayout.vue'
import { useAuthStore } from '@/stores/auth'
import CrearExpedienteView from '@/views/CrearExpedienteView.vue'
import ExpedientesView from '@/views/ExpedientesView.vue'
import LoginView from '@/views/LoginView.vue'
import PanelView from '@/views/PanelView.vue'

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

  return true
})

export default router
