<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Expediente } from '@/types/api'

const auth = useAuthStore()
const router = useRouter()
const expedientes = ref<Expediente[]>([])
const cargando = ref(false)
const mensajeError = ref('')
const puedeCrear = computed(() => auth.tieneRol('tesista'))
const puedeGestionarRevisionUdi = computed(() => auth.tieneRol('udi', 'administrador'))

async function cargarExpedientes() {
  cargando.value = true
  mensajeError.value = ''

  try {
    const { data } = await api.get<Expediente[]>('/expedientes')
    expedientes.value = data
  } catch (error) {
    mensajeError.value =
      axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : 'No se pudo cargar los expedientes.'
  } finally {
    cargando.value = false
  }
}

onMounted(cargarExpedientes)
</script>

<template>
  <section>
    <div class="heading">
      <div>
        <h1>Expedientes</h1>
        <p>Listado disponible para su cuenta.</p>
      </div>
      <button type="button" :disabled="cargando" @click="cargarExpedientes">
        {{ cargando ? 'Actualizando…' : 'Actualizar' }}
      </button>
      <button v-if="puedeGestionarRevisionUdi" type="button" @click="router.push({ name: 'udi-expedientes' })">
        Bandeja UDI
      </button>
      <button v-if="puedeCrear" type="button" @click="router.push({ name: 'expedientes-nuevo' })">
        Registrar expediente
      </button>
    </div>

    <p v-if="cargando" class="status">Cargando expedientes…</p>

    <div v-else-if="mensajeError" class="error">
      <p>{{ mensajeError }}</p>
      <button type="button" @click="cargarExpedientes">Reintentar</button>
    </div>

    <p v-else-if="!expedientes.length" class="status">No hay expedientes disponibles.</p>

    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Versión</th>
            <th>Etapa actual</th>
            <th>Estado actual</th>
            <th>Cumple</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="expediente in expedientes" :key="expediente.id_expediente">
            <td>{{ expediente.cod_expediente }}</td>
            <td>{{ expediente.version }}</td>
            <td>{{ expediente.id_etapa_actual }}</td>
            <td>{{ expediente.id_estado_actual }}</td>
            <td>{{ expediente.cumple ? 'Sí' : 'No' }}</td>
            <td>
              <button
                type="button"
                @click="router.push({ name: 'expedientes-detalle', params: { id: expediente.id_expediente } })"
              >
                Ver detalle
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

.table-wrapper {
  overflow-x: auto;
  background: #fff;
  border-radius: 6px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 0.8rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

th {
  color: #374151;
  background: #f9fafb;
}
</style>
