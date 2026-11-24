<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import api, { verDocumentoPrivado } from '@/services/api'

type Expediente = {
  id: number
  codigo: string
  tesista: string
  estado: string
  estado_codigo: string
}
type Contexto = Expediente & {
  titulo: string
  escuela: string
  asesor: string
  coasesor: string | null
}
type Docente = {
  id: number
  iniciales: string
  nombre: string
  id_escuela: number
  escuela: string
  id_area: number
  area: string
  carga: number
  estado_carga: 'Asesor' | 'Disponible' | 'Moderado' | 'Sobrecargado'
  no_seleccionable: boolean
}
type Catalogo = { id: number; nombre: string }
type Propuesta = {
  id: number
  version: number
  fecha_propuesta: string
  fecha_revision: string | null
  id_resolucion: number | null
  resolucion: { numero: string; fecha: string; archivo: string } | null
  jurados: { id_docente: number; cargo: string }[]
}
type Respuesta = {
  expedientes: Expediente[]
  contexto: Contexto | null
  docentes: Docente[]
  filtros: { escuelas: Catalogo[]; areas: Catalogo[] }
  propuesta: Propuesta | null
}

const router = useRouter()
const route = useRoute()
const roles = ['Presidente', 'Secretario', 'Vocal']
const maxJurados = 3
const cargando = ref(true)
const error = ref('')
const aviso = ref('')
const exito = ref('')
const validando = ref(false)
const mostrarConfirmacion = ref(false)
const expedientes = ref<Expediente[]>([])
const expedienteSeleccionado = ref<number | null>(null)
const contexto = ref<Contexto | null>(null)
const docentes = ref<Docente[]>([])
const escuelas = ref<Catalogo[]>([])
const areas = ref<Catalogo[]>([])
const busqueda = ref('')
const escuelaSeleccionada = ref<number | ''>('')
const areaSeleccionada = ref<number | ''>('')
const seleccionados = ref<Record<number, string>>({})
const propuesta = ref<Propuesta | null>(null)
const propuestaOriginal = ref<Record<number, string>>({})

const docentesFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase('es')

  return docentes.value.filter((docente) => {
    const coincideNombre = !termino || docente.nombre.toLocaleLowerCase('es').includes(termino)
    const coincideEscuela =
      escuelaSeleccionada.value === '' || docente.id_escuela === escuelaSeleccionada.value
    const coincideArea = areaSeleccionada.value === '' || docente.id_area === areaSeleccionada.value
    return coincideNombre && coincideEscuela && coincideArea
  })
})

const cantidadSeleccionados = computed(() => Object.keys(seleccionados.value).length)
const docentesSeleccionados = computed(() =>
  docentes.value.filter((docente) => docente.id in seleccionados.value),
)
const esDerivacionSecretaria = computed(
  () => contexto.value?.estado_codigo === 'derivado_decanatura',
)
const esDesignacionFinal = computed(() => contexto.value?.estado_codigo === 'jurados_designados')

async function cargarDatos(id?: number | null) {
  cargando.value = true
  error.value = ''
  aviso.value = ''
  exito.value = ''

  try {
    const { data } = await api.get<Respuesta>('/decanatura/asignacion-jurados', {
      params: id ? { expediente_id: id } : undefined,
    })
    expedientes.value = data.expedientes
    contexto.value = data.contexto
    docentes.value = data.docentes
    escuelas.value = data.filtros.escuelas
    areas.value = data.filtros.areas
    expedienteSeleccionado.value = data.contexto?.id ?? null
    propuesta.value = data.propuesta
    propuestaOriginal.value = Object.fromEntries(
      (data.propuesta?.jurados ?? []).map((jurado) => [jurado.id_docente, jurado.cargo]),
    )
    seleccionados.value = { ...propuestaOriginal.value }
  } catch {
    error.value = 'No se pudo cargar la información de asignación desde la base de datos.'
  } finally {
    cargando.value = false
  }
}

function cambiarExpediente() {
  cargarDatos(expedienteSeleccionado.value)
}

function alternarDocente(docente: Docente, marcado: boolean) {
  aviso.value = ''
  if (docente.no_seleccionable || esDerivacionSecretaria.value) return

  if (!marcado) {
    delete seleccionados.value[docente.id]
    return
  }

  if (cantidadSeleccionados.value >= maxJurados) {
    aviso.value = 'Solo puede seleccionar tres docentes.'
    return
  }

  seleccionados.value[docente.id] = ''
}

function restaurarPropuesta() {
  seleccionados.value = { ...propuestaOriginal.value }
  aviso.value = ''
  exito.value = ''
}

async function validarSeleccion() {
  if (!expedienteSeleccionado.value || !propuesta.value) {
    aviso.value = 'UDI todavía no ha registrado una propuesta para este expediente.'
    return
  }

  if (esDerivacionSecretaria.value) {
    validando.value = true
    aviso.value = ''
    exito.value = ''
    try {
      const { data } = await api.post(
        `/decanatura/asignacion-jurados/${expedienteSeleccionado.value}/derivar-secretaria`,
      )
      exito.value = data.message
      mostrarConfirmacion.value = true
    } catch (e: any) {
      const errores = e.response?.data?.errors
      aviso.value =
        e.response?.data?.message ??
        (errores
          ? Object.values(errores).flat().join(' ')
          : 'No se pudo derivar el expediente a Secretaría Académica.')
    } finally {
      validando.value = false
    }
    return
  }

  const cargos = Object.values(seleccionados.value)
  if (
    cantidadSeleccionados.value !== maxJurados ||
    cargos.some((cargo) => !cargo) ||
    new Set(cargos).size !== maxJurados
  ) {
    aviso.value = 'Seleccione exactamente tres docentes y asigne un cargo diferente a cada uno.'
    return
  }

  validando.value = true
  aviso.value = ''
  exito.value = ''
  try {
    const jurados = Object.entries(seleccionados.value).map(([id, cargo]) => ({
      id_docente: Number(id),
      cargo,
    }))
    const { data } = await api.post(
      `/decanatura/asignacion-jurados/${expedienteSeleccionado.value}/validar`,
      { jurados },
    )
    propuesta.value = data.propuesta
    propuestaOriginal.value = { ...seleccionados.value }
    exito.value = data.message
    mostrarConfirmacion.value = true
  } catch (e: any) {
    const errores = e.response?.data?.errors
    aviso.value =
      e.response?.data?.message ??
      (errores ? Object.values(errores).flat().join(' ') : 'No se pudo validar la terna.')
  } finally {
    validando.value = false
  }
}

function finalizarValidacion() {
  mostrarConfirmacion.value = false
  router.replace({ name: 'decanatura-asignacion' })
}

onMounted(() => {
  const expedienteId = Number(route.params.id)
  cargarDatos(Number.isInteger(expedienteId) && expedienteId > 0 ? expedienteId : null)
})
</script>

<template>
  <div class="assignment-page pb-24">
    <div class="flex items-center gap-4 mb-8">
      <button
        type="button"
        class="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-surface-container"
        @click="router.back()"
      >
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div>
        <h2 class="font-headline-md text-headline-md text-primary">
          Asignación Individual de Jurados
        </h2>
        <nav class="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
          <span>Decanatura</span
          ><span class="material-symbols-outlined !text-sm">chevron_right</span>
          <span class="text-primary font-bold">Asignación de Jurados</span>
        </nav>
      </div>
    </div>

    <div
      v-if="error"
      class="mb-5 rounded-xl border border-status-error/30 bg-error-container px-4 py-3 text-status-error"
    >
      {{ error }}
      <button
        type="button"
        class="font-bold underline"
        @click="cargarDatos(expedienteSeleccionado)"
      >
        Reintentar
      </button>
    </div>
    <div
      v-if="aviso"
      class="mb-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-primary"
    >
      {{ aviso }}
    </div>
    <div
      v-if="exito"
      class="mb-5 rounded-xl border border-secondary/30 bg-secondary-container/30 px-4 py-3 text-on-secondary-container"
    >
      {{ exito }}
    </div>

    <div
      class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm mb-6 overflow-hidden"
    >
      <div
        class="bg-surface-container-low px-card-padding py-3 border-b border-outline-variant/30 flex flex-wrap justify-between items-center gap-3"
      >
        <h3 class="font-headline-sm text-headline-sm text-primary">
          Contexto del Proyecto de Tesis
        </h3>
        <select
          v-model="expedienteSeleccionado"
          class="w-full sm:w-auto sm:min-w-64 px-3 py-2 bg-white border border-outline-variant rounded-lg"
          :disabled="cargando || !expedientes.length"
          @change="cambiarExpediente"
        >
          <option v-if="!expedientes.length" :value="null">No hay expedientes disponibles</option>
          <option v-for="expediente in expedientes" :key="expediente.id" :value="expediente.id">
            {{ expediente.codigo }} — {{ expediente.tesista }}
          </option>
        </select>
      </div>
      <div v-if="contexto" class="p-card-padding grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="md:col-span-2">
          <label
            class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider"
            >Título de la Tesis</label
          >
          <p class="font-headline-sm text-headline-sm text-on-surface mt-1">
            {{ contexto.titulo }}
          </p>
          <span
            class="inline-block mt-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
            >{{ contexto.estado }}</span
          >
        </div>
        <div>
          <label
            class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider"
            >Estudiante / Investigador</label
          >
          <div class="flex items-center gap-3 mt-1">
            <span class="material-symbols-outlined text-secondary">person</span>
            <p class="font-body-md text-body-md font-bold text-on-surface">
              {{ contexto.tesista }} ({{ contexto.codigo }})
            </p>
          </div>
          <p class="font-label-md text-label-md text-on-surface-variant ml-8">
            {{ contexto.escuela }}
          </p>
        </div>
        <div class="md:border-l border-outline-variant/20 md:pl-6">
          <label
            class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider"
            >Asesor Actual</label
          >
          <div class="flex items-center gap-3 mt-1">
            <span class="material-symbols-outlined text-secondary">school</span>
            <p class="font-body-md text-body-md font-bold text-on-surface">{{ contexto.asesor }}</p>
          </div>
          <p v-if="contexto.coasesor" class="mt-2 text-sm text-on-surface-variant">
            Coasesor: {{ contexto.coasesor }}
          </p>
        </div>
      </div>
      <div v-else class="p-card-padding text-center text-on-surface-variant">
        No hay un expediente activo para mostrar.
      </div>
    </div>

    <div
      v-if="contexto"
      class="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-card-padding"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-3">
          <span class="material-symbols-outlined text-primary">how_to_reg</span>
          <div>
            <h3 class="font-bold text-primary">Propuesta enviada por UDI</h3>
            <p v-if="propuesta && esDerivacionSecretaria" class="text-sm text-on-surface-variant">
              Esta es la terna propuesta por UDI. En esta etapa solo corresponde derivar el
              expediente a Secretaría Académica para que registre la resolución.
            </p>
            <p v-else-if="propuesta" class="text-sm text-on-surface-variant">
              Secretaría ya registró la resolución. Revise la terna propuesta, cambie integrantes o
              cargos si corresponde y confirme la designación definitiva.
            </p>
            <p v-else class="text-sm text-error">
              UDI todavía no ha enviado una propuesta de terna para este expediente.
            </p>
          </div>
        </div>
        <div v-if="esDesignacionFinal" class="flex flex-wrap items-center gap-2">
          <button
            v-if="propuesta?.resolucion"
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5"
            @click="verDocumentoPrivado(propuesta.resolucion.archivo)"
          >
            <span class="material-symbols-outlined !text-lg">visibility</span>Ver resolución
          </button>
          <span
            class="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container"
            >Resolución {{ propuesta?.resolucion?.numero ?? 'registrada' }}</span
          >
        </div>
        <span
          v-else-if="propuesta"
          class="rounded-full bg-warning-container px-3 py-1 text-xs font-bold text-on-warning-container"
          >Pendiente de derivación</span
        >
      </div>
    </div>

    <div
      class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm mb-6 p-card-padding"
    >
      <h3 class="font-headline-sm text-headline-sm text-primary mb-4 flex items-center gap-2">
        <span class="material-symbols-outlined">filter_list</span>Criterios de Búsqueda de Jurados
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="md:col-span-2">
          <label class="font-label-md text-label-md text-on-surface-variant mb-1 block"
            >Nombre del Docente</label
          >
          <div class="relative">
            <span
              class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline"
              >search</span
            ><input
              v-model="busqueda"
              class="w-full pl-10 pr-4 py-2 bg-white border border-outline-variant rounded-lg"
              placeholder="Buscar por apellido o nombre..."
              type="text"
            />
          </div>
        </div>
        <div>
          <label class="font-label-md text-label-md text-on-surface-variant mb-1 block"
            >Escuela</label
          >
          <select
            v-model="escuelaSeleccionada"
            class="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg"
          >
            <option value="">Todas</option>
            <option v-for="escuela in escuelas" :key="escuela.id" :value="escuela.id">
              {{ escuela.nombre }}
            </option>
          </select>
        </div>
        <div>
          <label class="font-label-md text-label-md text-on-surface-variant mb-1 block"
            >Área de investigación</label
          >
          <select
            v-model="areaSeleccionada"
            class="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg"
          >
            <option value="">Todas</option>
            <option v-for="area in areas" :key="area.id" :value="area.id">{{ area.nombre }}</option>
          </select>
        </div>
      </div>
    </div>

    <div
      class="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] 2xl:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div
        class="min-w-0 bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden"
        :class="{ 'opacity-60': cargando }"
      >
        <div
          class="bg-surface-container-low px-card-padding py-3 flex justify-between items-center border-b border-outline-variant/30"
        >
          <h3 class="font-headline-sm text-headline-sm text-primary">Docentes Disponibles</h3>
          <span
            class="font-label-sm text-label-sm bg-primary/10 text-primary px-3 py-1 rounded-full"
            >Total: {{ docentesFiltrados.length }} docentes</span
          >
        </div>
        <div
          class="hidden border-b border-outline-variant/30 bg-surface-container-low/50 px-6 py-3 text-xs font-bold uppercase tracking-wide text-outline xl:grid xl:grid-cols-[minmax(14rem,1fr)_9rem_11rem_auto] xl:gap-4"
        >
          <span>Nombre y escuela</span><span class="text-center">Estado / carga</span
          ><span>Definir cargo</span><span>Acción</span>
        </div>
        <div class="divide-y divide-outline-variant/20">
          <div
            v-for="docente in docentesFiltrados"
            :key="docente.id"
            class="grid gap-4 px-4 py-5 transition-colors sm:px-6 xl:grid-cols-[minmax(14rem,1fr)_9rem_11rem_auto] xl:items-center"
            :class="
              docente.no_seleccionable
                ? 'bg-surface-container-high/20 opacity-60'
                : 'hover:bg-surface-container-low'
            "
          >
            <div class="flex min-w-0 items-center gap-3">
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary-fixed font-bold text-on-secondary-fixed"
              >
                {{ docente.iniciales }}
              </div>
              <div class="min-w-0">
                <p class="font-bold leading-snug text-on-surface">{{ docente.nombre }}</p>
                <p class="mt-1 text-xs leading-relaxed text-on-surface-variant">
                  {{ docente.escuela }} · {{ docente.area }}
                </p>
              </div>
            </div>

            <div class="flex items-center justify-between gap-3 xl:justify-center">
              <span class="text-xs font-bold uppercase tracking-wide text-outline xl:hidden"
                >Estado</span
              >
              <span
                class="inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1.5 text-sm text-on-surface-variant"
                ><span
                  class="status-dot"
                  :class="
                    docente.estado_carga === 'Disponible'
                      ? 'bg-green-500'
                      : docente.estado_carga === 'Moderado'
                        ? 'bg-yellow-500'
                        : 'bg-error'
                  "
                ></span
                >{{
                  docente.estado_carga === 'Asesor'
                    ? 'Asesor del proyecto'
                    : `${docente.estado_carga} (${docente.carga})`
                }}</span
              >
            </div>

            <div class="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 xl:block">
              <span class="text-xs font-bold uppercase tracking-wide text-outline xl:hidden"
                >Cargo</span
              >
              <select
                v-model="seleccionados[docente.id]"
                :disabled="
                  esDerivacionSecretaria ||
                  docente.no_seleccionable ||
                  !(docente.id in seleccionados)
                "
                class="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-surface-container"
              >
                <option value="">Seleccionar cargo...</option>
                <option v-for="rol in roles" :key="rol" :value="rol">{{ rol }}</option>
              </select>
            </div>

            <label
              class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-outline-variant/40 px-3 py-2 xl:justify-center xl:border-0 xl:p-0"
              :class="docente.no_seleccionable ? 'cursor-not-allowed' : ''"
            >
              <span class="text-xs font-bold uppercase tracking-wide text-outline xl:hidden"
                >Seleccionar</span
              >
              <input
                type="checkbox"
                :disabled="esDerivacionSecretaria || docente.no_seleccionable"
                class="h-5 w-5 rounded accent-primary"
                :checked="docente.id in seleccionados"
                @change="
                  (evento: Event) =>
                    alternarDocente(docente, (evento.target as HTMLInputElement).checked)
                "
              />
            </label>
          </div>
          <div
            v-if="!cargando && docentesFiltrados.length === 0"
            class="px-6 py-10 text-center text-on-surface-variant"
          >
            No se encontraron docentes con esos criterios.
          </div>
          <div v-if="cargando" class="px-6 py-10 text-center text-on-surface-variant">
            Cargando docentes...
          </div>
        </div>
        <div class="p-card-padding border-t border-outline-variant/30 bg-surface-container-lowest">
          <p class="text-on-surface-variant text-sm italic">
            Seleccione exactamente tres jurados con cargos distintos. El asesor y coasesor no pueden
            integrar la terna.
          </p>
        </div>
      </div>

      <aside
        class="xl:sticky xl:top-6 rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm overflow-hidden"
      >
        <div class="border-b border-outline-variant/30 bg-surface-container-low px-5 py-4">
          <div class="flex items-center justify-between gap-3">
            <h3 class="font-headline-sm text-primary">Terna seleccionada</h3>
            <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
              >{{ cantidadSeleccionados }}/{{ maxJurados }}</span
            >
          </div>
          <p class="mt-1 text-xs text-on-surface-variant">
            Los cambios de la lista se reflejan aquí.
          </p>
        </div>

        <div class="space-y-3 p-4">
          <div
            v-for="docente in docentesSeleccionados"
            :key="docente.id"
            class="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3"
          >
            <div class="flex items-start gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container font-bold text-on-secondary-container"
              >
                {{ docente.iniciales }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-bold text-on-surface" :title="docente.nombre">
                  {{ docente.nombre }}
                </p>
                <p class="truncate text-xs text-on-surface-variant">{{ docente.escuela }}</p>
                <span
                  class="mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold"
                  :class="
                    seleccionados[docente.id]
                      ? 'bg-primary-container text-white'
                      : 'bg-warning-container text-on-warning-container'
                  "
                  >{{ seleccionados[docente.id] || 'Cargo pendiente' }}</span
                >
              </div>
              <button
                v-if="!esDerivacionSecretaria"
                type="button"
                class="rounded-full p-1 text-outline hover:bg-error-container hover:text-error"
                title="Quitar de la terna"
                @click="alternarDocente(docente, false)"
              >
                <span class="material-symbols-outlined !text-lg">close</span>
              </button>
            </div>
          </div>
          <div
            v-for="indice in maxJurados - cantidadSeleccionados"
            :key="`vacio-${indice}`"
            class="flex min-h-20 items-center justify-center rounded-xl border border-dashed border-outline-variant/60 text-sm text-outline"
          >
            Jurado pendiente
          </div>
        </div>

        <div class="space-y-3 border-t border-outline-variant/30 p-4">
          <button
            v-if="esDesignacionFinal"
            type="button"
            class="w-full rounded-full px-5 py-3 font-bold hover:bg-surface-container"
            :disabled="validando"
            @click="restaurarPropuesta"
          >
            Cancelar cambios
          </button>
          <button
            type="button"
            class="flex w-full items-center justify-center gap-2 rounded-full bg-primary-container px-5 py-3 font-bold text-white shadow-lg disabled:opacity-50"
            :disabled="validando || !propuesta"
            @click="validarSeleccion"
          >
            <span class="material-symbols-outlined !text-lg">check_circle</span
            >{{
              validando
                ? 'Procesando...'
                : esDerivacionSecretaria
                  ? 'Derivar a Secretaría Académica'
                  : 'Aprobar jurados'
            }}
          </button>
        </div>
      </aside>
    </div>

    <Teleport to="body">
      <div
        v-if="mostrarConfirmacion"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-validacion-exitosa"
      >
        <div
          class="w-full max-w-md overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl"
        >
          <div class="p-7 text-center">
            <div
              class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container"
            >
              <span class="material-symbols-outlined !text-4xl">check_circle</span>
            </div>
            <h3 id="titulo-validacion-exitosa" class="font-headline-md text-primary">
              {{
                esDerivacionSecretaria
                  ? 'Expediente derivado correctamente'
                  : 'Jurados designados correctamente'
              }}
            </h3>
            <p class="mt-3 text-on-surface-variant">{{ exito }}</p>
          </div>
          <div class="border-t border-outline-variant/30 bg-surface-container-low p-4">
            <button
              type="button"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container px-5 py-3 font-bold text-white shadow-lg hover:bg-primary"
              @click="finalizarValidacion"
            >
              <span class="material-symbols-outlined">arrow_back</span>
              Volver a asignación de jurados
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.assignment-page {
  width: 100%;
  margin-inline: auto;
}

@media (min-width: 1024px) {
  .assignment-page {
    position: relative;
    left: 50%;
    width: min(1500px, calc(100vw - var(--siset-sidebar-width) - 3rem));
    max-width: none;
    transform: translateX(-50%);
  }
}

.p-card-padding {
  padding: 1.5rem;
}
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
</style>
