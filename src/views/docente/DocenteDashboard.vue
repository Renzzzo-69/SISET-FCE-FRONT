<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

type Metricas = {
  tesis_asesoria: number
  proyectos_jurado: number
  tramites_revision: number
  tesis_aprobadas: number
  proyectos_aprobados: number
  jurados_completados: number
}
type Notificacion = {
  id_expediente: number
  codigo: string
  titulo: string
  tipo: 'tesis' | 'proyecto'
  responsabilidad: 'asesor' | 'jurado'
  estado: string
  nivel: 'urgente' | 'proximo' | 'aldia'
  tesista: string
  fecha: string
}
type Respuesta = {
  docente: { id: number; nombre: string; celular: string; correo: string }
  metricas: Metricas
  notificaciones: Notificacion[]
}
const router = useRouter()
const cargando = ref(true)
const error = ref('')
const busqueda = ref('')
const docente = ref({ id: 0, nombre: '', celular: '', correo: '' })
const metricas = ref<Metricas>({
  tesis_asesoria: 0,
  proyectos_jurado: 0,
  tramites_revision: 0,
  tesis_aprobadas: 0,
  proyectos_aprobados: 0,
  jurados_completados: 0,
})
const notificaciones = ref<Notificacion[]>([])
const visibles = computed(() => {
  const q = busqueda.value.trim().toLocaleLowerCase('es')
  return !q
    ? notificaciones.value
    : notificaciones.value.filter((n) =>
        `${n.codigo} ${n.titulo} ${n.tesista} ${n.estado}`.toLocaleLowerCase('es').includes(q),
      )
})
const actuales = computed(() => [
  {
    label: 'Tesis en Asesoría',
    valor: metricas.value.tesis_asesoria,
    detalle: 'Seguimiento activo',
    icono: 'school',
    color: 'primary',
    ruta: 'docente-asesor-tesis-revision',
  },
  {
    label: 'Proyectos como Jurado',
    valor: metricas.value.proyectos_jurado,
    detalle: 'En revisión',
    icono: 'gavel',
    color: 'tertiary',
    ruta: 'docente-jurado-proyectos-revision',
  },
  {
    label: 'Trámites en Revisión',
    valor: metricas.value.tramites_revision,
    detalle: 'Requieren seguimiento',
    icono: 'history_edu',
    color: 'secondary',
    ruta: null,
  },
])
const historicas = computed(() => [
  {
    label: 'Tesis Aprobadas',
    valor: metricas.value.tesis_aprobadas,
    detalle: 'Acumulado total',
    icono: 'task_alt',
    color: 'secondary',
    ruta: 'docente-asesor-tesis-aprobadas',
  },
  {
    label: 'Proyectos Aprobados',
    valor: metricas.value.proyectos_aprobados,
    detalle: 'Como asesor',
    icono: 'fact_check',
    color: 'primary',
    ruta: 'docente-asesor-proyectos-aprobados',
  },
  {
    label: 'Jurados Completados',
    valor: metricas.value.jurados_completados,
    detalle: 'Historial académico',
    icono: 'assignment_turned_in',
    color: 'outline',
    ruta: 'docente-jurado-proyectos-aprobados',
  },
])
function color(item: any) {
  return item.color === 'tertiary'
    ? 'border-on-tertiary-container text-on-tertiary-container'
    : item.color === 'secondary'
      ? 'border-secondary text-secondary'
      : item.color === 'outline'
        ? 'border-outline text-on-surface'
        : 'border-primary text-primary'
}
function nivel(n: string) {
  return n === 'urgente'
    ? {
        borde: 'border-error',
        icono: 'priority_high',
        texto: 'text-error',
        badge: 'bg-error-container text-on-error-container',
      }
    : n === 'proximo'
      ? {
          borde: 'border-tertiary',
          icono: 'schedule',
          texto: 'text-tertiary',
          badge: 'bg-tertiary-fixed text-on-tertiary-fixed',
        }
      : {
          borde: 'border-secondary',
          icono: 'task_alt',
          texto: 'text-secondary',
          badge: 'bg-secondary-container text-on-secondary-container',
        }
}
function abrir(n: Notificacion) {
  router.push({
    name:
      n.responsabilidad === 'jurado'
        ? n.tipo === 'tesis'
          ? 'docente-jurado-tesis-detalle'
          : 'docente-jurado-proyectos-detalle'
        : n.tipo === 'tesis'
          ? 'docente-asesor-tesis-detalle'
          : 'docente-asesor-proyectos-detalle',
    params: { id: n.id_expediente },
  })
}
async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<Respuesta>('/docente/dashboard')
    docente.value = data.docente
    metricas.value = data.metricas
    notificaciones.value = data.notificaciones
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'No se pudo cargar el panel del docente.'
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    <header
      class="flex justify-between items-center h-[70px] px-gutter sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant shadow-sm"
    >
      <h2 class="font-headline-sm text-headline-sm text-primary">Docente</h2>
      <div class="text-right hidden sm:block">
        <p class="font-headline-sm text-primary">
          <span class="font-medium">Bienvenido</span> {{ docente.nombre }}
        </p>
        <p class="text-label-md text-on-surface-variant">
          {{ docente.correo }}<span v-if="docente.celular"> · {{ docente.celular }}</span>
        </p>
      </div>
    </header>
    <div class="p-gutter lg:p-10 space-y-8 max-w-7xl mx-auto w-full">
      <div v-if="error" class="rounded-xl border border-error/30 bg-error-container p-4 text-error">
        {{ error }} <button class="font-bold underline" @click="cargar">Reintentar</button>
      </div>
      <div
        class="flex items-center bg-surface-container px-4 py-3 rounded-xl border border-outline-variant shadow-sm"
      >
        <span class="material-symbols-outlined text-outline mr-3">search</span
        ><input
          v-model="busqueda"
          class="bg-transparent border-none focus:ring-0 text-body-md w-full outline-none"
          placeholder="Buscar expedientes, alumnos o trámites..."
        />
      </div>
      <div v-if="cargando" class="py-20 text-center text-on-surface-variant">
        Cargando información del docente...
      </div>
      <template v-else>
        <section class="space-y-4">
          <h4 class="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest px-1">
            Actuales
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <button
              v-for="item in actuales"
              :key="item.label"
              type="button"
              class="text-left bg-surface-container-lowest p-5 rounded-xl border-l-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all"
              :class="color(item)"
              @click="item.ruta && router.push({ name: item.ruta })"
            >
              <div>
                <p class="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">
                  {{ item.label }}
                </p>
                <h3 class="font-headline-lg text-headline-lg">{{ item.valor }}</h3>
                <p class="text-[10px] mt-1 flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px]">sync</span>{{ item.detalle }}
                </p>
              </div>
              <div
                class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center"
              >
                <span class="material-symbols-outlined">{{ item.icono }}</span>
              </div>
            </button>
          </div>
        </section>
        <section class="space-y-4">
          <h4 class="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest px-1">
            Históricas
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <button
              v-for="item in historicas"
              :key="item.label"
              type="button"
              class="text-left bg-surface-container-lowest p-5 rounded-xl border-l-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all"
              :class="color(item)"
              @click="item.ruta && router.push({ name: item.ruta })"
            >
              <div>
                <p class="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">
                  {{ item.label }}
                </p>
                <h3 class="font-headline-lg text-headline-lg">{{ item.valor }}</h3>
                <p class="text-[10px] mt-1 flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px]">verified</span
                  >{{ item.detalle }}
                </p>
              </div>
              <div
                class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center"
              >
                <span class="material-symbols-outlined">{{ item.icono }}</span>
              </div>
            </button>
          </div>
        </section>
        <section class="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
          <div
            class="p-6 border-b border-outline-variant flex flex-col lg:flex-row justify-between gap-4 bg-surface-container-lowest"
          >
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-primary">notifications_active</span>
              <h4 class="font-headline-md text-headline-md text-primary">
                Control de Plazos y Notificaciones
              </h4>
            </div>
            <div class="flex flex-wrap gap-4">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-error"></span
                ><span class="text-label-sm">Urgente</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-tertiary"></span
                ><span class="text-label-sm">Próximo</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-secondary"></span
                ><span class="text-label-sm">Al día</span>
              </div>
            </div>
          </div>
          <div v-if="!visibles.length" class="p-10 text-center text-on-surface-variant">
            No existen trámites activos que coincidan con la búsqueda.
          </div>
          <div v-else class="divide-y divide-outline-variant/30">
            <article
              v-for="n in visibles"
              :key="n.id_expediente"
              class="group flex flex-col items-start gap-4 border-l-4 p-4 sm:flex-row sm:gap-5 sm:p-6"
              :class="nivel(n.nivel).borde"
            >
              <span class="material-symbols-outlined text-[28px]" :class="nivel(n.nivel).texto">{{
                nivel(n.nivel).icono
              }}</span>
              <div class="flex-1 flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <h6 class="font-headline-sm text-on-surface">{{ n.estado }}: {{ n.codigo }}</h6>
                  <p class="text-body-md text-on-surface-variant">{{ n.titulo }}</p>
                  <div class="flex flex-wrap gap-4 mt-3 text-label-sm text-on-surface-variant">
                    <span>{{ n.tesista }}</span
                    ><span class="capitalize">Como {{ n.responsabilidad }}</span
                    ><span>{{ new Date(n.fecha).toLocaleDateString('es-PE') }}</span>
                  </div>
                </div>
                <div
                  class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center md:flex-col md:items-end"
                >
                  <span
                    class="w-[120px] py-1 rounded-full uppercase text-[11px] font-bold text-center"
                    :class="nivel(n.nivel).badge"
                    >{{ n.nivel === 'aldia' ? 'Al día' : n.nivel }}</span
                  ><button
                    class="w-full rounded-lg bg-primary px-4 py-2 text-label-md font-bold text-on-primary sm:w-auto"
                    @click="abrir(n)"
                  >
                    Revisar ahora
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>
      </template>
    </div>
    <footer
      class="flex flex-col sm:flex-row justify-between items-center mt-auto pt-8 border-t border-outline-variant text-on-surface-variant gap-4 p-gutter"
    >
      <p class="text-label-sm">© 2026 Facultad de Ciencias Económicas</p>
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
        <p class="text-[10px] font-bold uppercase tracking-widest">Sistema Operativo</p>
      </div>
    </footer>
  </div>
</template>
