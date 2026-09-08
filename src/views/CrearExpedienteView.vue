<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { AlumnoActivo, CrearExpedientePayload, Expediente } from '@/types/api'

const auth = useAuthStore()
const router = useRouter()

const alumnos = ref<AlumnoActivo[]>([])
const cargandoAlumnos = ref(false)
const creando = ref(false)
const mensajeError = ref('')
const errores = ref<Record<string, string>>({})
const formulario = reactive({
  cod_expediente: null as number | null,
  id_tesista_1: null as number | null,
  incluirTesista2: false,
  id_tesista_2: null as number | null,
  solicitud_adjunta: '',
  version: 1 as number | null,
})

const puedeRegistrar = computed(() => auth.tieneRol('tesista'))
const alumnoPropio = computed(() =>
  alumnos.value.find(
    (alumno) => alumno.id_usuario === auth.usuario?.id_usuario || alumno.usuario?.id_usuario === auth.usuario?.id_usuario,
  ),
)
const alumnosParaTesista2 = computed(() =>
  alumnos.value.filter((alumno) => alumno.id_alumno !== formulario.id_tesista_1),
)

watch(
  () => formulario.incluirTesista2,
  (incluido) => {
    if (!incluido) {
      formulario.id_tesista_2 = null
    }
  },
)

function nombreAlumno(alumno: AlumnoActivo) {
  return [alumno.apellido_paterno, alumno.apellido_materno, alumno.nombres].filter(Boolean).join(' ')
}

function mensajeDesdeError(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return 'No se pudo registrar el expediente.'
  }

  if (error.response?.status === 401) {
    return 'La sesión expiró. Inicie sesión nuevamente.'
  }

  if (error.response?.status === 403) {
    return 'No tiene autorización para registrar este expediente.'
  }

  return error.response?.data?.message || 'No se pudo registrar el expediente.'
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
      campo === 'id_tesista' ? 'id_tesista_1' : campo === 'id_co_tesista' ? 'id_tesista_2' : campo,
      mensajes[0] ?? 'Valor inválido.',
    ]),
  )
}

function validarFormulario() {
  const siguientes: Record<string, string> = {}

  if (!Number.isInteger(formulario.cod_expediente)) {
    siguientes.cod_expediente = 'Ingrese un código entero.'
  }

  if (!Number.isInteger(formulario.id_tesista_1)) {
    siguientes.id_tesista_1 = 'Seleccione Tesista 1.'
  }

  if (formulario.incluirTesista2) {
    if (!Number.isInteger(formulario.id_tesista_2)) {
      siguientes.id_tesista_2 = 'Seleccione Tesista 2 o desactive esta opción.'
    } else if (formulario.id_tesista_2 === formulario.id_tesista_1) {
      siguientes.id_tesista_2 = 'Tesista 2 debe ser distinto de Tesista 1.'
    }
  }

  if (!formulario.solicitud_adjunta.trim()) {
    siguientes.solicitud_adjunta = 'Ingrese la referencia de la solicitud adjunta.'
  }

  if (!Number.isInteger(formulario.version)) {
    siguientes.version = 'Ingrese una versión entera.'
  }

  if (puedeRegistrar.value) {
    if (!alumnoPropio.value) {
      siguientes.id_tesista_1 = 'No se pudo identificar su alumno activo para registrar el expediente.'
    } else if (
      formulario.id_tesista_1 !== alumnoPropio.value.id_alumno &&
      formulario.id_tesista_2 !== alumnoPropio.value.id_alumno
    ) {
      siguientes.id_tesista_1 = 'Debe participar como Tesista 1 o Tesista 2.'
    }
  }

  errores.value = siguientes
  return Object.keys(siguientes).length === 0
}

async function cargarAlumnos() {
  cargandoAlumnos.value = true
  mensajeError.value = ''

  try {
    const { data } = await api.get<AlumnoActivo[]>('/alumnos')
    alumnos.value = data
  } catch (error) {
    mensajeError.value = mensajeDesdeError(error)
  } finally {
    cargandoAlumnos.value = false
  }
}

async function registrarExpediente() {
  mensajeError.value = ''

  if (!validarFormulario()) {
    return
  }

  const payload: CrearExpedientePayload = {
    cod_expediente: formulario.cod_expediente as number,
    id_tesista: formulario.id_tesista_1 as number,
    solicitud_adjunta: formulario.solicitud_adjunta.trim(),
    version: formulario.version as number,
  }

  if (formulario.incluirTesista2 && formulario.id_tesista_2 !== null) {
    payload.id_co_tesista = formulario.id_tesista_2
  }

  creando.value = true

  try {
    await api.post<Expediente>('/expedientes', payload)
    await router.push({ name: 'expedientes' })
  } catch (error) {
    asignarErroresDeValidacion(error)
    mensajeError.value = mensajeDesdeError(error)
  } finally {
    creando.value = false
  }
}

onMounted(cargarAlumnos)
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

    <p v-if="cargandoAlumnos" class="status">Cargando alumnos activos…</p>

    <div v-else-if="mensajeError && !alumnos.length" class="error" role="alert">
      <p>{{ mensajeError }}</p>
      <button type="button" @click="cargarAlumnos">Reintentar</button>
    </div>

    <p v-else-if="!puedeRegistrar" class="error" role="alert">
      Su rol no puede registrar expedientes.
    </p>

    <p v-else-if="!alumnos.length" class="status">No hay alumnos activos disponibles.</p>

    <form v-else class="formulario" @submit.prevent="registrarExpediente">
      <div v-if="mensajeError" class="error" role="alert">{{ mensajeError }}</div>

      <label>
        Código de expediente
        <input v-model.number="formulario.cod_expediente" type="number" step="1" required />
        <small v-if="errores.cod_expediente" class="field-error">{{ errores.cod_expediente }}</small>
      </label>

      <label>
        Tesista 1
        <select v-model.number="formulario.id_tesista_1" required>
          <option :value="null" disabled>Seleccione un alumno</option>
          <option v-for="alumno in alumnos" :key="alumno.id_alumno" :value="alumno.id_alumno">
            {{ nombreAlumno(alumno) }}
          </option>
        </select>
        <small v-if="errores.id_tesista_1" class="field-error">{{ errores.id_tesista_1 }}</small>
      </label>

      <label class="checkbox">
        <input v-model="formulario.incluirTesista2" type="checkbox" />
        Incluir Tesista 2
      </label>

      <label v-if="formulario.incluirTesista2">
        Tesista 2
        <select v-model.number="formulario.id_tesista_2" required>
          <option :value="null" disabled>Seleccione un alumno</option>
          <option v-for="alumno in alumnosParaTesista2" :key="alumno.id_alumno" :value="alumno.id_alumno">
            {{ nombreAlumno(alumno) }}
          </option>
        </select>
        <small v-if="errores.id_tesista_2" class="field-error">{{ errores.id_tesista_2 }}</small>
      </label>

      <label>
        Solicitud adjunta
        <input v-model="formulario.solicitud_adjunta" type="text" required />
        <small class="hint">Ingrese la ruta o referencia admitida por el contrato actual.</small>
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

.checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkbox input {
  width: auto;
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
