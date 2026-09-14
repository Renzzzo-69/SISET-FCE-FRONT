<script setup lang="ts">
import { onMounted, ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

import api, { descargarDocumentoPrivado } from '@/services/api'
import type { ActualizarTurnitinResponse, InformeTurnitin } from '@/types/api'

const router = useRouter()
const informes = ref<InformeTurnitin[]>([])
const porcentajes = ref<Record<number, number | null>>({})
const errores = ref<Record<number, string>>({})
const cargando = ref(false)
const guardando = ref<number | null>(null)
const descargando = ref<number | null>(null)
const mensajeError = ref('')
const mensajeGuardado = ref('')

function obtenerMensajeError(error: unknown, predeterminado: string) {
  if (!axios.isAxiosError(error)) return predeterminado

  if (error.response?.status === 403) {
    return 'No tiene autorización para acceder a la bandeja de Turnitin.'
  }

  return error.response?.data?.message ?? predeterminado
}

async function cargarInformes() {
  cargando.value = true
  mensajeError.value = ''
  mensajeGuardado.value = ''

  try {
    const { data } = await api.get<InformeTurnitin[]>('/informes-tesis/turnitin')
    informes.value = data
    porcentajes.value = Object.fromEntries(data.map((informe) => [informe.id_informe, informe.turnitin]))
    errores.value = {}
  } catch (error) {
    informes.value = []
    mensajeError.value = obtenerMensajeError(error, 'No se pudo cargar la bandeja de Turnitin.')
  } finally {
    cargando.value = false
  }
}

function validarPorcentaje(idInforme: number) {
  const porcentaje = porcentajes.value[idInforme]

  if (typeof porcentaje !== 'number' || !Number.isInteger(porcentaje) || porcentaje < 0 || porcentaje > 100) {
    errores.value[idInforme] = 'Ingrese un número entero entre 0 y 100.'
    return null
  }

  delete errores.value[idInforme]
  return porcentaje
}

async function guardarTurnitin(informe: InformeTurnitin) {
  const porcentaje = validarPorcentaje(informe.id_informe)
  if (porcentaje === null) return

  guardando.value = informe.id_informe
  mensajeError.value = ''
  mensajeGuardado.value = ''

  try {
    const { data } = await api.put<ActualizarTurnitinResponse>(
      `/informes-tesis/${informe.id_informe}/turnitin`,
      { turnitin: porcentaje },
    )
    informe.turnitin = data.data.turnitin
    porcentajes.value[informe.id_informe] = data.data.turnitin
    mensajeGuardado.value = data.mensaje
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      errores.value[informe.id_informe] =
        error.response.data?.errors?.turnitin?.[0] ?? 'El porcentaje debe ser un entero entre 0 y 100.'
    } else {
      mensajeError.value = obtenerMensajeError(error, 'No se pudo guardar el porcentaje de Turnitin.')
    }
  } finally {
    guardando.value = null
  }
}

async function descargarInforme(informe: InformeTurnitin) {
  if (!informe.archivo_adjunto) return

  descargando.value = informe.id_informe
  mensajeError.value = ''

  try {
    await descargarDocumentoPrivado(informe.archivo_adjunto, `informe-${informe.id_informe}`)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      mensajeError.value = 'El archivo del informe ya no está disponible.'
    } else {
      mensajeError.value = obtenerMensajeError(error, 'No se pudo descargar el informe.')
    }
  } finally {
    descargando.value = null
  }
}

function etiquetaTipo(tipo: InformeTurnitin['tipo']) {
  return tipo === 'tesis' ? 'Tesis final' : 'Proyecto'
}

onMounted(cargarInformes)
</script>

<template>
  <section class="turnitin-view">
    <div class="heading">
      <div>
        <h1>Turnitin UDI</h1>
        <p>Registre o corrija el porcentaje de similitud de los informes recibidos.</p>
      </div>
      <div class="actions">
        <button type="button" :disabled="cargando" @click="cargarInformes">
          {{ cargando ? 'Actualizando…' : 'Actualizar' }}
        </button>
        <button type="button" class="secondary" @click="router.push({ name: 'expedientes' })">
          Volver a expedientes
        </button>
      </div>
    </div>

    <p v-if="mensajeError" class="message error" role="alert">{{ mensajeError }}</p>
    <p v-if="mensajeGuardado" class="message success" role="status">{{ mensajeGuardado }}</p>

    <p v-if="cargando" class="state">Cargando bandeja de Turnitin…</p>
    <p v-else-if="informes.length === 0" class="state">No hay informes disponibles en la bandeja de Turnitin.</p>

    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Expediente</th>
            <th>Tipo</th>
            <th>Título</th>
            <th>Versión</th>
            <th>Turnitin actual</th>
            <th>Informe</th>
            <th>Porcentaje</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="informe in informes" :key="informe.id_informe">
            <td>{{ informe.cod_expediente }}</td>
            <td>{{ etiquetaTipo(informe.tipo) }}</td>
            <td>{{ informe.titulo }}</td>
            <td>{{ informe.version }}</td>
            <td>{{ informe.turnitin === null ? 'Pendiente' : `${informe.turnitin}%` }}</td>
            <td>
              <button
                type="button"
                class="link-button"
                :disabled="!informe.archivo_adjunto || descargando === informe.id_informe"
                @click="descargarInforme(informe)"
              >
                {{ descargando === informe.id_informe ? 'Descargando…' : 'Descargar' }}
              </button>
            </td>
            <td>
              <label class="sr-only" :for="`turnitin-${informe.id_informe}`">
                Porcentaje Turnitin del informe {{ informe.id_informe }}
              </label>
              <input
                :id="`turnitin-${informe.id_informe}`"
                v-model.number="porcentajes[informe.id_informe]"
                type="number"
                min="0"
                max="100"
                step="1"
                inputmode="numeric"
                :aria-describedby="errores[informe.id_informe] ? `error-${informe.id_informe}` : undefined"
                @blur="validarPorcentaje(informe.id_informe)"
              >
              <small v-if="errores[informe.id_informe]" :id="`error-${informe.id_informe}`" class="field-error">
                {{ errores[informe.id_informe] }}
              </small>
            </td>
            <td>
              <button
                type="button"
                :disabled="guardando === informe.id_informe"
                @click="guardarTurnitin(informe)"
              >
                {{ guardando === informe.id_informe ? 'Guardando…' : 'Guardar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.turnitin-view {
  display: grid;
  gap: 1rem;
}

.heading,
.actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.heading {
  justify-content: space-between;
}

h1,
p {
  margin: 0;
}

h1 {
  color: #1f2937;
}

.heading p {
  margin-top: 0.25rem;
  color: #6b7280;
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

.secondary {
  color: #1f2937;
  background: #e5e7eb;
}

.message,
.state {
  padding: 0.85rem 1rem;
  border-radius: 4px;
}

.error {
  color: #991b1b;
  background: #fef2f2;
}

.success {
  color: #047857;
  background: #ecfdf5;
}

.state {
  color: #4b5563;
  background: #f3f4f6;
}

.table-wrapper {
  overflow-x: auto;
  background: #fff;
  border-radius: 6px;
}

table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
}

th,
td {
  padding: 0.8rem;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid #e5e7eb;
}

th {
  color: #374151;
  background: #f9fafb;
}

input {
  width: 5rem;
  padding: 0.5rem;
  border: 1px solid #9ca3af;
  border-radius: 4px;
}

.link-button {
  padding: 0;
  color: #534caf;
  text-decoration: underline;
  background: transparent;
}

.field-error {
  display: block;
  margin-top: 0.35rem;
  color: #991b1b;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

@media (max-width: 720px) {
  .heading,
  .actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
