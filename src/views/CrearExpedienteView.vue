<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { CandidatoTesista, Expediente } from '@/types/api'

const auth = useAuthStore()
const router = useRouter()

const candidatos = ref<CandidatoTesista[]>([])
const cargandoCandidatos = ref(false)
const creando = ref(false)
const mensajeError = ref('')
const mensajeCandidatos = ref('')
const errores = ref<Record<string, string>>({})
const formulario = reactive({
  cod_expediente: null as number | null,
  id_co_tesista: null as number | null,
  solicitud_adjunta: null as File | null,
  version: 1 as number | null,
})

const puedeRegistrar = computed(() => auth.tieneRol('tesista'))
const alumnoPropio = computed(() => auth.usuario?.alumno ?? null)

function nombreAlumno(alumno: CandidatoTesista) {
  return [alumno.apellido_paterno, alumno.apellido_materno, alumno.nombres].filter(Boolean).join(' ')
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

function validarFormulario() {
  const siguientes: Record<string, string> = {}
  const archivo = formulario.solicitud_adjunta

  if (!Number.isInteger(formulario.cod_expediente)) {
    siguientes.cod_expediente = 'Ingrese un código entero.'
  }

  if (alumnoPropio.value === null) {
    siguientes.alumno = 'Su cuenta no tiene un perfil Alumno activo para registrar el expediente.'
  }

  if (formulario.id_co_tesista !== null && !Number.isInteger(formulario.id_co_tesista)) {
    siguientes.id_co_tesista = 'Seleccione un co-tesista válido.'
  }

  if (archivo === null) {
    siguientes.solicitud_adjunta = 'Adjunte la solicitud en formato PDF o DOCX.'
  } else if (
    !/\.(pdf|docx)$/i.test(archivo.name) ||
    !['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(
      archivo.type,
    )
  ) {
    siguientes.solicitud_adjunta = 'La solicitud debe ser un archivo PDF o DOCX.'
  } else if (archivo.size > 30 * 1024 * 1024) {
    siguientes.solicitud_adjunta = 'La solicitud no puede superar 30 MiB.'
  }

  if (!Number.isInteger(formulario.version)) {
    siguientes.version = 'Ingrese una versión entera.'
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
    mensajeCandidatos.value = mensajeDesdeError(error, 'consultar los candidatos a co-tesista')
  } finally {
    cargandoCandidatos.value = false
  }
}

async function registrarExpediente() {
  mensajeError.value = ''

  const alumno = alumnoPropio.value
  const archivo = formulario.solicitud_adjunta

  if (!validarFormulario() || alumno === null || archivo === null) {
    return
  }

  const datos = new FormData()
  datos.append('cod_expediente', String(formulario.cod_expediente))
  datos.append('id_tesista', String(alumno.id_alumno))
  datos.append('solicitud_adjunta', archivo)
  datos.append('version', String(formulario.version))

  if (formulario.id_co_tesista !== null) {
    datos.append('id_co_tesista', String(formulario.id_co_tesista))
  }

  creando.value = true

  try {
    await api.post<Expediente>('/expedientes', datos)
    await router.push({ name: 'expedientes' })
  } catch (error) {
    asignarErroresDeValidacion(error)
    mensajeError.value = mensajeDesdeError(error, 'registrar el expediente')
  } finally {
    creando.value = false
  }
}

onMounted(cargarCandidatos)
</script>

<template>
  <section>
    <div class="heading">
      <div>
        <h1>Registrar expediente</h1>
        <p>Complete únicamente los datos requeridos para abrir el expediente.</p>
      </div>
      <button type="button" :disabled="creando" @click="router.push({ name: 'expedientes' })">
        Volver al listado
      </button>
    </div>

    <p v-if="!puedeRegistrar" class="error" role="alert">
      Su rol no puede registrar expedientes.
    </p>

    <p v-else-if="alumnoPropio === null" class="error" role="alert">
      Su cuenta no tiene un perfil Alumno activo para registrar el expediente.
    </p>

    <form v-else class="formulario" @submit.prevent="registrarExpediente">
      <div v-if="mensajeError" class="error" role="alert">{{ mensajeError }}</div>

      <label>
        Código de expediente
        <input v-model.number="formulario.cod_expediente" type="number" step="1" required />
        <small v-if="errores.cod_expediente" class="field-error">{{ errores.cod_expediente }}</small>
      </label>

      <label>
        Tesista 1
        <input :value="`Perfil autenticado (ID ${alumnoPropio.id_alumno})`" type="text" readonly />
        <small v-if="errores.alumno" class="field-error">{{ errores.alumno }}</small>
      </label>

      <label>
        Co-tesista (opcional)
        <select v-model.number="formulario.id_co_tesista" :disabled="cargandoCandidatos">
          <option :value="null">Sin co-tesista</option>
          <option v-for="alumno in candidatos" :key="alumno.id_alumno" :value="alumno.id_alumno">
            {{ nombreAlumno(alumno) }}
          </option>
        </select>
        <small v-if="cargandoCandidatos" class="hint">Cargando candidatos…</small>
        <small v-else-if="mensajeCandidatos" class="field-error">{{ mensajeCandidatos }}</small>
        <small v-if="errores.id_co_tesista" class="field-error">{{ errores.id_co_tesista }}</small>
      </label>

      <label>
        Solicitud adjunta
        <input
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          required
          @change="seleccionarSolicitud"
        />
        <small class="hint">PDF o DOCX, con un tamaño máximo de 30 MiB.</small>
        <small v-if="errores.solicitud_adjunta" class="field-error">{{ errores.solicitud_adjunta }}</small>
      </label>

      <label>
        Versión
        <input v-model.number="formulario.version" type="number" step="1" required />
        <small v-if="errores.version" class="field-error">{{ errores.version }}</small>
      </label>

      <div class="flow-info">
        <strong>Asignación inicial del sistema</strong>
        <span>Etapa: Registro de expediente digital</span>
        <span>Estado: Pendiente de derivación</span>
      </div>

      <button type="submit" :disabled="creando">
        {{ creando ? 'Registrando…' : 'Registrar expediente' }}
      </button>
    </form>
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
p {
  margin: 0;
}

.heading p,
.status,
.hint {
  color: #6b7280;
}

.formulario {
  display: grid;
  max-width: 42rem;
  gap: 1rem;
  padding: 1.25rem;
  background: #fff;
  border-radius: 6px;
}

label {
  display: grid;
  gap: 0.35rem;
  color: #374151;
  font-weight: 600;
}

input,
select {
  padding: 0.6rem;
  font: inherit;
  border: 1px solid #d1d5db;
  border-radius: 4px;
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

.field-error {
  color: #b91c1c;
}

.flow-info {
  display: grid;
  gap: 0.25rem;
  padding: 0.9rem;
  color: #374151;
  background: #f3f4f6;
  border-radius: 4px;
}
</style>
