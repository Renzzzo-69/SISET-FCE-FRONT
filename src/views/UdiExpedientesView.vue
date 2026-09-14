<script setup lang="ts">
import { onMounted, ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

import api from '@/services/api'
import type { Expediente, ParticipanteExpediente } from '@/types/api'

const router = useRouter()
const expedientes = ref<Expediente[]>([])
const filtros = ref({ codigo: '', etapa: '', estado: '' })
const cargando = ref(false)
const mensajeError = ref('')

function nombreParticipante(participante: ParticipanteExpediente | null) {
  return participante
    ? [participante.apellido_paterno, participante.apellido_materno, participante.nombres]
        .filter(Boolean)
        .join(' ')
    : 'No registrado'
}

function mensajeDesdeError(error: unknown) {
  if (!axios.isAxiosError(error)) return 'No se pudo cargar la bandeja UDI.'

  switch (error.response?.status) {
    case 401:
      return 'La sesión expiró. Inicie sesión nuevamente.'
    case 403:
      return 'No tiene autorización para consultar la bandeja UDI.'
    case 404:
      return 'Uno de los expedientes ya no está disponible.'
    case 422:
      return error.response.data?.message ?? 'Los filtros enviados no son válidos.'
    default:
      return error.response?.data?.message ?? 'No se pudo cargar la bandeja UDI.'
  }
}

function parametrosFiltros() {
  const parametros: Record<string, string> = {}

  if (filtros.value.codigo !== '') parametros.codigo = filtros.value.codigo
  if (filtros.value.etapa !== '') parametros.etapa = filtros.value.etapa
  if (filtros.value.estado !== '') parametros.estado = filtros.value.estado

  return parametros
}

async function cargarExpedientes() {
  cargando.value = true
  mensajeError.value = ''

  try {
    const { data } = await api.get<Expediente[]>('/expedientes', { params: parametrosFiltros() })
    expedientes.value = data
  } catch (error) {
    expedientes.value = []
    mensajeError.value = mensajeDesdeError(error)
  } finally {
    cargando.value = false
  }
}

function limpiarFiltros() {
  filtros.value = { codigo: '', etapa: '', estado: '' }
  cargarExpedientes()
}

onMounted(cargarExpedientes)
</script>

<template>
  <section>
    <div class="heading">
      <div>
        <h1>Bandeja UDI</h1>
        <p>Expedientes disponibles para revisión documentaria.</p>
      </div>
      <button type="button" @click="router.push({ name: 'expedientes' })">Volver a expedientes</button>
    </div>

    <form class="filters" @submit.prevent="cargarExpedientes">
      <label>
        Código
        <input v-model.trim="filtros.codigo" type="number" min="1" inputmode="numeric">
      </label>
      <label>
        Código de etapa
        <input v-model.trim="filtros.etapa" type="text" placeholder="registro_expediente_digital">
      </label>
      <label>
        Código de estado
        <input v-model.trim="filtros.estado" type="text" placeholder="pendiente_derivacion">
      </label>
      <div class="filter-actions">
        <button type="submit" :disabled="cargando">{{ cargando ? 'Buscando…' : 'Filtrar' }}</button>
        <button type="button" class="secondary" :disabled="cargando" @click="limpiarFiltros">Limpiar</button>
      </div>
    </form>

    <p v-if="cargando" class="status">Cargando bandeja UDI…</p>

    <div v-else-if="mensajeError" class="error" role="alert">
      <p>{{ mensajeError }}</p>
      <button type="button" @click="cargarExpedientes">Reintentar</button>
    </div>

    <p v-else-if="!expedientes.length" class="status">No hay expedientes para los filtros seleccionados.</p>

    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Tesista 1</th>
            <th>Tesista 2</th>
            <th>Etapa</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="expediente in expedientes" :key="expediente.id_expediente">
            <td>{{ expediente.cod_expediente }}</td>
            <td>{{ nombreParticipante(expediente.tesista) }}</td>
            <td>{{ nombreParticipante(expediente.co_tesista) }}</td>
            <td>{{ expediente.etapa?.nombre ?? 'No disponible' }}</td>
            <td>{{ expediente.estado_actual?.nombre ?? 'No disponible' }}</td>
            <td>
              <button
                type="button"
                @click="router.push({ name: 'udi-revision', params: { id: expediente.id_expediente } })"
              >
                Revisar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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
.status {
  margin-top: 0.35rem;
  color: #6b7280;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.75rem;
  padding: 1rem;
  margin-bottom: 1rem;
  background: #fff;
  border-radius: 6px;
}

label {
  display: grid;
  gap: 0.35rem;
  color: #374151;
  font-size: 0.9rem;
}

input {
  min-width: 12rem;
  padding: 0.5rem;
  border: 1px solid #9ca3af;
  border-radius: 4px;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
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

.error {
  padding: 1rem;
  color: #991b1b;
  background: #fef2f2;
  border-radius: 4px;
}

.error button {
  margin-top: 0.75rem;
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

@media (max-width: 700px) {
  .heading,
  .filter-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
