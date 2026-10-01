<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

type Persona = { nombre: string; correo: string | null; celular: string | null }
type Jurado = Persona & {
  cargo: string
  veredicto: string
  ronda: number | null
  comentarios: string | null
  archivo_observacion: string | null
  fecha_revision: string | null
}
type Historial = { accion: string; fecha: string; etapa: string; estado: string }
type Detalle = {
  expediente: {
    id: number
    codigo: string
    estado_codigo: string
    estado: string
    etapa_codigo: string
    etapa: string
    fecha_registro: string
  }
  informe: {
    titulo: string
    resumen: string
    version: number
    turnitin: number
    archivo: string
    fecha_revision: string | null
  }
  tesista: Persona & { escuela: string | null }
  asesoria: { asesor: Persona | null; coasesor: Persona | null }
  jurados: Jurado[]
  resolucion: { numero: string; archivo: string; fecha: string } | null
  historial: Historial[]
}

const props = defineProps<{
  kind: 'tesis' | 'proyecto'
  status: 'revision' | 'aprobada'
  responsibility: 'asesor' | 'jurado'
  id: number
}>()
const router = useRouter()
const detalle = ref<Detalle | null>(null)
const cargando = ref(true)
const error = ref('')
const label = computed(() => (props.kind === 'proyecto' ? 'Proyecto' : 'Tesis'))
const aprobada = computed(() => props.status === 'aprobada')
const progressWidth = computed(() => (aprobada.value ? '100%' : '66%'))

function archivoUrl(ruta: string | null | undefined) {
  if (!ruta) return null
  if (/^https?:\/\//i.test(ruta)) return ruta
  const base = String(api.defaults.baseURL ?? window.location.origin)
  const origin = new URL(base, window.location.origin).origin
  const limpia = ruta.replace(/^\/+/, '').replace(/^public\//, 'storage/')
  return `${origin}/${limpia}`
}
function fecha(valor: string | null) {
  return valor ? new Date(valor).toLocaleString('es-PE') : 'Sin fecha'
}
function veredictoClase(valor: string) {
  const v = valor.toLowerCase()
  if (v.includes('aprob') || v.includes('conforme'))
    return 'bg-secondary/10 border-secondary/20 text-secondary'
  if (v.includes('observ')) return 'bg-tertiary-container/10 border-tertiary/30 text-tertiary'
  return 'bg-surface-container-high border-outline-variant text-on-surface-variant'
}
function veredictoIcono(valor: string) {
  const v = valor.toLowerCase()
  return v.includes('aprob') || v.includes('conforme')
    ? 'check_circle'
    : v.includes('observ')
      ? 'info'
      : 'schedule'
}

async function cargar() {
  cargando.value = true
  error.value = ''
  detalle.value = null
  try {
    const { data } = await api.get<Detalle>(`/docente/expedientes/${props.id}/detalle`, {
      params: { tipo: props.kind, responsabilidad: props.responsibility },
    })
    detalle.value = data
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'No se pudo cargar el detalle del expediente.'
  } finally {
    cargando.value = false
  }
}
watch(() => [props.id, props.kind, props.responsibility], cargar, { immediate: true })
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    <header
      class="flex justify-between items-center h-[70px] px-gutter sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant shadow-sm"
    >
      <div class="flex items-center gap-3">
        <button class="p-2 rounded-full hover:bg-surface-container" @click="router.back()">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 class="font-headline-sm text-primary">Detalle de {{ label }}</h2>
      </div>
      <span class="text-sm text-on-surface-variant capitalize">{{ responsibility }}</span>
    </header>
    <main class="p-gutter lg:p-10 max-w-7xl mx-auto w-full">
      <div v-if="cargando" class="py-20 text-center text-on-surface-variant">
        Cargando información del expediente...
      </div>
      <div v-else-if="error" class="rounded-xl bg-error-container p-5 text-error">
        {{ error }} <button class="font-bold underline" @click="cargar">Reintentar</button>
      </div>
      <section v-else-if="detalle" class="space-y-6 pb-12">
        <div>
          <p class="text-sm font-bold text-primary">{{ detalle.expediente.codigo }}</p>
          <h3 class="font-headline-lg text-primary leading-tight uppercase">
            {{ detalle.informe.titulo }}
          </h3>
          <div class="flex flex-wrap gap-2 mt-3">
            <span class="px-3 py-1 rounded-full bg-primary-fixed text-primary text-xs font-bold">{{
              detalle.expediente.estado
            }}</span
            ><span class="px-3 py-1 rounded-full bg-surface-container text-xs">{{
              detalle.expediente.etapa
            }}</span
            ><span class="px-3 py-1 rounded-full bg-surface-container text-xs"
              >Versión {{ detalle.informe.version }}</span
            >
          </div>
        </div>

        <article
          class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 sm:p-8 shadow-sm overflow-x-auto"
        >
          <div class="relative flex justify-between items-start min-w-[620px] max-w-4xl mx-auto">
            <div class="absolute top-5 left-0 w-full h-1 bg-surface-container-high"></div>
            <div
              class="absolute top-5 left-0 h-1 bg-secondary"
              :style="{ width: progressWidth }"
            ></div>
            <div
              v-for="(paso, indice) in ['Solicitud', 'Revisión UDI', 'Jurados', 'Aprobación']"
              :key="paso"
              class="relative z-10 flex flex-col items-center gap-3"
            >
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center shadow"
                :class="
                  indice < (aprobada ? 4 : 2)
                    ? 'bg-secondary text-on-secondary'
                    : indice === (aprobada ? 3 : 2)
                      ? 'bg-white border-4 border-secondary text-secondary'
                      : 'bg-surface-container-high text-on-surface-variant'
                "
              >
                <span class="material-symbols-outlined">{{
                  indice < (aprobada ? 4 : 2) ? 'check' : indice === 2 ? 'gavel' : 'fact_check'
                }}</span>
              </div>
              <div class="text-center">
                <p class="text-label-md font-bold">{{ paso }}</p>
                <p class="text-[10px] uppercase">
                  {{
                    indice < (aprobada ? 4 : 2)
                      ? 'Completado'
                      : indice === (aprobada ? 3 : 2)
                        ? 'En progreso'
                        : 'Pendiente'
                  }}
                </p>
              </div>
            </div>
          </div>
        </article>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <article
            class="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm"
          >
            <div class="flex items-center gap-2 mb-4 text-primary">
              <span class="material-symbols-outlined">description</span>
              <h4 class="font-headline-sm">Información del {{ label }}</h4>
            </div>
            <p class="text-sm leading-relaxed text-on-surface-variant whitespace-pre-line">
              {{ detalle.informe.resumen }}
            </p>
            <div class="grid sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-outline-variant">
              <div>
                <p class="text-xs text-on-surface-variant">Turnitin</p>
                <p class="font-bold">{{ detalle.informe.turnitin }}%</p>
              </div>
              <div>
                <p class="text-xs text-on-surface-variant">Versión</p>
                <p class="font-bold">{{ detalle.informe.version }}</p>
              </div>
              <div>
                <p class="text-xs text-on-surface-variant">Fecha de registro</p>
                <p class="font-bold text-sm">{{ fecha(detalle.expediente.fecha_registro) }}</p>
              </div>
            </div>
          </article>
          <article
            class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm"
          >
            <div class="flex items-center gap-2 mb-4 text-primary">
              <span class="material-symbols-outlined">person</span>
              <h4 class="font-headline-sm">Tesista</h4>
            </div>
            <p class="font-bold">{{ detalle.tesista.nombre }}</p>
            <p class="text-sm text-on-surface-variant mt-2">
              {{ detalle.tesista.escuela ?? 'Escuela no registrada' }}
            </p>
            <p class="text-sm text-on-surface-variant">
              {{ detalle.tesista.correo ?? 'Sin correo' }}
            </p>
            <p class="text-sm text-on-surface-variant">
              {{ detalle.tesista.celular ?? 'Sin celular' }}
            </p>
          </article>
        </div>

        <article
          class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm"
        >
          <div class="flex items-center gap-2 mb-5 text-primary">
            <span class="material-symbols-outlined">school</span>
            <h4 class="font-headline-sm">Asesoría</h4>
          </div>
          <div class="grid md:grid-cols-2 gap-4">
            <div v-if="detalle.asesoria.asesor" class="p-4 rounded-xl bg-surface-container">
              <p class="text-xs font-bold uppercase text-primary">Asesor</p>
              <p class="font-bold mt-1">{{ detalle.asesoria.asesor.nombre }}</p>
              <p class="text-xs text-on-surface-variant">
                {{ detalle.asesoria.asesor.correo }} · {{ detalle.asesoria.asesor.celular }}
              </p>
            </div>
            <div v-if="detalle.asesoria.coasesor" class="p-4 rounded-xl bg-surface-container">
              <p class="text-xs font-bold uppercase text-primary">Coasesor</p>
              <p class="font-bold mt-1">{{ detalle.asesoria.coasesor.nombre }}</p>
              <p class="text-xs text-on-surface-variant">
                {{ detalle.asesoria.coasesor.correo }} · {{ detalle.asesoria.coasesor.celular }}
              </p>
            </div>
          </div>
        </article>

        <article
          class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm"
        >
          <div class="flex items-center gap-2 mb-6 text-primary">
            <span class="material-symbols-outlined">gavel</span>
            <h4 class="font-headline-sm">Evaluación de Jurados</h4>
          </div>
          <div v-if="!detalle.jurados.length" class="text-on-surface-variant">
            Aún no existe una terna de jurados vigente.
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              v-for="jurado in detalle.jurados"
              :key="`${jurado.cargo}-${jurado.nombre}`"
              class="border p-4 rounded-xl"
              :class="veredictoClase(jurado.veredicto)"
            >
              <p class="text-xs font-bold uppercase mb-1">{{ jurado.cargo }}</p>
              <p class="font-bold text-on-surface">{{ jurado.nombre }}</p>
              <div class="flex items-center gap-2 mt-2">
                <span class="material-symbols-outlined text-[18px]">{{
                  veredictoIcono(jurado.veredicto)
                }}</span
                ><span class="font-bold capitalize">{{ jurado.veredicto }}</span
                ><span v-if="jurado.ronda" class="text-xs">· Ronda {{ jurado.ronda }}</span>
              </div>
              <p v-if="jurado.comentarios" class="text-xs mt-2">{{ jurado.comentarios }}</p>
              <div class="mt-3 pt-3 border-t border-current/20">
                <p class="text-xs">{{ jurado.correo ?? 'Sin correo' }}</p>
                <p class="text-xs">{{ jurado.celular ?? 'Sin celular' }}</p>
              </div>
            </div>
          </div>
        </article>

        <article
          v-if="detalle.resolucion"
          class="bg-secondary/10 border border-secondary/20 rounded-2xl p-6"
        >
          <div class="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <p class="text-xs font-bold uppercase text-secondary">Resolución vigente</p>
              <p class="font-bold text-secondary text-lg">{{ detalle.resolucion.numero }}</p>
              <p class="text-sm text-on-surface-variant">
                Emitida el {{ fecha(detalle.resolucion.fecha) }}
              </p>
            </div>
            <a
              v-if="archivoUrl(detalle.resolucion.archivo)"
              :href="archivoUrl(detalle.resolucion.archivo)!"
              target="_blank"
              class="h-11 px-5 bg-secondary text-on-secondary rounded-lg font-bold flex items-center justify-center gap-2"
              ><span class="material-symbols-outlined">picture_as_pdf</span>Ver resolución</a
            >
          </div>
        </article>

        <article
          class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm"
        >
          <div class="flex items-center gap-2 mb-5 text-primary">
            <span class="material-symbols-outlined">history</span>
            <h4 class="font-headline-sm">Historial del expediente</h4>
          </div>
          <div v-if="!detalle.historial.length" class="text-on-surface-variant">
            No hay movimientos registrados.
          </div>
          <div v-else class="divide-y divide-outline-variant">
            <div
              v-for="(movimiento, indice) in detalle.historial"
              :key="indice"
              class="py-3 flex flex-col sm:flex-row sm:justify-between gap-1"
            >
              <div>
                <p class="font-medium">{{ movimiento.accion }}</p>
                <p class="text-xs text-on-surface-variant">
                  {{ movimiento.etapa }} · {{ movimiento.estado }}
                </p>
              </div>
              <p class="text-xs text-on-surface-variant">{{ fecha(movimiento.fecha) }}</p>
            </div>
          </div>
        </article>

        <div class="flex flex-wrap justify-end gap-4 py-6 border-t border-outline-variant">
          <a
            v-if="archivoUrl(detalle.informe.archivo)"
            :href="archivoUrl(detalle.informe.archivo)!"
            target="_blank"
            class="h-11 px-5 border border-primary text-primary rounded-lg font-bold flex items-center justify-center gap-2"
            ><span class="material-symbols-outlined">visibility</span>Ver informe</a
          ><button
            class="h-11 px-5 bg-primary text-white rounded-lg font-bold"
            @click="router.back()"
          >
            Volver al listado
          </button>
        </div>
      </section>
    </main>
  </div>
</template>
