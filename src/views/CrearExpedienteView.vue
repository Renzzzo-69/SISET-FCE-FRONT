<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { CandidatoTesista, Expediente } from '@/types/api'

interface CatalogosInforme {
  areas: Array<{ id_area_investigacion: number; nombre: string }>
  sublineas: Array<{ id_sublinea_investigacion: number; id_linea_investigacion: number; nombre: string }>
  docentes: Array<{ id_docente: number; nombres: string; apellido_paterno: string; apellido_materno: string }>
}

const auth = useAuthStore()
const router = useRouter()

const candidatos = ref<CandidatoTesista[]>([])
const cargandoCandidatos = ref(false)
const catalogos = ref<CatalogosInforme>({ areas: [], sublineas: [], docentes: [] })
const cargandoCatalogos = ref(false)
const creando = ref(false)
const incluirCoTesista = ref(false)
const incluirCoasesor = ref(false)
const mensajeError = ref('')
const mensajeCandidatos = ref('')
const mensajeCatalogos = ref('')
const errores = ref<Record<string, string>>({})
const confirmaciones = reactive({ normativas: false, documentos: false })
const formulario = reactive({
  cod_expediente: '',
  id_co_tesista: null as number | null,
  solicitud_adjunta: null as File | null,
  id_area_investigacion: null as number | null,
  id_sublinea_investigacion: null as number | null,
  id_asesor: null as number | null,
  id_coasesor: null as number | null,
  titulo: '',
  resumen: '',
  proyecto_adjunto: null as File | null,
  carta_aceptacion_asesor: null as File | null,
})

const puedeRegistrar = computed(() => auth.tieneRol('tesista'))
const alumnoPropio = computed(() => auth.usuario?.alumno ?? null)
const nombreSolicitud = computed(() => formulario.solicitud_adjunta?.name ?? 'Pendiente')
const nombreProyecto = computed(() => formulario.proyecto_adjunto?.name ?? 'Pendiente')
const nombreCartaAceptacion = computed(() => formulario.carta_aceptacion_asesor?.name ?? 'Pendiente')
const cantidadPalabrasTitulo = computed(() => formulario.titulo.trim().split(/\s+/).filter(Boolean).length)
const puedeEnviar = computed(() =>
  /^[A-Za-z0-9-]{1,50}$/.test(formulario.cod_expediente.trim()) &&
  Number.isInteger(formulario.id_area_investigacion) &&
  Number.isInteger(formulario.id_sublinea_investigacion) &&
  Number.isInteger(formulario.id_asesor) &&
  (!incluirCoTesista.value || Number.isInteger(formulario.id_co_tesista)) &&
  (!incluirCoasesor.value || (Number.isInteger(formulario.id_coasesor) && formulario.id_coasesor !== formulario.id_asesor)) &&
  cantidadPalabrasTitulo.value > 0 &&
  cantidadPalabrasTitulo.value <= 20 &&
  formulario.resumen.trim() !== '' &&
  formulario.solicitud_adjunta !== null &&
  formulario.proyecto_adjunto !== null &&
  formulario.carta_aceptacion_asesor !== null &&
  confirmaciones.normativas &&
  confirmaciones.documentos,
)

function nombreAlumno(alumno: CandidatoTesista) {
  return [alumno.apellido_paterno, alumno.apellido_materno, alumno.nombres].filter(Boolean).join(' ')
}

function nombreDocente(docente: CatalogosInforme['docentes'][number]) {
  return [docente.apellido_paterno, docente.apellido_materno, docente.nombres].filter(Boolean).join(' ')
}

function mensajeDesdeError(error: unknown, accion: string) {
  if (!axios.isAxiosError(error)) {
    return `No se pudo ${accion}.`
  }

  if (error.response?.status === 401) {
    return 'La sesión expiró. Inicie sesión nuevamente.'
  }

  if (error.response?.status === 403) {
    return `No tiene autorización para ${accion}.`
  }

  if (error.response?.status === 422) {
    return 'Revise los campos marcados e intente nuevamente.'
  }

  return error.response?.data?.message || `No se pudo ${accion}.`
}

function asignarErroresDeValidacion(error: unknown) {
  if (!axios.isAxiosError(error) || error.response?.status !== 422) {
    return
  }

  const erroresApi = error.response.data?.errors as Record<string, string[]> | undefined

  if (!erroresApi) {
    return
  }

  errores.value = Object.fromEntries(
    Object.entries(erroresApi).map(([campo, mensajes]) => [
      campo === 'id_tesista' ? 'alumno' : campo,
      mensajes[0] ?? 'Valor inválido.',
    ]),
  )
}

function seleccionarSolicitud(event: Event) {
  const input = event.target as HTMLInputElement
  formulario.solicitud_adjunta = input.files?.[0] ?? null
}

function seleccionarProyecto(event: Event) {
  const input = event.target as HTMLInputElement
  formulario.proyecto_adjunto = input.files?.[0] ?? null
}

function seleccionarCartaAceptacion(event: Event) {
  const input = event.target as HTMLInputElement
  formulario.carta_aceptacion_asesor = input.files?.[0] ?? null
}

function actualizarCoTesista() {
  if (!incluirCoTesista.value) {
    formulario.id_co_tesista = null
  }
}

function actualizarCoasesor() {
  if (!incluirCoasesor.value) {
    formulario.id_coasesor = null
  }
}

function validarFormulario() {
  const siguientes: Record<string, string> = {}
  const solicitud = formulario.solicitud_adjunta
  const proyecto = formulario.proyecto_adjunto
  const cartaAceptacion = formulario.carta_aceptacion_asesor

  if (!/^[A-Za-z0-9-]{1,50}$/.test(formulario.cod_expediente.trim())) {
    siguientes.cod_expediente = 'Ingrese un código alfanumérico de hasta 50 caracteres; se permiten guiones.'
  }

  if (alumnoPropio.value === null) {
    siguientes.alumno = 'Su cuenta no tiene un perfil Alumno activo para registrar el expediente.'
  }

  if (incluirCoTesista.value && !Number.isInteger(formulario.id_co_tesista)) {
    siguientes.id_co_tesista = 'Seleccione un Tesista dos válido.'
  }

  if (solicitud === null) {
    siguientes.solicitud_adjunta = 'Adjunte la solicitud en formato PDF o DOCX.'
  } else if (
    !/\.(pdf|docx)$/i.test(solicitud.name) ||
    !['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(
      solicitud.type,
    )
  ) {
    siguientes.solicitud_adjunta = 'La solicitud debe ser un archivo PDF o DOCX.'
  } else if (solicitud.size > 30 * 1024 * 1024) {
    siguientes.solicitud_adjunta = 'La solicitud no puede superar 30 MiB.'
  }

  if (!Number.isInteger(formulario.id_area_investigacion)) {
    siguientes.id_area_investigacion = 'Seleccione un área de investigación.'
  }

  if (!Number.isInteger(formulario.id_sublinea_investigacion)) {
    siguientes.id_sublinea_investigacion = 'Seleccione una sublínea de investigación.'
  }

  if (!Number.isInteger(formulario.id_asesor)) {
    siguientes.id_asesor = 'Seleccione un asesor.'
  }

  if (incluirCoasesor.value && !Number.isInteger(formulario.id_coasesor)) {
    siguientes.id_coasesor = 'Seleccione un coasesor válido.'
  } else if (
    incluirCoasesor.value &&
    formulario.id_coasesor !== null &&
    formulario.id_coasesor === formulario.id_asesor
  ) {
    siguientes.id_coasesor = 'El coasesor debe ser distinto al asesor propuesto.'
  }

  if (!formulario.titulo.trim()) {
    siguientes.titulo = 'Ingrese el título del proyecto.'
  } else if (cantidadPalabrasTitulo.value > 20) {
    siguientes.titulo = 'El título no puede superar las 20 palabras.'
  }

  if (!formulario.resumen.trim()) {
    siguientes.resumen = 'Ingrese el resumen ejecutivo.'
  }

  if (proyecto === null) {
    siguientes.proyecto_adjunto = 'Adjunte el proyecto en formato PDF o DOCX.'
  } else if (
    !/\.(pdf|docx)$/i.test(proyecto.name) ||
    !['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(
      proyecto.type,
    )
  ) {
    siguientes.proyecto_adjunto = 'El proyecto debe ser un archivo PDF o DOCX.'
  } else if (proyecto.size > 30 * 1024 * 1024) {
    siguientes.proyecto_adjunto = 'El proyecto no puede superar 30 MiB.'
  }

  if (cartaAceptacion === null) {
    siguientes.carta_aceptacion_asesor = 'Adjunte la carta de aceptación del asesor en formato PDF o DOCX.'
  } else if (
    !/\.(pdf|docx)$/i.test(cartaAceptacion.name) ||
    !['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(
      cartaAceptacion.type,
    )
  ) {
    siguientes.carta_aceptacion_asesor = 'La carta debe ser un archivo PDF o DOCX.'
  } else if (cartaAceptacion.size > 30 * 1024 * 1024) {
    siguientes.carta_aceptacion_asesor = 'La carta no puede superar 30 MiB.'
  }

  if (!confirmaciones.normativas || !confirmaciones.documentos) {
    siguientes.confirmaciones = 'Confirme las validaciones previas para enviar el expediente.'
  }

  errores.value = siguientes
  return Object.keys(siguientes).length === 0
}

async function cargarCandidatos() {
  if (!puedeRegistrar.value || alumnoPropio.value === null) {
    return
  }

  cargandoCandidatos.value = true
  mensajeCandidatos.value = ''

  try {
    const { data } = await api.get<CandidatoTesista[]>('/alumnos/candidatos-tesista')
    candidatos.value = data
  } catch (error) {
    mensajeCandidatos.value = mensajeDesdeError(error, 'consultar los candidatos a Tesista dos')
  } finally {
    cargandoCandidatos.value = false
  }
}

async function cargarCatalogos() {
  if (!puedeRegistrar.value || alumnoPropio.value === null) {
    return
  }

  cargandoCatalogos.value = true
  mensajeCatalogos.value = ''

  try {
    const { data } = await api.get<CatalogosInforme>('/informes-tesis/catalogos')
    catalogos.value = data
  } catch (error) {
    mensajeCatalogos.value = mensajeDesdeError(error, 'consultar los catálogos académicos')
  } finally {
    cargandoCatalogos.value = false
  }
}

async function registrarExpediente() {
  mensajeError.value = ''

  const alumno = alumnoPropio.value
  const solicitud = formulario.solicitud_adjunta
  const proyecto = formulario.proyecto_adjunto
  const cartaAceptacion = formulario.carta_aceptacion_asesor

  if (!validarFormulario() || alumno === null || solicitud === null || proyecto === null || cartaAceptacion === null) {
    return
  }

  const datos = new FormData()
  datos.append('cod_expediente', formulario.cod_expediente.trim())
  datos.append('id_tesista', String(alumno.id_alumno))
  datos.append('solicitud_adjunta', solicitud)
  datos.append('id_area_investigacion', String(formulario.id_area_investigacion))
  datos.append('id_sublinea_investigacion', String(formulario.id_sublinea_investigacion))
  datos.append('id_asesor', String(formulario.id_asesor))
  datos.append('titulo', formulario.titulo.trim())
  datos.append('resumen', formulario.resumen.trim())
  datos.append('proyecto_adjunto', proyecto)
  datos.append('carta_aceptacion_asesor', cartaAceptacion)
  datos.append('declaro_normativas', '1')
  datos.append('declaro_documentos_fieles', '1')

  if (incluirCoTesista.value && formulario.id_co_tesista !== null) {
    datos.append('id_co_tesista', String(formulario.id_co_tesista))
  }

  if (incluirCoasesor.value && formulario.id_coasesor !== null) {
    datos.append('id_coasesor', String(formulario.id_coasesor))
  }

  creando.value = true

  try {
    await api.post<Expediente>('/expedientes/registro-proyecto', datos)
    auth.tieneExpediente = true
    auth.errorExpediente = ''
    await router.push({ name: 'expedientes' })
  } catch (error) {
    asignarErroresDeValidacion(error)
    mensajeError.value = mensajeDesdeError(error, 'registrar el expediente')
  } finally {
    creando.value = false
  }
}

onMounted(() => {
  void cargarCandidatos()
  void cargarCatalogos()
})
</script>

<template>
  <section class="registration-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Gestión académica</p>
        <h1>Registrar Expediente Digital</h1>
        <p class="page-description">Complete los datos y adjunte la solicitud para iniciar su proceso.</p>
      </div>
      <button type="button" class="secondary-button" :disabled="creando" @click="router.push({ name: 'expedientes' })">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
        Volver a mis expedientes
      </button>
    </header>

    <div v-if="!puedeRegistrar" class="interface-state error-state" role="alert">
      <span class="material-symbols-outlined" aria-hidden="true">error</span>
      <div><h2>Registro no disponible</h2><p>Su rol no puede registrar expedientes.</p></div>
    </div>

    <div v-else-if="alumnoPropio === null" class="interface-state error-state" role="alert">
      <span class="material-symbols-outlined" aria-hidden="true">error</span>
      <div><h2>Perfil de tesista no disponible</h2><p>Su cuenta no tiene un perfil Alumno activo para registrar el expediente.</p></div>
    </div>

    <form v-else class="registration-form" @submit.prevent="registrarExpediente">
      <div v-if="mensajeError" class="interface-state error-state" role="alert">
        <span class="material-symbols-outlined" aria-hidden="true">error</span>
        <div><h2>No se pudo registrar el expediente</h2><p>{{ mensajeError }}</p></div>
      </div>

      <div class="form-grid">
        <section class="form-column">
          <article class="form-card">
            <header class="card-heading">
              <span class="material-symbols-outlined" aria-hidden="true">edit_document</span>
              <div><p class="card-kicker">Sección A</p><h2>Datos del Expediente</h2></div>
            </header>

            <div class="fields-grid">
              <label class="field field-span">
                <span>Tipo de trámite</span>
                <select disabled aria-describedby="tramite-help"><option>Aprobación de proyecto de tesis</option></select>
                <small id="tramite-help" class="hint">Este registro abre el flujo de aprobación de proyecto de tesis.</small>
              </label>

              <label class="field field-span">
                <span>N.º de expediente <b aria-hidden="true">*</b></span>
                <input v-model.trim="formulario.cod_expediente" type="text" maxlength="50" pattern="[A-Za-z0-9-]+" autocomplete="off" required />
                <small v-if="errores.cod_expediente" class="field-error">{{ errores.cod_expediente }}</small>
              </label>

              <label class="field field-span">
                <span>Tesista</span>
                <input :value="`Perfil autenticado (ID ${alumnoPropio.id_alumno})`" type="text" readonly />
                <small v-if="errores.alumno" class="field-error">{{ errores.alumno }}</small>
              </label>

              <div class="field">
                <label class="check-label"><input v-model="incluirCoTesista" type="checkbox" @change="actualizarCoTesista" /><span>¿Tesista dos?</span></label>
                <select v-model.number="formulario.id_co_tesista" :disabled="!incluirCoTesista || cargandoCandidatos">
                  <option :value="null">Seleccione Tesista dos...</option>
                  <option v-for="alumno in candidatos" :key="alumno.id_alumno" :value="alumno.id_alumno">{{ nombreAlumno(alumno) }}</option>
                </select>
                <small v-if="cargandoCandidatos" class="hint">Cargando candidatos…</small>
                <small v-else-if="mensajeCandidatos" class="field-error">{{ mensajeCandidatos }}</small>
                <small v-if="errores.id_co_tesista" class="field-error">{{ errores.id_co_tesista }}</small>
              </div>

              <label class="field field-span">
                <span>Título del proyecto</span>
                <textarea v-model.trim="formulario.titulo" rows="2" placeholder="Ingrese el título propuesto..." required></textarea>
                <small class="hint">{{ cantidadPalabrasTitulo }}/20 palabras</small>
                <small v-if="errores.titulo" class="field-error">{{ errores.titulo }}</small>
              </label>

              <label class="field">
                <span>Área de investigación</span>
                <select v-model.number="formulario.id_area_investigacion" :disabled="cargandoCatalogos" required>
                  <option :value="null">Seleccione un área...</option>
                  <option v-for="area in catalogos.areas" :key="area.id_area_investigacion" :value="area.id_area_investigacion">{{ area.nombre }}</option>
                </select>
                <small v-if="errores.id_area_investigacion" class="field-error">{{ errores.id_area_investigacion }}</small>
              </label>

              <label class="field">
                <span>Sublínea de investigación</span>
                <select v-model.number="formulario.id_sublinea_investigacion" :disabled="cargandoCatalogos" required>
                  <option :value="null">Seleccione una sublínea...</option>
                  <option v-for="sublinea in catalogos.sublineas" :key="sublinea.id_sublinea_investigacion" :value="sublinea.id_sublinea_investigacion">{{ sublinea.nombre }}</option>
                </select>
                <small v-if="errores.id_sublinea_investigacion" class="field-error">{{ errores.id_sublinea_investigacion }}</small>
              </label>

              <label class="field">
                <span>Asesor propuesto</span>
                <select v-model.number="formulario.id_asesor" :disabled="cargandoCatalogos" required>
                  <option :value="null">Seleccione un asesor...</option>
                  <option v-for="docente in catalogos.docentes" :key="docente.id_docente" :value="docente.id_docente">{{ nombreDocente(docente) }}</option>
                </select>
                <small v-if="errores.id_asesor" class="field-error">{{ errores.id_asesor }}</small>
              </label>

              <div class="field">
                <label class="check-label"><input v-model="incluirCoasesor" type="checkbox" @change="actualizarCoasesor" /><span>¿Coasesor?</span></label>
                <select v-model.number="formulario.id_coasesor" :disabled="!incluirCoasesor || cargandoCatalogos">
                  <option :value="null">Seleccione un coasesor...</option>
                  <option v-for="docente in catalogos.docentes" :key="docente.id_docente" :value="docente.id_docente">{{ nombreDocente(docente) }}</option>
                </select>
                <small v-if="errores.id_coasesor" class="field-error">{{ errores.id_coasesor }}</small>
              </div>

              <small v-if="cargandoCatalogos" class="hint field-span">Cargando catálogos académicos…</small>
              <small v-else-if="mensajeCatalogos" class="field-error field-span">{{ mensajeCatalogos }}</small>

              <label class="field field-span">
                <span>Resumen ejecutivo</span>
                <textarea v-model.trim="formulario.resumen" rows="4" placeholder="Breve descripción del proyecto..." required></textarea>
                <small v-if="errores.resumen" class="field-error">{{ errores.resumen }}</small>
              </label>
            </div>
          </article>
        </section>

        <aside class="form-column">
          <article class="form-card">
            <header class="card-heading">
              <span class="material-symbols-outlined" aria-hidden="true">folder_open</span>
              <div><p class="card-kicker">Sección B</p><h2>Documentos</h2></div>
            </header>

            <div class="document-list">
              <div class="document-item">
                <span class="material-symbols-outlined" aria-hidden="true">description</span>
                <div class="document-copy">
                  <strong>Solicitud de inscripción</strong>
                  <span :class="formulario.solicitud_adjunta ? 'document-status is-loaded' : 'document-status'">{{ formulario.solicitud_adjunta ? 'Cargado' : 'Pendiente' }}</span>
                  <small v-if="formulario.solicitud_adjunta">{{ nombreSolicitud }}</small>
                </div>
                <label class="icon-button" title="Adjuntar solicitud">
                  <span class="material-symbols-outlined" aria-hidden="true">upload</span><span class="sr-only">Adjuntar solicitud</span>
                  <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" @change="seleccionarSolicitud" />
                </label>
              </div>
              <small class="document-hint">PDF o DOCX, con un tamaño máximo de 30 MiB.</small>
              <small v-if="errores.solicitud_adjunta" class="field-error">{{ errores.solicitud_adjunta }}</small>

              <div class="document-item">
                <span class="material-symbols-outlined" aria-hidden="true">task</span>
                <div class="document-copy">
                  <strong>Proyecto de tesis</strong>
                  <span :class="formulario.proyecto_adjunto ? 'document-status is-loaded' : 'document-status'">{{ formulario.proyecto_adjunto ? 'Cargado' : 'Pendiente' }}</span>
                  <small v-if="formulario.proyecto_adjunto">{{ nombreProyecto }}</small>
                </div>
                <label class="icon-button" title="Adjuntar proyecto">
                  <span class="material-symbols-outlined" aria-hidden="true">upload</span><span class="sr-only">Adjuntar proyecto</span>
                  <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" @change="seleccionarProyecto" />
                </label>
              </div>
              <small class="document-hint">PDF o DOCX, con un tamaño máximo de 30 MiB.</small>
              <small v-if="errores.proyecto_adjunto" class="field-error">{{ errores.proyecto_adjunto }}</small>

              <div class="document-item">
                <span class="material-symbols-outlined" aria-hidden="true">description</span>
                <div class="document-copy">
                  <strong>Carta de aceptación del asesor</strong>
                  <span :class="formulario.carta_aceptacion_asesor ? 'document-status is-loaded' : 'document-status'">{{ formulario.carta_aceptacion_asesor ? 'Cargado' : 'Pendiente' }}</span>
                  <small v-if="formulario.carta_aceptacion_asesor">{{ nombreCartaAceptacion }}</small>
                </div>
                <label class="icon-button" title="Adjuntar carta de aceptación">
                  <span class="material-symbols-outlined" aria-hidden="true">upload</span><span class="sr-only">Adjuntar carta de aceptación</span>
                  <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" @change="seleccionarCartaAceptacion" />
                </label>
              </div>
              <small class="document-hint">PDF o DOCX, con un tamaño máximo de 30 MiB.</small>
              <small v-if="errores.carta_aceptacion_asesor" class="field-error">{{ errores.carta_aceptacion_asesor }}</small>
            </div>
          </article>

          <article class="form-card">
            <header class="card-heading">
              <span class="material-symbols-outlined" aria-hidden="true">fact_check</span>
              <div><p class="card-kicker">Sección C</p><h2>Validación previa</h2></div>
            </header>
            <p class="pending-copy">Confirme las declaraciones antes de enviar el expediente.</p>
            <label class="declaration"><input v-model="confirmaciones.normativas" type="checkbox" /><span>He revisado las normativas vigentes.</span></label>
            <label class="declaration"><input v-model="confirmaciones.documentos" type="checkbox" /><span>Declaro que los documentos adjuntos son copias fieles al original.</span></label>
            <small v-if="errores.confirmaciones" class="field-error">{{ errores.confirmaciones }}</small>
          </article>
        </aside>
      </div>

      <footer class="action-bar">
        <div class="flow-info"><span class="material-symbols-outlined" aria-hidden="true">account_tree</span><p><strong>Asignación inicial del sistema</strong>Registro de expediente digital · Pendiente de derivación</p></div>
        <div class="action-buttons">
          <button type="button" class="text-button" :disabled="creando" @click="router.push({ name: 'expedientes' })">Cancelar</button>
          <button type="submit" class="primary-button" :disabled="creando || !puedeEnviar"><span class="material-symbols-outlined" aria-hidden="true">send</span>{{ creando ? 'Enviando…' : 'Enviar expediente' }}</button>
        </div>
      </footer>
    </form>
  </section>
</template>

<style scoped>
.registration-page, .registration-form { display: grid; width: 100%; gap: var(--siset-space-6); }
.page-heading, .action-bar, .action-buttons, .card-heading, .document-item, .flow-info, .interface-state { display: flex; align-items: center; }
.page-heading, .action-bar { justify-content: space-between; gap: var(--siset-space-4); }
.eyebrow, .card-kicker { margin: 0 0 var(--siset-space-1); color: var(--siset-color-primary); font-size: .75rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
h1, h2, p { margin: 0; }
h1 { color: var(--siset-color-primary); font-size: clamp(1.5rem, 2vw, 1.9rem); line-height: 1.2; }
h2 { color: var(--siset-color-text); font-size: 1rem; }
.page-description { margin-top: var(--siset-space-2); color: var(--siset-color-text-muted); }
button { min-height: 2.75rem; border-radius: var(--siset-radius-lg); transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease; }
.secondary-button, .text-button { padding: var(--siset-space-2) var(--siset-space-4); color: var(--siset-color-primary); font-weight: 700; background: var(--siset-color-surface); border: 1px solid var(--siset-color-border-strong); }
.secondary-button { display: inline-flex; gap: var(--siset-space-2); align-items: center; }
.secondary-button:hover, .text-button:hover { background: var(--siset-color-surface-muted); }
.primary-button { display: inline-flex; gap: var(--siset-space-2); align-items: center; padding: var(--siset-space-2) var(--siset-space-5); color: var(--siset-color-surface); font-weight: 700; background: var(--siset-color-primary); border: 1px solid var(--siset-color-primary); box-shadow: var(--siset-shadow-sm); }
.primary-button:hover { background: var(--siset-color-primary-container); border-color: var(--siset-color-primary-container); }
button:disabled { cursor: not-allowed; opacity: .6; }
.interface-state { gap: var(--siset-space-4); padding: var(--siset-space-5); border: 1px solid var(--siset-color-border); border-radius: var(--siset-radius-xl); }
.interface-state .material-symbols-outlined { font-size: 2rem; }
.error-state { color: var(--siset-color-error); background: var(--siset-color-error-container); border-color: var(--siset-color-error); }
.error-state h2, .error-state p { color: var(--siset-color-error); }
.form-grid { display: grid; grid-template-columns: minmax(0, 7fr) minmax(20rem, 5fr); gap: var(--siset-space-5); align-items: start; }
.form-column { display: grid; gap: var(--siset-space-5); }
.form-card { padding: var(--siset-space-5); background: var(--siset-color-surface); border: 1px solid var(--siset-color-border); border-radius: var(--siset-radius-xl); box-shadow: var(--siset-shadow-sm); }
.card-heading { gap: var(--siset-space-3); padding-bottom: var(--siset-space-4); margin-bottom: var(--siset-space-5); border-bottom: 1px solid var(--siset-color-border); }
.card-heading > .material-symbols-outlined { color: var(--siset-color-primary); font-size: 1.4rem; }
.fields-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--siset-space-5); }
.field { display: grid; gap: var(--siset-space-2); color: var(--siset-color-text); font-size: .875rem; font-weight: 700; }
.field-span { grid-column: span 2; }
.field b, .field-error { color: var(--siset-color-error); }
input, select, textarea { width: 100%; padding: var(--siset-space-3); color: var(--siset-color-text); line-height: 1.3; background: var(--siset-color-background); border: 1px solid var(--siset-color-border); border-radius: var(--siset-radius-lg); }
textarea { resize: vertical; }
input[readonly], input:disabled, select:disabled, textarea:disabled { color: var(--siset-color-text-muted); cursor: not-allowed; background: var(--siset-color-surface-muted); }
.hint, .document-hint, .pending-copy { color: var(--siset-color-text-muted); font-size: .75rem; font-weight: 400; }
.field-error { font-size: .75rem; }
.check-label, .declaration { display: inline-flex; gap: var(--siset-space-2); align-items: center; min-height: 2rem; cursor: pointer; }
.check-label input, .declaration input { width: 1rem; height: 1rem; accent-color: var(--siset-color-primary); }
.document-list { display: grid; gap: var(--siset-space-3); }
.document-item { gap: var(--siset-space-3); padding: var(--siset-space-3); background: var(--siset-color-background); border: 1px solid var(--siset-color-border); border-radius: var(--siset-radius-lg); }
.document-item > .material-symbols-outlined { color: var(--siset-color-primary); }
.document-copy { display: grid; flex: 1; gap: var(--siset-space-1); min-width: 0; }
.document-copy strong, .document-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.document-copy small { color: var(--siset-color-text-muted); font-size: .75rem; }
.document-status { justify-self: start; padding: .15rem var(--siset-space-2); color: var(--siset-color-error); font-size: .6875rem; font-weight: 700; background: var(--siset-color-error-container); border-radius: var(--siset-radius-md); }
.document-status.is-loaded { color: var(--siset-color-success); background: var(--siset-color-success-container); }
.icon-button { display: inline-grid; place-items: center; width: 2.25rem; height: 2.25rem; color: var(--siset-color-primary); cursor: pointer; border-radius: 50%; }
.icon-button:hover { background: color-mix(in srgb, var(--siset-color-primary) 10%, transparent); }
.icon-button input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
.is-disabled { opacity: .7; }
.pending-copy { margin: calc(var(--siset-space-5) * -.25) 0 var(--siset-space-3); }
.declaration { align-items: flex-start; width: 100%; padding: var(--siset-space-3) 0; color: var(--siset-color-text-muted); font-size: .875rem; border-top: 1px solid var(--siset-color-border); }
.declaration.is-disabled { cursor: not-allowed; }
.action-bar { flex-wrap: wrap; padding-top: var(--siset-space-5); border-top: 1px solid var(--siset-color-border); }
.flow-info { gap: var(--siset-space-3); color: var(--siset-color-text-muted); font-size: .8125rem; }
.flow-info .material-symbols-outlined { color: var(--siset-color-primary); }
.flow-info strong { display: block; color: var(--siset-color-text); }
.action-buttons { gap: var(--siset-space-3); }
@media (max-width: 64rem) { .form-grid { grid-template-columns: 1fr; } }
@media (max-width: 48rem) { .page-heading, .action-bar { align-items: stretch; flex-direction: column; } .secondary-button, .action-buttons, .text-button, .primary-button { width: 100%; } .action-buttons { flex-direction: column-reverse; } .fields-grid { grid-template-columns: 1fr; } .field-span { grid-column: auto; } .form-card { padding: var(--siset-space-4); } }
</style>
