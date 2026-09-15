<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'

import api, { descargarDocumentoPrivado } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type {
  CatalogosInformeTesis,
  EstadoExpedienteActual,
  EtapaExpedienteActual,
  ExpedienteDetalle,
  ExpedienteDetalleResponse,
  InformeProyectoTesisCreado,
  ObservacionDocumentaria,
  ParticipanteExpediente,
  RevisionDocumentariaConsulta,
  RevisionDocumentariaResponse,
} from '@/types/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const detalle = ref<ExpedienteDetalle | null>(null)
const revision = ref<RevisionDocumentariaConsulta | null>(null)
const cargando = ref(true)
const descargando = ref<string | null>(null)
const subiendoSubsanacion = ref<number | null>(null)
const mensajeError = ref('')
const mensajeDescarga = ref('')
const erroresSubsanacion = ref<Record<number, string>>({})
const confirmacionesSubsanacion = ref<Record<number, string>>({})
const formulariosSubsanacion = ref<Record<number, { detalle: string; archivo: File | null }>>({})
const catalogosInforme = ref<CatalogosInformeTesis | null>(null)
const mostrandoFormularioInforme = ref(false)
const cargandoCatalogosInforme = ref(false)
const enviandoInforme = ref(false)
const enviandoTesisFinal = ref(false)
const errorInforme = ref('')
const exitoInforme = ref('')
const errorEnvioTesisFinal = ref('')
const exitoEnvioTesisFinal = ref('')
const tipoInforme = ref<0 | 1>(0)
const formularioInforme = ref({
  id_area_investigacion: null as number | null,
  id_sublinea_investigacion: null as number | null,
  id_asesor: null as number | null,
  id_coasesor: null as number | null,
  titulo: '',
  resumen: '',
  archivo: null as File | null,
})
const idExpediente = computed(() => Number(route.params.id))
const historialOrdenado = computed(() =>
  [...(detalle.value?.historial ?? [])].sort((a, b) => a.fecha_cambio.localeCompare(b.fecha_cambio)),
)
const esTesistaPropietario = computed(() => {
  const idAlumno = auth.usuario?.alumno?.id_alumno
  const participantes = [detalle.value?.tesista_1?.id_alumno, detalle.value?.tesista_2?.id_alumno]

  return auth.tieneRol('tesista') && idAlumno !== undefined && participantes.includes(idAlumno)
})
const tieneProyecto = computed(() => detalle.value?.informes.some((informe) => informe.es_tesis === 0) ?? false)
const puedeRegistrarTesisFinal = computed(
  () =>
    tieneProyecto.value &&
    detalle.value?.etapa_actual?.codigo === 'fase_tesis_informe_final' &&
    detalle.value.estado_actual?.codigo === 'fase_tesis_habilitada',
)
const puedeRegistrarInforme = computed(() => esTesistaPropietario.value)
const puedeEnviarTesisFinal = computed(
  () =>
    esTesistaPropietario.value &&
    detalle.value?.etapa_actual?.codigo === 'fase_tesis_informe_final' &&
    detalle.value.estado_actual?.codigo === 'fase_tesis_habilitada' &&
    detalle.value.informes.some((informe) => informe.es_tesis === 1),
)
const siguienteVersionInforme = computed(() =>
  Math.max(
    0,
    ...(detalle.value?.informes
      .filter((informe) => informe.es_tesis === tipoInforme.value)
      .map((informe) => informe.version) ?? []),
  ) + 1,
)
const docentesCoasesor = computed(
  () =>
    catalogosInforme.value?.docentes.filter((docente) => docente.id_docente !== formularioInforme.value.id_asesor) ?? [],
)
const puedePresentarSubsanacion = computed(
  () =>
    detalle.value?.etapa_actual?.codigo === 'revision_requisitos_documentarios' &&
    detalle.value.estado_actual?.codigo === 'pendiente_subsanacion',
)
const observacionesDocumentarias = computed(() =>
  revision.value?.revision?.requisitos.flatMap((requisito) =>
    (requisito.evaluacion?.observaciones ?? []).map((observacion) => ({ requisito, observacion })),
  ) ?? [],
)

const TAMANO_MAXIMO_ARCHIVO = 30 * 1024 * 1024
const TIPOS_ARCHIVO_PERMITIDOS = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function nombreParticipante(
  participante: Pick<ParticipanteExpediente, 'apellido_paterno' | 'apellido_materno' | 'nombres'> | null,
) {
  return participante
    ? [participante.apellido_paterno, participante.apellido_materno, participante.nombres]
        .filter(Boolean)
        .join(' ')
    : 'No registrado'
}

function nombreEtapa(etapa: EtapaExpedienteActual | null) {
  return etapa?.nombre ?? 'No disponible'
}

function nombreEstado(estado: EstadoExpedienteActual | null) {
  return estado?.nombre ?? 'No disponible'
}

function fechaTexto(fecha: string | null) {
  if (fecha === null) {
    return 'Sin fecha'
  }

  const fechaLocal = new Date(fecha)

  return Number.isNaN(fechaLocal.getTime())
    ? fecha
    : new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(fechaLocal)
}

function mensajeDesdeError(error: unknown, predeterminado = 'No se pudo cargar el detalle del expediente.') {
  if (!axios.isAxiosError(error)) {
    return predeterminado
  }

  if (error.response?.status === 401) {
    return 'La sesión expiró. Inicie sesión nuevamente.'
  }

  if (error.response?.status === 403) {
    return 'No tiene autorización para consultar este expediente.'
  }

  if (error.response?.status === 404) {
    return 'El expediente solicitado no existe o ya no está disponible.'
  }

  if (error.response?.status === 409) {
    return error.response.data?.message ?? 'La acción no está permitida para el estado actual del expediente.'
  }

  if (error.response?.status === 422) {
    return error.response.data?.message ?? 'Los datos enviados no son válidos.'
  }

  return error.response?.data?.message || predeterminado
}

function mensajeDesdeErrorDescarga(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return 'No se pudo descargar el documento.'
  }

  if (error.response?.status === 403) {
    return 'No tiene autorización para descargar este documento.'
  }

  if (error.response?.status === 404) {
    return 'El documento ya no está disponible.'
  }

  return 'No se pudo descargar el documento.'
}

async function cargarDetalle() {
  detalle.value = null
  revision.value = null
  mensajeError.value = ''

  if (!Number.isInteger(idExpediente.value) || idExpediente.value < 1) {
    mensajeError.value = 'El identificador del expediente no es válido.'
    cargando.value = false
    return
  }

  cargando.value = true

  try {
    const [detalleRespuesta, revisionRespuesta] = await Promise.all([
      api.get<ExpedienteDetalleResponse>(`/expedientes/${idExpediente.value}`),
      api.get<RevisionDocumentariaResponse>(`/expedientes/${idExpediente.value}/revision-documentaria`),
    ])
    detalle.value = detalleRespuesta.data.data ?? null
    revision.value = revisionRespuesta.data.data
    sincronizarFormularios(revisionRespuesta.data.data)
  } catch (error) {
    mensajeError.value = mensajeDesdeError(error)
  } finally {
    cargando.value = false
  }
}

async function descargarDocumento(ruta: string, nombre: string, clave: string) {
  mensajeDescarga.value = ''
  descargando.value = clave

  try {
    await descargarDocumentoPrivado(ruta, nombre)
  } catch (error) {
    mensajeDescarga.value = mensajeDesdeErrorDescarga(error)
  } finally {
    descargando.value = null
  }
}

function sincronizarFormularios(datos: RevisionDocumentariaConsulta) {
  const observaciones = datos.revision?.requisitos.flatMap(
    (requisito) => requisito.evaluacion?.observaciones ?? [],
  ) ?? []

  formulariosSubsanacion.value = Object.fromEntries(
    observaciones.map((observacion) => [observacion.id_observacion_documentaria, { detalle: '', archivo: null }]),
  )
}

function formularioSubsanacion(idObservacion: number) {
  return (formulariosSubsanacion.value[idObservacion] ??= { detalle: '', archivo: null })
}

function archivoPermitido(archivo: File) {
  const nombre = archivo.name.toLowerCase()
  return TIPOS_ARCHIVO_PERMITIDOS.includes(archivo.type) || nombre.endsWith('.pdf') || nombre.endsWith('.docx')
}

function seleccionarArchivo(idObservacion: number, evento: Event) {
  const entrada = evento.target as HTMLInputElement
  const archivo = entrada.files?.[0] ?? null
  const formulario = formularioSubsanacion(idObservacion)

  delete erroresSubsanacion.value[idObservacion]

  if (archivo === null) {
    formulario.archivo = null
    return
  }

  if (!archivoPermitido(archivo)) {
    formulario.archivo = null
    erroresSubsanacion.value[idObservacion] = 'Seleccione un archivo PDF o DOCX.'
    entrada.value = ''
    return
  }

  if (archivo.size > TAMANO_MAXIMO_ARCHIVO) {
    formulario.archivo = null
    erroresSubsanacion.value[idObservacion] = 'El archivo no puede superar 30 MiB.'
    entrada.value = ''
    return
  }

  formulario.archivo = archivo
}

function puedeSubsanarObservacion(observacion: ObservacionDocumentaria) {
  return puedePresentarSubsanacion.value && Boolean(observacion.es_subsanable) && observacion.estado === 'pendiente'
}

function mensajeErrorSubsanacion(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 422) {
    return error.response.data?.errors?.archivo_adjunto?.[0] ?? error.response.data?.message ?? 'El archivo no es válido.'
  }

  if (axios.isAxiosError(error) && error.response?.status === 404) {
    return 'La observación solicitada ya no está disponible.'
  }

  return mensajeDesdeError(error, 'No se pudo presentar la subsanación.')
}

function restablecerFormularioInforme() {
  tipoInforme.value = 0
  formularioInforme.value = {
    id_area_investigacion: null,
    id_sublinea_investigacion: null,
    id_asesor: null,
    id_coasesor: null,
    titulo: '',
    resumen: '',
    archivo: null,
  }
  errorInforme.value = ''
}

async function abrirFormularioInforme() {
  if (!puedeRegistrarInforme.value) return

  exitoInforme.value = ''
  mostrandoFormularioInforme.value = true

  if (catalogosInforme.value !== null || cargandoCatalogosInforme.value) return

  cargandoCatalogosInforme.value = true
  errorInforme.value = ''

  try {
    const { data } = await api.get<CatalogosInformeTesis>('/informes-tesis/catalogos')
    catalogosInforme.value = data
  } catch (error) {
    errorInforme.value = mensajeErrorCatalogosInforme(error)
  } finally {
    cargandoCatalogosInforme.value = false
  }
}

function cerrarFormularioInforme() {
  mostrandoFormularioInforme.value = false
  restablecerFormularioInforme()
}

function sincronizarCoasesor() {
  if (formularioInforme.value.id_asesor === formularioInforme.value.id_coasesor) {
    formularioInforme.value.id_coasesor = null
  }
}

function seleccionarArchivoInforme(evento: Event) {
  const entrada = evento.target as HTMLInputElement
  const archivo = entrada.files?.[0] ?? null

  errorInforme.value = ''

  if (archivo === null) {
    formularioInforme.value.archivo = null
    return
  }

  if (!archivoPermitido(archivo)) {
    formularioInforme.value.archivo = null
    errorInforme.value = 'Seleccione un archivo PDF o DOCX.'
    entrada.value = ''
    return
  }

  if (archivo.size > TAMANO_MAXIMO_ARCHIVO) {
    formularioInforme.value.archivo = null
    errorInforme.value = 'El archivo no puede superar 30 MiB.'
    entrada.value = ''
    return
  }

  formularioInforme.value.archivo = archivo
}

function mensajeErrorInforme(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 422) {
    const errores = error.response.data?.errors
    const primerError = errores ? Object.values(errores).flat().find((mensaje) => typeof mensaje === 'string') : null

    return primerError ?? error.response.data?.message ?? 'Revise los datos del informe.'
  }

  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return 'No tiene autorización para registrar informes en este expediente.'
  }

  return mensajeDesdeError(error, 'No se pudo registrar el informe.')
}

function mensajeErrorCatalogosInforme(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return 'Su perfil Tesista activo no puede consultar los catálogos de informes.'
  }

  return mensajeDesdeError(error, 'No se pudieron cargar los catálogos para el informe.')
}

function mensajeErrorEnvioTesisFinal(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return 'No tiene autorización para enviar esta tesis final a jurados.'
  }

  return mensajeDesdeError(error, 'No se pudo enviar la tesis final a jurados.')
}

async function registrarInforme() {
  if (enviandoInforme.value || enviandoTesisFinal.value || !puedeRegistrarInforme.value) return

  if (tipoInforme.value === 1 && !puedeRegistrarTesisFinal.value) {
    errorInforme.value = 'La tesis final requiere un proyecto y la fase de tesis habilitada.'
    return
  }

  const formulario = formularioInforme.value

  if (
    formulario.id_area_investigacion === null ||
    formulario.id_sublinea_investigacion === null ||
    formulario.id_asesor === null ||
    formulario.titulo.trim() === '' ||
    formulario.resumen.trim() === ''
  ) {
    errorInforme.value = 'Complete todos los campos obligatorios del informe.'
    return
  }

  if (formulario.id_coasesor === formulario.id_asesor) {
    errorInforme.value = 'El coasesor debe ser distinto del asesor.'
    return
  }

  if (formulario.archivo === null) {
    errorInforme.value = 'Adjunte un archivo PDF o DOCX para continuar.'
    return
  }

  const datos = new FormData()
  datos.append('id_expediente', String(idExpediente.value))
  datos.append('id_area_investigacion', String(formulario.id_area_investigacion))
  datos.append('id_sublinea_investigacion', String(formulario.id_sublinea_investigacion))
  datos.append('id_asesor', String(formulario.id_asesor))
  if (formulario.id_coasesor !== null) {
    datos.append('id_coasesor', String(formulario.id_coasesor))
  }
  datos.append('version', String(siguienteVersionInforme.value))
  datos.append('es_tesis', String(tipoInforme.value))
  datos.append('titulo', formulario.titulo.trim())
  datos.append('resumen', formulario.resumen.trim())
  datos.append('archivo_adjunto', formulario.archivo)

  enviandoInforme.value = true
  errorInforme.value = ''

  try {
    await api.post<InformeProyectoTesisCreado>('/informes-tesis', datos)
    exitoInforme.value = `${tipoInforme.value === 1 ? 'Tesis final' : 'Proyecto'} registrado correctamente.`
    cerrarFormularioInforme()
    await cargarDetalle()
  } catch (error) {
    errorInforme.value = mensajeErrorInforme(error)
  } finally {
    enviandoInforme.value = false
  }
}

async function enviarTesisFinalAJurados() {
  if (enviandoInforme.value || enviandoTesisFinal.value || !puedeEnviarTesisFinal.value) return

  if (!window.confirm('¿Desea enviar la tesis final a revisión de jurados?')) return

  enviandoTesisFinal.value = true
  errorEnvioTesisFinal.value = ''
  exitoEnvioTesisFinal.value = ''

  try {
    await api.post(`/expedientes/${idExpediente.value}/tesis-final/envio-revision-jurados`)
    exitoEnvioTesisFinal.value = 'La tesis final fue enviada a revisión de jurados.'
    await cargarDetalle()
  } catch (error) {
    errorEnvioTesisFinal.value = mensajeErrorEnvioTesisFinal(error)
  } finally {
    enviandoTesisFinal.value = false
  }
}

async function presentarSubsanacion(observacion: ObservacionDocumentaria) {
  if (subiendoSubsanacion.value !== null || !puedeSubsanarObservacion(observacion)) return

  const formulario = formularioSubsanacion(observacion.id_observacion_documentaria)

  if (formulario.archivo === null) {
    erroresSubsanacion.value[observacion.id_observacion_documentaria] = 'Adjunte un archivo PDF o DOCX para continuar.'
    return
  }

  const datos = new FormData()
  const detalleSubsanacion = formulario.detalle.trim()

  if (detalleSubsanacion !== '') {
    datos.append('detalle', detalleSubsanacion)
  }

  datos.append('archivo_adjunto', formulario.archivo)
  subiendoSubsanacion.value = observacion.id_observacion_documentaria
  delete erroresSubsanacion.value[observacion.id_observacion_documentaria]

  try {
    await api.post(
      `/expedientes/${idExpediente.value}/revision-documentaria/observaciones/${observacion.id_observacion_documentaria}/subsanaciones`,
      datos,
    )
    confirmacionesSubsanacion.value[observacion.id_observacion_documentaria] = 'Subsanación presentada correctamente.'
    await cargarDetalle()
  } catch (error) {
    erroresSubsanacion.value[observacion.id_observacion_documentaria] = mensajeErrorSubsanacion(error)
  } finally {
    subiendoSubsanacion.value = null
  }
}

onMounted(cargarDetalle)
</script>

<template>
  <section>
    <div class="heading">
      <div>
        <h1>Detalle de expediente</h1>
        <p v-if="detalle">Expediente {{ detalle.cod_expediente }}</p>
      </div>
      <button type="button" @click="router.push({ name: 'expedientes' })">Volver al listado</button>
    </div>

    <p v-if="cargando" class="status">Cargando detalle del expediente…</p>

    <div v-else-if="mensajeError" class="error" role="alert">
      <p>{{ mensajeError }}</p>
      <button type="button" @click="cargarDetalle">Reintentar</button>
    </div>

    <p v-else-if="detalle === null" class="status">El expediente no contiene información de detalle.</p>

    <template v-else>
      <p v-if="mensajeDescarga" class="error" role="alert">{{ mensajeDescarga }}</p>

      <div class="summary-grid">
        <section class="card">
          <h2>Expediente {{ detalle.cod_expediente }}</h2>
          <dl>
            <div>
              <dt>Tesista 1</dt>
              <dd>{{ nombreParticipante(detalle.tesista_1) }}</dd>
            </div>
            <div>
              <dt>Tesista 2</dt>
              <dd>{{ nombreParticipante(detalle.tesista_2) }}</dd>
            </div>
            <div>
              <dt>Etapa actual</dt>
              <dd>{{ nombreEtapa(detalle.etapa_actual) }}</dd>
            </div>
            <div>
              <dt>Estado actual</dt>
              <dd>{{ nombreEstado(detalle.estado_actual) }}</dd>
            </div>
          </dl>
        </section>

        <section class="card">
          <h2>Solicitud</h2>
          <button
            v-if="detalle.solicitud_adjunta"
            type="button"
            :disabled="descargando === 'solicitud'"
            @click="descargarDocumento(detalle.solicitud_adjunta, `solicitud-${detalle.cod_expediente}`, 'solicitud')"
          >
            {{ descargando === 'solicitud' ? 'Descargando…' : 'Descargar solicitud' }}
          </button>
          <p v-else class="muted">No hay una solicitud adjunta disponible.</p>
        </section>
      </div>

      <section class="card section">
        <div class="section-heading">
          <h2>Informes</h2>
          <div v-if="puedeRegistrarInforme" class="actions">
            <button type="button" :disabled="enviandoInforme || enviandoTesisFinal" @click="abrirFormularioInforme">
              Registrar informe
            </button>
            <button
              v-if="puedeEnviarTesisFinal"
              type="button"
              :disabled="enviandoInforme || enviandoTesisFinal"
              @click="enviarTesisFinalAJurados"
            >
              {{ enviandoTesisFinal ? 'Enviando…' : 'Enviar tesis final a jurados' }}
            </button>
          </div>
        </div>
        <p v-if="exitoInforme" class="inline-success" role="status">{{ exitoInforme }}</p>
        <p v-if="exitoEnvioTesisFinal" class="inline-success" role="status">{{ exitoEnvioTesisFinal }}</p>
        <p v-if="errorEnvioTesisFinal" class="error" role="alert">{{ errorEnvioTesisFinal }}</p>

        <form v-if="mostrandoFormularioInforme" class="subsanation-form" @submit.prevent="registrarInforme">
          <h3>Registrar informe</h3>
          <p v-if="cargandoCatalogosInforme" class="muted">Cargando catálogos…</p>
          <template v-else-if="catalogosInforme">
            <label>
              Tipo de informe
              <select v-model="tipoInforme" :disabled="enviandoInforme || enviandoTesisFinal">
                <option :value="0">Proyecto</option>
                <option v-if="puedeRegistrarTesisFinal" :value="1">Tesis final</option>
              </select>
            </label>
            <p class="muted">Versión {{ siguienteVersionInforme }}</p>
            <label>
              Área de investigación
              <select v-model.number="formularioInforme.id_area_investigacion" :disabled="enviandoInforme || enviandoTesisFinal" required>
                <option :value="null" disabled>Seleccione un área</option>
                <option v-for="area in catalogosInforme.areas" :key="area.id_area_investigacion" :value="area.id_area_investigacion">
                  {{ area.nombre }}
                </option>
              </select>
            </label>
            <label>
              Sublínea de investigación
              <select v-model.number="formularioInforme.id_sublinea_investigacion" :disabled="enviandoInforme || enviandoTesisFinal" required>
                <option :value="null" disabled>Seleccione una sublínea</option>
                <option
                  v-for="sublinea in catalogosInforme.sublineas"
                  :key="sublinea.id_sublinea_investigacion"
                  :value="sublinea.id_sublinea_investigacion"
                >
                  {{ sublinea.nombre }}
                </option>
              </select>
            </label>
            <label>
              Asesor
              <select
                v-model.number="formularioInforme.id_asesor"
                :disabled="enviandoInforme || enviandoTesisFinal"
                required
                @change="sincronizarCoasesor"
              >
                <option :value="null" disabled>Seleccione un asesor</option>
                <option v-for="docente in catalogosInforme.docentes" :key="docente.id_docente" :value="docente.id_docente">
                  {{ nombreParticipante(docente) }}
                </option>
              </select>
            </label>
            <label>
              Coasesor (opcional)
              <select v-model.number="formularioInforme.id_coasesor" :disabled="enviandoInforme || enviandoTesisFinal">
                <option :value="null">Sin coasesor</option>
                <option v-for="docente in docentesCoasesor" :key="docente.id_docente" :value="docente.id_docente">
                  {{ nombreParticipante(docente) }}
                </option>
              </select>
            </label>
            <label>
              Título
              <input v-model="formularioInforme.titulo" type="text" :disabled="enviandoInforme || enviandoTesisFinal" required>
            </label>
            <label>
              Resumen
              <textarea v-model="formularioInforme.resumen" :disabled="enviandoInforme || enviandoTesisFinal" rows="4" required></textarea>
            </label>
            <label>
              Archivo PDF o DOCX (máximo 30 MiB)
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                :disabled="enviandoInforme || enviandoTesisFinal"
                required
                @change="seleccionarArchivoInforme"
              >
            </label>
            <p v-if="formularioInforme.archivo" class="muted">{{ formularioInforme.archivo.name }}</p>
            <p v-if="errorInforme" class="field-error" role="alert">{{ errorInforme }}</p>
            <div class="actions">
              <button type="submit" :disabled="enviandoInforme || enviandoTesisFinal">
                {{ enviandoInforme ? 'Registrando…' : 'Registrar informe' }}
              </button>
              <button type="button" :disabled="enviandoInforme || enviandoTesisFinal" @click="cerrarFormularioInforme">
                Cancelar
              </button>
            </div>
          </template>
          <template v-else>
            <p v-if="errorInforme" class="field-error" role="alert">{{ errorInforme }}</p>
            <button type="button" :disabled="cargandoCatalogosInforme" @click="abrirFormularioInforme">Reintentar</button>
          </template>
        </form>

        <ul v-if="detalle.informes.length" class="items">
          <li v-for="informe in detalle.informes" :key="informe.id_informe_proyecto_tesis">
            <div>
              <strong>{{ informe.titulo }}</strong>
              <p>
                {{ informe.es_tesis ? 'Tesis final' : 'Proyecto' }} · Versión {{ informe.version }}
                <span v-if="informe.turnitin !== null"> · Turnitin: {{ informe.turnitin }}%</span>
              </p>
            </div>
            <button
              v-if="informe.archivo_adjunto"
              type="button"
              :disabled="descargando === `informe-${informe.id_informe_proyecto_tesis}`"
              @click="
                descargarDocumento(
                  informe.archivo_adjunto,
                  `informe-${informe.id_informe_proyecto_tesis}`,
                  `informe-${informe.id_informe_proyecto_tesis}`,
                )
              "
            >
              {{ descargando === `informe-${informe.id_informe_proyecto_tesis}` ? 'Descargando…' : 'Descargar' }}
            </button>
            <span v-else class="muted">Sin documento disponible</span>
          </li>
        </ul>
        <p v-else class="muted">No hay informes registrados.</p>
      </section>

      <section class="card section">
        <h2>Historial</h2>
        <ol v-if="historialOrdenado.length" class="timeline">
          <li v-for="evento in historialOrdenado" :key="evento.id_historial">
            <strong>{{ fechaTexto(evento.fecha_cambio) }}</strong>
            <span>{{ evento.accion_realizada }}</span>
            <p>
              Etapa: {{ nombreEtapa(evento.etapa_anterior) }} → {{ nombreEtapa(evento.etapa_nueva) }}
            </p>
            <p>
              Estado: {{ nombreEstado(evento.estado_anterior) }} → {{ nombreEstado(evento.estado_nuevo) }}
            </p>
            <small>Responsable: {{ evento.responsable?.nombre ?? 'No registrado' }}</small>
          </li>
        </ol>
        <p v-else class="muted">No hay movimientos registrados.</p>
      </section>

      <section class="card section">
        <h2>Revisión documentaria actual</h2>
        <dl v-if="detalle.revision_documentaria_reciente" class="revision">
          <div>
            <dt>Ronda</dt>
            <dd>{{ detalle.revision_documentaria_reciente.numero_ronda }}</dd>
          </div>
          <div>
            <dt>Inicio</dt>
            <dd>{{ fechaTexto(detalle.revision_documentaria_reciente.fecha_inicio) }}</dd>
          </div>
          <div>
            <dt>Cierre</dt>
            <dd>{{ fechaTexto(detalle.revision_documentaria_reciente.fecha_cierre) }}</dd>
          </div>
          <div>
            <dt>Resultado</dt>
            <dd>{{ detalle.revision_documentaria_reciente.resultado_final ?? 'Pendiente' }}</dd>
          </div>
        </dl>
        <p v-else class="muted">No hay una revisión documentaria activa.</p>
      </section>

      <section class="card section">
        <h2>Observaciones documentarias</h2>
        <p v-if="!revision?.revision" class="muted">No hay observaciones documentarias para mostrar.</p>

        <ul v-else-if="observacionesDocumentarias.length" class="documentary-observations">
          <li v-for="item in observacionesDocumentarias" :key="item.observacion.id_observacion_documentaria">
            <strong>{{ item.requisito.codigo }} · {{ item.requisito.nombre }}</strong>
            <p>{{ item.observacion.detalle }}</p>
            <p class="muted">
              {{ item.observacion.es_subsanable ? 'Subsanable' : 'No subsanable' }} · {{ item.observacion.estado }}
            </p>
            <p class="muted">Emitida: {{ fechaTexto(item.observacion.fecha_emision) }}</p>
            <p v-if="confirmacionesSubsanacion[item.observacion.id_observacion_documentaria]" class="inline-success" role="status">
              {{ confirmacionesSubsanacion[item.observacion.id_observacion_documentaria] }}
            </p>

            <div v-if="item.observacion.subsanaciones.length" class="previous-attempts">
              <h3>Intentos anteriores</h3>
              <ul>
                <li v-for="subsanacion in item.observacion.subsanaciones" :key="subsanacion.id_subsanacion_documentaria">
                  <strong>Intento {{ subsanacion.numero_intento }}</strong>
                  <span>Resultado: {{ subsanacion.resultado ?? 'Pendiente de revisión' }}</span>
                  <span>Presentado: {{ fechaTexto(subsanacion.fecha_presentacion) }}</span>
                  <p v-if="subsanacion.detalle">{{ subsanacion.detalle }}</p>
                </li>
              </ul>
            </div>

            <form
              v-if="puedeSubsanarObservacion(item.observacion)"
              class="subsanation-form"
              @submit.prevent="presentarSubsanacion(item.observacion)"
            >
              <label>
                Detalle (opcional)
                <textarea
                  v-model="formularioSubsanacion(item.observacion.id_observacion_documentaria).detalle"
                  :disabled="subiendoSubsanacion !== null"
                  rows="3"
                ></textarea>
              </label>
              <label>
                Archivo PDF o DOCX (máximo 30 MiB)
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  :disabled="subiendoSubsanacion !== null"
                  required
                  @change="seleccionarArchivo(item.observacion.id_observacion_documentaria, $event)"
                >
              </label>
              <p v-if="formularioSubsanacion(item.observacion.id_observacion_documentaria).archivo" class="muted">
                {{ formularioSubsanacion(item.observacion.id_observacion_documentaria).archivo?.name }}
              </p>
              <p v-if="erroresSubsanacion[item.observacion.id_observacion_documentaria]" class="field-error" role="alert">
                {{ erroresSubsanacion[item.observacion.id_observacion_documentaria] }}
              </p>
              <button type="submit" :disabled="subiendoSubsanacion !== null">
                {{
                  subiendoSubsanacion === item.observacion.id_observacion_documentaria
                    ? 'Presentando…'
                    : 'Presentar subsanación'
                }}
              </button>
            </form>
          </li>
        </ul>

        <p v-else class="muted">No hay observaciones registradas en la ronda actual.</p>
      </section>
    </template>
  </section>
</template>

<style scoped>
.heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

h1,
h2,
p,
dl {
  margin-top: 0;
}

.heading p,
.status,
.muted,
small {
  color: #6b7280;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.card {
  padding: 1.25rem;
  background: #fff;
  border-radius: 6px;
}

.section {
  margin-top: 1rem;
}

.section-heading,
.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.section-heading {
  margin-bottom: 1rem;
}

.section-heading h2,
.subsanation-form h3 {
  margin: 0;
}

dl {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 0;
}

dt {
  color: #6b7280;
  font-size: 0.85rem;
}

dd {
  margin: 0.2rem 0 0;
}

button {
  padding: 0.55rem 0.8rem;
  color: #fff;
  cursor: pointer;
  background: #534caf;
  border: 0;
  border-radius: 4px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.error {
  padding: 1rem;
  color: #991b1b;
  background: #fef2f2;
  border-radius: 4px;
}

.error button {
  margin-top: 0.75rem;
}

.items,
.timeline {
  display: grid;
  gap: 1rem;
  margin: 0;
  padding-left: 1.25rem;
}

.items {
  list-style: none;
  padding-left: 0;
}

.items li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.items li:first-child {
  padding-top: 0;
}

.items li:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.items p,
.timeline p {
  margin: 0.3rem 0;
}

.timeline span {
  display: block;
  margin-top: 0.2rem;
}

.revision {
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.documentary-observations,
.previous-attempts ul {
  display: grid;
  gap: 1rem;
  padding-left: 0;
  margin-bottom: 0;
  list-style: none;
}

.documentary-observations > li {
  padding: 1rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.documentary-observations > li:first-child {
  padding-top: 0;
}

.documentary-observations > li:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.documentary-observations > li > p,
.previous-attempts p {
  margin: 0.35rem 0;
}

.previous-attempts {
  padding: 0.85rem;
  margin-top: 0.75rem;
  background: #f9fafb;
  border-radius: 4px;
}

.previous-attempts h3 {
  margin-top: 0;
  font-size: 1rem;
}

.previous-attempts li {
  display: grid;
  gap: 0.25rem;
}

.subsanation-form {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  margin-top: 0.75rem;
  background: #f9fafb;
  border-radius: 4px;
}

.subsanation-form label {
  display: grid;
  gap: 0.35rem;
  color: #374151;
}

textarea,
select,
input[type='text'],
input[type='file'] {
  box-sizing: border-box;
  width: 100%;
  padding: 0.5rem;
  font: inherit;
  border: 1px solid #9ca3af;
  border-radius: 4px;
}

.field-error {
  margin: 0;
  color: #991b1b;
}

.inline-success {
  padding: 0.65rem 0.8rem;
  color: #047857;
  background: #ecfdf5;
  border-radius: 4px;
}

@media (max-width: 600px) {
  .heading,
  .items li,
  .section-heading,
  .actions {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
