<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api, { descargarDocumentoPrivado, verDocumentoPrivado } from '@/services/api'

type Persona = { nombre: string; correo: string | null; celular: string | null }
type Jurado = Persona & {
  cargo: string
  veredicto: string
  ronda: number | null
  comentarios: string | null
  archivo_observacion: string | null
  fecha_revision: string | null
  rondas: Array<{
    numero: number
    veredicto: string
    fecha_revision: string
    observaciones: { nombre: string; archivo: string } | null
    levantamiento: { nombre: string; fecha: string | null; archivo: string } | null
  }>
}
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
    id: number
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
  mi_revision: { veredicto: string; comentarios: string | null; ronda: number; fecha: string } | null
  plantilla_observaciones: { nombre: string; archivo: string } | null
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
const procesando = ref(false)
const mostrarObservaciones = ref(false)
const mostrarAprobacion = ref(false)
const mostrarObservacionEnviada = ref(false)
const archivoObservaciones = ref<File | null>(null)
const errorObservaciones = ref('')
const aviso = ref('')
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

async function verInforme() {
  if (!detalle.value) return
  aviso.value = ''
  try {
    await verDocumentoPrivado(
      `/api/expedientes/${props.id}/informes/${detalle.value.informe.id}/documento`,
    )
  } catch (e: any) {
    aviso.value = e.response?.data?.message ?? e.message ?? 'No se pudo abrir el informe.'
  }
}

async function descargarDocumentoRonda(ruta: string, nombre: string) {
  aviso.value = ''
  try {
    await descargarDocumentoPrivado(ruta, nombre.replace(/\.[^.]+$/, ''))
  } catch (e: any) {
    aviso.value = e.response?.data?.message ?? e.message ?? 'No se pudo descargar el documento.'
  }
}

async function registrarEvaluacion(veredicto: 'Aprobado' | 'Observado') {
  if (veredicto === 'Observado' && !archivoObservaciones.value) {
    aviso.value = 'Seleccione el documento que contiene sus observaciones.'
    return
  }

  procesando.value = true
  aviso.value = ''
  errorObservaciones.value = ''
  try {
    const payload = new FormData()
    payload.append('veredicto', veredicto)
    if (veredicto === 'Observado' && archivoObservaciones.value) {
      payload.append('archivo_observacion', archivoObservaciones.value)
    }
    const { data } = await api.post(
      `/docente/expedientes/${props.id}/revision-jurado`,
      payload,
      { timeout: 20_000 },
    )
    mostrarObservaciones.value = false
    mostrarAprobacion.value = false
    archivoObservaciones.value = null
    if (veredicto === 'Observado') mostrarObservacionEnviada.value = true
    await cargar()
    aviso.value = data.message
  } catch (e: any) {
    const errores = Object.values(e.response?.data?.errors ?? {}).flat().join(' ')
    const mensaje = e.code === 'ECONNABORTED'
      ? 'El servidor tardó demasiado en responder. Verifique la conexión con la base de datos e inténtelo nuevamente.'
      : e.response?.data?.message || errores || e.message || 'No se pudo registrar la evaluación.'
    if (veredicto === 'Observado') errorObservaciones.value = mensaje
    else aviso.value = mensaje
  } finally {
    procesando.value = false
  }
}

function abrirObservaciones() {
  procesando.value = false
  archivoObservaciones.value = null
  errorObservaciones.value = ''
  aviso.value = ''
  mostrarObservaciones.value = true
}

function seleccionarArchivo(event: Event) {
  const input = event.target as HTMLInputElement
  archivoObservaciones.value = input.files?.[0] ?? null
}

async function descargarPlantilla() {
  if (!detalle.value?.plantilla_observaciones) return
  aviso.value = ''
  try {
    await descargarDocumentoPrivado(
      detalle.value.plantilla_observaciones.archivo,
      detalle.value.plantilla_observaciones.nombre,
    )
  } catch (e: any) {
    aviso.value = e.response?.data?.message ?? e.message ?? 'No se pudo descargar la plantilla.'
  }
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
        <div v-if="aviso" class="rounded-xl border border-primary/20 bg-primary/5 p-4 text-primary">{{ aviso }}</div>
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
          class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm"
        >
          <div class="mb-6 flex flex-col gap-1 border-b border-outline-variant pb-4">
            <div class="flex items-center gap-2 text-primary">
              <span class="material-symbols-outlined">cycle</span>
              <h4 class="font-headline-sm">Rondas de evaluación</h4>
            </div>
            <p class="text-sm text-on-surface-variant">
              Historial de observaciones enviadas por los jurados y correcciones presentadas por el tesista.
            </p>
          </div>

          <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <section
              v-for="jurado in detalle.jurados"
              :key="`rondas-${jurado.cargo}-${jurado.nombre}`"
              class="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low"
            >
              <header class="bg-primary px-4 py-3 text-white">
                <p class="font-bold leading-tight">{{ jurado.nombre }}</p>
                <p class="mt-0.5 text-xs text-white/80">{{ jurado.cargo }}</p>
              </header>

              <div v-if="jurado.rondas.length" class="space-y-3 p-4">
                <div
                  v-for="ronda in jurado.rondas"
                  :key="`${jurado.nombre}-${ronda.numero}`"
                  class="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest"
                >
                  <div class="flex items-center justify-between border-b border-outline-variant px-3 py-2">
                    <strong class="text-sm">Ronda {{ ronda.numero }}</strong>
                    <span class="text-xs text-on-surface-variant">{{ fecha(ronda.fecha_revision) }}</span>
                  </div>

                  <div v-if="ronda.veredicto === 'Aprobado'" class="flex items-center gap-2 px-3 py-4 font-bold text-secondary">
                    <span class="material-symbols-outlined">check_circle</span>Aprobado
                  </div>
                  <div v-else class="space-y-2 p-3">
                    <button
                      v-if="ronda.observaciones"
                      type="button"
                      class="flex w-full items-center justify-between rounded-lg bg-tertiary/10 px-3 py-2.5 text-left text-sm font-bold text-tertiary transition hover:bg-tertiary/15"
                      @click="descargarDocumentoRonda(ronda.observaciones.archivo, ronda.observaciones.nombre)"
                    >
                      <span class="flex items-center gap-2"><span class="material-symbols-outlined !text-xl">download</span>Descargar observaciones enviadas</span>
                      <span class="material-symbols-outlined !text-lg">download</span>
                    </button>
                    <button
                      v-if="ronda.levantamiento"
                      type="button"
                      class="flex w-full items-center justify-between rounded-lg bg-secondary/10 px-3 py-2.5 text-left text-sm font-bold text-secondary transition hover:bg-secondary/15"
                      @click="descargarDocumentoRonda(ronda.levantamiento.archivo, ronda.levantamiento.nombre)"
                    >
                      <span class="flex items-center gap-2"><span class="material-symbols-outlined !text-xl">download</span>Descargar observaciones levantadas</span>
                      <span class="material-symbols-outlined !text-lg">download</span>
                    </button>
                    <div
                      class="rounded-md px-3 py-2 text-center text-xs font-bold"
                      :class="ronda.levantamiento ? 'bg-secondary text-white' : 'bg-tertiary-container text-on-tertiary-container'"
                    >
                      {{ ronda.levantamiento ? 'Corrección recibida · En revisión' : 'Esperando respuesta del tesista' }}
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="p-6 text-center text-sm text-on-surface-variant">
                <span class="material-symbols-outlined mb-2 block">hourglass_empty</span>
                Aún no registra evaluaciones.
              </div>
            </section>
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

        <div class="flex flex-wrap justify-end gap-4 py-6 border-t border-outline-variant">
          <button
            v-if="detalle.informe.archivo"
            type="button"
            class="h-11 px-5 border border-primary text-primary rounded-lg font-bold flex items-center justify-center gap-2"
            @click="verInforme"
            ><span class="material-symbols-outlined">visibility</span>Ver informe</button>
          <template v-if="responsibility === 'jurado'">
            <button type="button" class="h-11 px-5 border border-tertiary text-tertiary rounded-lg font-bold flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50" :disabled="detalle.mi_revision?.veredicto === 'Aprobado'" @click="abrirObservaciones">
              <span class="material-symbols-outlined">edit_note</span>Realizar observaciones
            </button>
            <button type="button" class="h-11 px-5 border-2 border-secondary text-secondary rounded-lg font-bold flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50" :disabled="procesando || detalle.mi_revision?.veredicto === 'Aprobado'" @click="mostrarAprobacion = true">
              <span class="material-symbols-outlined">check_circle</span>{{ detalle.mi_revision?.veredicto === 'Aprobado' ? 'Informe aprobado' : 'Aprobar informe' }}
            </button>
          </template>
          <button
            class="h-11 px-5 bg-primary text-white rounded-lg font-bold"
            @click="router.back()"
          >
            Volver al listado
          </button>
        </div>
      </section>
    </main>

    <Teleport to="body">
      <div v-if="mostrarObservaciones" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-observaciones">
        <div class="w-full max-w-lg overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl">
          <div class="border-b border-outline-variant px-6 py-5">
            <div class="flex items-center gap-3">
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tertiary/10 text-tertiary">
                <span class="material-symbols-outlined">edit_document</span>
              </div>
              <div>
                <h3 id="titulo-observaciones" class="text-xl font-bold text-primary">Realizar observaciones</h3>
                <p class="mt-0.5 text-sm text-on-surface-variant">Adjunte el documento con la revisión del informe.</p>
              </div>
            </div>
          </div>

          <div class="p-6">
            <div v-if="errorObservaciones" class="mb-4 rounded-xl border border-error/20 bg-error-container p-3 text-sm font-medium text-error">
              {{ errorObservaciones }}
            </div>
            <label class="group flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low p-6 text-center transition hover:border-primary hover:bg-primary/5">
              <input class="sr-only" type="file" accept=".pdf,.docx" @change="seleccionarArchivo" />
              <span class="material-symbols-outlined mb-3 !text-4xl text-primary">upload_file</span>
              <span class="font-bold text-on-surface">
                {{ archivoObservaciones ? archivoObservaciones.name : 'Seleccionar documento' }}
              </span>
              <span class="mt-1 text-sm text-on-surface-variant">
                {{ archivoObservaciones ? `${(archivoObservaciones.size / 1024 / 1024).toFixed(2)} MB` : 'PDF o DOCX · Máximo 20 MB' }}
              </span>
            </label>

            <p v-if="!detalle?.plantilla_observaciones" class="mt-3 text-xs text-on-surface-variant">
              Decanatura todavía no ha publicado la plantilla de observaciones.
            </p>
          </div>

          <div class="grid gap-3 border-t border-outline-variant bg-surface-container-low px-6 py-5 sm:grid-cols-3">
            <button type="button" class="h-11 rounded-xl border border-primary px-4 font-bold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50" :disabled="procesando || !detalle?.plantilla_observaciones" @click="descargarPlantilla">
              <span class="inline-flex items-center gap-2"><span class="material-symbols-outlined !text-xl">download</span>Plantilla</span>
            </button>
            <button type="button" class="h-11 rounded-xl border border-outline-variant px-4 font-bold text-on-surface transition hover:bg-surface-container disabled:opacity-50" :disabled="procesando" @click="mostrarObservaciones = false">Cancelar</button>
            <button
              type="button"
              class="flex h-11 items-center justify-center gap-2 rounded-xl px-4 font-bold transition disabled:cursor-not-allowed"
              :class="archivoObservaciones && !procesando
                ? 'bg-primary text-white shadow-md hover:bg-primary/90'
                : 'bg-surface-container-high text-on-surface-variant opacity-70'"
              :disabled="procesando || !archivoObservaciones"
              @click="registrarEvaluacion('Observado')"
            >
              {{ procesando ? 'Enviando...' : 'Enviar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="mostrarObservacionEnviada" class="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-observacion-enviada">
        <div class="w-full max-w-sm rounded-2xl border border-outline-variant bg-surface-container-lowest p-7 text-center shadow-2xl">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10 text-secondary">
            <span class="material-symbols-outlined !text-4xl">check_circle</span>
          </div>
          <h3 id="titulo-observacion-enviada" class="mt-5 text-xl font-bold text-primary">Observación enviada</h3>
          <p class="mt-2 text-sm text-on-surface-variant">La observación se registró y envió correctamente.</p>
          <button type="button" class="mt-6 h-11 w-full rounded-xl bg-primary font-bold text-white transition hover:bg-primary/90" @click="mostrarObservacionEnviada = false">Aceptar</button>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="mostrarAprobacion" class="fixed inset-0 z-[100] flex items-center justify-center bg-on-background/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-confirmar-aprobacion" @click.self="mostrarAprobacion = false">
        <div class="w-full max-w-md rounded-2xl bg-surface-container-lowest p-8 shadow-2xl">
          <div class="flex flex-col items-center space-y-6 text-center">
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
              <span class="material-symbols-outlined !text-4xl text-secondary">check_circle</span>
            </div>
            <div class="space-y-2">
              <h3 id="titulo-confirmar-aprobacion" class="font-headline-md text-on-surface">¿Seguro que desea aprobar el informe?</h3>
              <p class="text-body-md text-on-surface-variant">Esta acción confirmará su aprobación del {{ label.toLowerCase() }} y no podrá deshacerse sin intervención administrativa.</p>
            </div>
            <div class="flex w-full flex-col gap-3 sm:flex-row">
              <button type="button" class="h-12 flex-1 rounded-xl bg-primary-container font-bold text-white transition-all hover:brightness-110 disabled:opacity-50" :disabled="procesando" @click="registrarEvaluacion('Aprobado')">{{ procesando ? 'Aprobando...' : 'Sí, estoy seguro' }}</button>
              <button type="button" class="h-12 flex-1 rounded-xl border border-outline font-bold text-on-surface-variant hover:bg-surface-variant/50" :disabled="procesando" @click="mostrarAprobacion = false">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
