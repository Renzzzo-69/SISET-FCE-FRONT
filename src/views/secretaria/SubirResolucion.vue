<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'

type Tipo = { codigo: string; nombre: string; requiere_expediente: boolean }
type Integrante = { id_docente: number; nombre: string; cargo: string }
type Docente = { id_docente: number; nombre: string }
type Expediente = { id_expediente: number; codigo: string; tesista: string; estado_codigo: string; etapa_codigo: string; tipos_disponibles: string[]; id_designacion_propuesta: number | null; jurados: Integrante[]; asesores: Integrante[] }

const router = useRouter()
const route = useRoute()
const tipos = ref<Tipo[]>([])
const expedientes = ref<Expediente[]>([])
const docentes = ref<Docente[]>([])
const tipo = ref('designacion_jurados')
const idExpediente = ref<number | null>(null)
const asunto = ref('')
const numero = ref('')
const fecha = ref(new Date().toISOString().slice(0, 10))
const archivo = ref<File | null>(null)
const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const origen = ref<'oficio' | 'externo'>('oficio')
const idSaliente = ref<number | null>(null)
const idEntrante = ref<number | null>(null)

const tipoSeleccionado = computed(() => tipos.value.find((item) => item.codigo === tipo.value))
const expediente = computed(() => expedientes.value.find((item) => item.id_expediente === idExpediente.value))
const expedientesDisponibles = computed(() => {
  if (!tipo.value) return []
  if (!tipoSeleccionado.value?.requiere_expediente) return expedientes.value
  return expedientes.value.filter((item) => item.tipos_disponibles.includes(tipo.value))
})
const esDesignacionJurados = computed(() => tipo.value === 'designacion_jurados')
const esCambio = computed(() => ['cambio_jurado', 'cambio_asesor'].includes(tipo.value))
const integrantesActuales = computed(() => tipo.value === 'cambio_jurado' ? (expediente.value?.jurados ?? []) : (expediente.value?.asesores ?? []))
const docentesDisponibles = computed(() => {
  const ocupados = new Set([...(expediente.value?.jurados ?? []), ...(expediente.value?.asesores ?? [])].map((item) => item.id_docente))
  return docentes.value.filter((item) => !ocupados.has(item.id_docente))
})
const textosTipo: Record<string, { titulo: string; ayuda: string }> = {
  designacion_jurados: {
    titulo: 'Resolución de designación de jurados',
    ayuda: 'Seleccione un proyecto derivado por Decanatura',
  },
  aprobacion_proyecto: {
    titulo: 'Resolución de aprobación de proyecto',
    ayuda: 'Seleccione un proyecto aprobado por sus tres jurados',
  },
  cambio_jurado: {
    titulo: 'Resolución de cambio de jurado',
    ayuda: 'Seleccione un proyecto con jurados previamente designados',
  },
  cambio_asesor: {
    titulo: 'Resolución de cambio de asesor',
    ayuda: 'Seleccione un proyecto activo que tenga un asesor vigente',
  },
  anulacion_proyecto: {
    titulo: 'Resolución de anulación de proyecto',
    ayuda: 'Seleccione un proyecto activo que pueda ser anulado',
  },
}
const tituloTipo = computed(() => textosTipo[tipo.value]?.titulo ?? tipoSeleccionado.value?.nombre ?? '')
const ayudaProyecto = computed(() => textosTipo[tipo.value]?.ayuda ?? 'Seleccione un expediente')

watch(tipo, () => {
  idExpediente.value = null
  idSaliente.value = null
  idEntrante.value = null
  error.value = ''
})
watch(idExpediente, () => { idSaliente.value = null; idEntrante.value = null })

async function cargar() {
  try {
    const { data } = await api.get('/secretaria/resoluciones/opciones')
    tipos.value = data.tipos.filter((item: Tipo) =>
      ['designacion_jurados', 'aprobacion_proyecto', 'cambio_jurado', 'cambio_asesor', 'anulacion_proyecto'].includes(item.codigo),
    )
    expedientes.value = data.expedientes
    docentes.value = data.docentes ?? []
    const tipoSolicitado = String(route.query.tipo ?? '')
    const expedienteSolicitado = Number(route.query.expediente ?? 0)
    if (tipos.value.some((item) => item.codigo === tipoSolicitado)) tipo.value = tipoSolicitado
    await nextTick()
    if (expedientesDisponibles.value.some((item) => item.id_expediente === expedienteSolicitado)) {
      idExpediente.value = expedienteSolicitado
    }
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'No se pudieron cargar las opciones desde la base de datos.'
  } finally {
    cargando.value = false
  }
}

function seleccionarArchivo(event: Event) {
  archivo.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

async function guardar() {
  if (!idExpediente.value || !numero.value || !fecha.value || !archivo.value) {
    error.value = 'Seleccione el proyecto, complete los datos de la resolución y adjunte el PDF.'
    return
  }
  if (tipoSeleccionado.value?.requiere_expediente && !idExpediente.value) {
    error.value = 'El tipo de resolución seleccionado requiere un expediente.'
    return
  }
  if (tipo.value === 'otros' && !asunto.value.trim()) {
    error.value = 'Escriba el asunto de la resolución.'
    return
  }
  if (tipo.value === 'designacion_jurados' && !expediente.value?.id_designacion_propuesta) {
    error.value = 'Este expediente todavía no tiene una terna aprobada por Decanatura y derivada a Secretaría Académica.'
    return
  }
  if (esCambio.value && (!idSaliente.value || !idEntrante.value)) {
    error.value = 'Seleccione al integrante que sale y al docente que ingresará.'
    return
  }

  guardando.value = true
  error.value = ''
  try {
    const form = new FormData()
    form.append('grupo_destinatario', 'institucional')
    form.append('codigo_institucional', 'decanatura')
    form.append('tipo_resolucion', tipo.value)
    if (idExpediente.value) form.append('id_expediente', String(idExpediente.value))
    if (asunto.value.trim()) form.append('asunto', asunto.value.trim())
    form.append('numero_resolucion', numero.value)
    form.append('fecha_emision', fecha.value)
    form.append('archivo_pdf', archivo.value)
    if (esCambio.value) {
      form.append('origen', origen.value)
      form.append('id_saliente', String(idSaliente.value))
      form.append('id_entrante', String(idEntrante.value))
    }
    if (esDesignacionJurados.value && expediente.value?.id_designacion_propuesta) {
      form.append('id_designacion', String(expediente.value.id_designacion_propuesta))
    }
    await api.post('/secretaria/resoluciones', form)
    router.push({ name: 'secretaria-resoluciones' })
  } catch (e: any) {
    const errores = e.response?.data?.errors
    error.value = e.response?.data?.message ?? (errores ? Object.values(errores).flat().join(' ') : 'No se pudo registrar la resolución.')
  } finally {
    guardando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <div class="mx-auto max-w-4xl py-6 sm:py-10">
    <div class="mb-8 flex items-center gap-4">
      <button class="rounded-full p-2 hover:bg-surface-container" @click="router.back()"><span class="material-symbols-outlined text-primary">arrow_back</span></button>
      <div><h2 class="font-headline-lg text-headline-lg text-primary">Subir Resolución</h2><p class="text-on-surface-variant">Registre resoluciones asociadas al estado actual de cada proyecto.</p></div>
    </div>

    <form class="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm" @submit.prevent="guardar">
      <div class="border-b border-outline-variant/30 bg-surface-container-low px-6 py-4"><h3 class="font-headline-sm text-headline-sm text-primary">Detalles del documento</h3></div>
      <div class="space-y-7 p-4 sm:p-6">
        <div v-if="error" class="rounded-xl bg-error-container p-4 text-error">{{ error }}</div>

        <div class="grid gap-6 md:grid-cols-2">
          <div class="space-y-2">
            <label class="text-xs uppercase tracking-wider text-outline">Tipo de resolución</label>
            <select v-model="tipo" :disabled="cargando" class="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60">
              <option v-for="item in tipos" :key="item.codigo" :value="item.codigo">{{ item.nombre }}</option>
            </select>
            <p class="text-sm text-on-surface-variant">{{ tituloTipo }}</p>
          </div>
          <div class="space-y-2">
            <label class="text-xs uppercase tracking-wider text-outline">Proyecto pendiente de resolución</label>
            <select v-model="idExpediente" :disabled="cargando" class="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60">
              <option :value="null" disabled>{{ ayudaProyecto }}</option><option v-for="item in expedientesDisponibles" :key="item.id_expediente" :value="item.id_expediente">{{ item.codigo }} — {{ item.tesista }}</option>
            </select>
            <p v-if="!cargando && !expedientesDisponibles.length" class="text-sm text-error">No hay proyectos disponibles para este tipo de resolución.</p>
          </div>
        </div>

        <div v-if="tipo === 'otros'" class="space-y-2">
          <label class="text-xs uppercase tracking-wider text-outline">Asunto</label><input v-model.trim="asunto" maxlength="200" placeholder="Indique el motivo o asunto de la resolución" class="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <p v-if="esDesignacionJurados && idExpediente && !expediente?.id_designacion_propuesta" class="text-sm text-error">El proyecto no tiene una propuesta de UDI disponible.</p>

        <div v-if="esCambio" class="rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 sm:p-5">
          <h4 class="mb-4 font-bold text-primary">Reemplazo autorizado por la resolución</h4>
          <div class="grid gap-5 md:grid-cols-3">
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-wider text-outline">Origen</label>
              <select v-model="origen" class="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3">
                <option value="oficio">De oficio</option><option value="externo">Solicitud externa</option>
              </select>
            </div>
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-wider text-outline">Integrante que sale</label>
              <select v-model="idSaliente" :disabled="!idExpediente" class="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 disabled:opacity-50">
                <option :value="null" disabled>Seleccione integrante</option>
                <option v-for="item in integrantesActuales" :key="item.id_docente" :value="item.id_docente">{{ item.nombre }} — {{ item.cargo }}</option>
              </select>
            </div>
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-wider text-outline">Docente que ingresa</label>
              <select v-model="idEntrante" :disabled="!idExpediente" class="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 disabled:opacity-50">
                <option :value="null" disabled>Seleccione reemplazante</option>
                <option v-for="item in docentesDisponibles" :key="item.id_docente" :value="item.id_docente">{{ item.nombre }}</option>
              </select>
            </div>
          </div>
          <p class="mt-3 text-sm text-on-surface-variant">Secretaría solo registra la autorización. Decanatura ejecutará el reemplazo posteriormente y conservará el cargo del integrante saliente.</p>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
          <div class="space-y-2"><label class="text-xs uppercase tracking-wider text-outline">Número de resolución</label><input v-model.trim="numero" maxlength="50" placeholder="Ej. RES-2026-001" class="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" /></div>
          <div class="space-y-2"><label class="text-xs uppercase tracking-wider text-outline">Fecha de emisión</label><input v-model="fecha" type="date" class="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" /></div>
        </div>

        <div class="space-y-2">
          <label class="text-xs uppercase tracking-wider text-outline">Documento PDF</label>
          <label class="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-outline-variant/60 p-7 text-center hover:bg-surface-container/50"><span class="material-symbols-outlined text-4xl text-secondary">cloud_upload</span><strong>{{ archivo?.name ?? 'Haz clic para seleccionar el archivo' }}</strong><span class="text-sm text-on-surface-variant">PDF, máximo 30 MB</span><input type="file" accept="application/pdf,.pdf" class="hidden" @change="seleccionarArchivo" /></label>
        </div>
      </div>
      <div class="flex flex-col-reverse justify-end gap-3 border-t border-outline-variant/30 bg-surface-container-low px-4 py-5 sm:flex-row sm:px-6">
        <button type="button" class="rounded-xl border border-secondary px-8 py-3 font-bold text-secondary" @click="router.back()">Cancelar</button>
        <button :disabled="guardando || cargando" class="rounded-xl bg-primary-container px-10 py-3 font-bold text-white disabled:opacity-50">{{ guardando ? 'Guardando...' : 'Registrar resolución' }}</button>
      </div>
    </form>
  </div>
</template>
