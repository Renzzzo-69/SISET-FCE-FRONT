<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { RouterLink, useRouter } from 'vue-router'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Expediente, ExpedienteDetalle, ExpedienteDetalleResponse } from '@/types/api'

const auth = useAuthStore()
const router = useRouter()
const expedientes = ref<Expediente[]>([])
const seleccionado = ref<number | null>(null)
const detalle = ref<ExpedienteDetalle | null>(null)
const cargando = ref(true)
const error = ref('')
const habilitada = computed(
  () =>
    detalle.value?.etapa_actual?.codigo === 'fase_tesis_informe_final' &&
    detalle.value?.estado_actual?.codigo === 'fase_tesis_habilitada',
)
const puedeRegistrar = computed(() => {
  const alumno = auth.usuario?.alumno?.id_alumno
  return (
    habilitada.value &&
    auth.tieneRol('tesista') &&
    alumno !== undefined &&
    [detalle.value?.tesista_1?.id_alumno, detalle.value?.tesista_2?.id_alumno].includes(alumno) &&
    Boolean(detalle.value?.informes.some((informe) => informe.es_tesis === 0))
  )
})
const requisitos = computed(() => [
  {
    nombre: 'Proyecto aprobado',
    valor:
      habilitada.value || detalle.value?.estado_actual?.codigo === 'proyecto_aprobado'
        ? 'Sí'
        : 'Sin confirmar',
    icono: habilitada.value ? 'check_circle' : 'info',
    conforme: habilitada.value,
  },
  { nombre: 'Resolución de expedición', valor: 'No disponible', icono: 'info', conforme: false },
  {
    nombre: 'Observaciones pendientes',
    valor: habilitada.value
      ? 'Resueltas'
      : ['observado', 'pendiente_subsanacion'].includes(detalle.value?.estado_actual?.codigo ?? '')
        ? 'Sí'
        : 'Sin confirmar',
    icono: habilitada.value ? 'check_circle' : 'warning',
    conforme: habilitada.value,
  },
])
const ejemplo = [
  { nombre: 'Proyecto aprobado', valor: 'Sí' },
  { nombre: 'Resolución de expedición', valor: 'Emitida' },
  { nombre: 'Observaciones pendientes', valor: 'Resueltas' },
]
async function cargarDetalle() {
  if (seleccionado.value === null) return
  cargando.value = true
  error.value = ''
  detalle.value = null
  try {
    const { data } = await api.get<ExpedienteDetalleResponse>(`/expedientes/${seleccionado.value}`)
    detalle.value = data.data
    if (!data.data) error.value = 'No hay información de detalle disponible para este expediente.'
  } catch (causa) {
    error.value = axios.isAxiosError(causa)
      ? causa.response?.data?.message || 'No se pudo cargar el expediente.'
      : 'No se pudo cargar el expediente.'
  } finally {
    cargando.value = false
  }
}
async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<Expediente[]>('/expedientes')
    expedientes.value = data
    seleccionado.value =
      data.find((item) => item.id_expediente === seleccionado.value)?.id_expediente ??
      data[0]?.id_expediente ??
      null
    await cargarDetalle()
  } catch (causa) {
    error.value = axios.isAxiosError(causa)
      ? causa.response?.data?.message || 'No se pudieron cargar los expedientes.'
      : 'No se pudieron cargar los expedientes.'
  } finally {
    cargando.value = false
  }
}
function registrar() {
  if (!puedeRegistrar.value || !detalle.value) return
  return router.push({
    name: 'expedientes-detalle',
    params: { id: detalle.value.id_expediente },
    query: { registrar: 'tesis-final' },
    hash: '#informes',
  })
}
onMounted(cargar)
</script>

<template>
  <section class="tesis-final" :aria-busy="cargando">
    <header class="page-heading">
      <h1>Tesis Final</h1>
      <p>
        Monitoreo del estado de habilitación para el registro del informe final de tesis. Asegúrese
        de cumplir con todos los requisitos previos.
      </p>
    </header>
    <label v-if="expedientes.length > 1" class="file-picker"
      >Expediente<select v-model="seleccionado" :disabled="cargando" @change="cargarDetalle">
        <option v-for="item in expedientes" :key="item.id_expediente" :value="item.id_expediente">
          {{ item.cod_expediente }}
        </option>
      </select></label
    >
    <p v-if="cargando" class="empty card" role="status">Cargando estado de habilitación…</p>
    <div v-else-if="error" class="empty card" role="alert">
      <p>{{ error }}</p>
      <button @click="cargar">Reintentar</button>
    </div>
    <div v-else-if="!detalle" class="empty card">
      <span class="material-symbols-outlined" aria-hidden="true">folder_open</span>
      <p>Aún no tienes expedientes registrados.</p>
      <RouterLink :to="{ name: 'expedientes-nuevo' }">Registrar expediente</RouterLink>
    </div>
    <div v-else class="phase-grid">
      <article class="card phase-card" :class="{ enabled: habilitada }">
        <header class="card-heading">
          <span class="material-symbols-outlined" aria-hidden="true">{{
            habilitada ? 'check_circle' : 'lock'
          }}</span
          ><span>Estado Actual</span>
        </header>
        <div class="card-body">
          <span class="phase-icon material-symbols-outlined" aria-hidden="true">{{
            habilitada ? 'check_circle' : 'lock'
          }}</span>
          <h2>{{ habilitada ? 'Fase habilitada' : 'Fase bloqueada' }}</h2>
          <p>
            {{
              habilitada
                ? 'El expediente tiene habilitada la fase de tesis. Puede proceder con el registro del informe final.'
                : 'No es posible continuar. Revise los requisitos pendientes a continuación.'
            }}
          </p>
          <dl class="requirements">
            <div v-for="requisito in requisitos" :key="requisito.nombre">
              <dt>{{ requisito.nombre }}</dt>
              <dd :class="{ success: requisito.conforme }">
                {{ requisito.valor
                }}<span class="material-symbols-outlined" aria-hidden="true">{{
                  requisito.icono
                }}</span>
              </dd>
            </div>
          </dl>
          <button class="register-button" :disabled="!puedeRegistrar" @click="registrar">
            <span class="material-symbols-outlined" aria-hidden="true">{{
              puedeRegistrar ? 'upload_file' : 'block'
            }}</span
            >Registrar informe final
          </button>
        </div>
      </article>
      <article
        class="card phase-card enabled example-card"
        aria-label="Ejemplo ilustrativo de la fase habilitada"
      >
        <header class="card-heading">
          <span class="material-symbols-outlined" aria-hidden="true">visibility</span
          ><span>Ejemplo: Al cumplir requisitos</span>
        </header>
        <div class="card-body">
          <span class="phase-icon material-symbols-outlined" aria-hidden="true">check_circle</span>
          <h2>Fase habilitada</h2>
          <p>Todos los requisitos han sido validados con éxito. Puede proceder.</p>
          <dl class="requirements">
            <div v-for="requisito in ejemplo" :key="requisito.nombre">
              <dt>{{ requisito.nombre }}</dt>
              <dd class="success">
                {{ requisito.valor
                }}<span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
              </dd>
            </div>
          </dl>
          <button
            class="register-button example-button"
            disabled
            title="Ejemplo ilustrativo. El registro se realiza desde Estado Actual."
          >
            <span class="material-symbols-outlined" aria-hidden="true">upload_file</span>Registrar
            informe final
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.tesis-final {
  max-width: 1024px;
  margin: 0 auto;
  font-size: 14px;
  line-height: 20px;
}
h1,
h2,
p,
dl,
dd {
  margin: 0;
}
.page-heading {
  margin-bottom: 32px;
}
h1 {
  font-size: 28px;
  line-height: 36px;
  letter-spacing: -0.5px;
  margin-bottom: 8px;
}
.page-heading p {
  max-width: 672px;
  color: #45464f;
}
.phase-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 32px;
  align-items: start;
  margin-bottom: 48px;
}
.card {
  background: white;
  border: 1px solid #c5c6d1;
  border-radius: 8px;
  box-shadow: 0 2px 4px #0000000d;
}
.phase-card {
  overflow: hidden;
  position: relative;
}
.card-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-bottom: 1px solid #c5c6d1;
  background: #ededf3;
  color: #757681;
  font-size: 11px;
  line-height: 14px;
  font-weight: 700;
  letter-spacing: 0.55px;
  text-transform: uppercase;
}
.card-heading .material-symbols-outlined {
  font-size: 20px;
}
.card-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px;
}
.phase-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: #e2e2e8;
  border: 1px dashed #c5c6d1;
  color: #757681;
  font-size: 32px;
  margin-bottom: 16px;
}
h2 {
  font-size: 22px;
  line-height: 30px;
  font-weight: 600;
  margin-bottom: 4px;
}
.card-body > p {
  color: #45464f;
  margin-bottom: 24px;
  min-height: 40px;
}
.requirements {
  width: 100%;
  padding: 16px;
  margin-bottom: 24px;
  background: #f9f9ff;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  text-align: left;
  font-size: 12px;
  line-height: 16px;
}
.requirements > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 8px;
  margin-bottom: 12px;
  border-bottom: 1px solid #e2e2e8;
}
.requirements > div:last-child {
  padding: 0;
  margin: 0;
  border: 0;
}
.requirements dd {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  text-align: right;
  color: #757681;
}
.requirements dd.success {
  color: #006b5c;
}
.requirements .material-symbols-outlined {
  font-size: 16px;
}
.register-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  border: 0;
  border-radius: 4px;
  background: #006b5c;
  color: white;
  font-size: 12px;
  line-height: 16px;
}
.register-button .material-symbols-outlined {
  font-size: 18px;
}
.register-button:not(:disabled):hover {
  background: #005045;
}
.register-button:disabled {
  background: #e2e2e8;
  color: #45464f;
  opacity: 0.7;
}
.enabled::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: #006b5c;
}
.enabled .card-heading {
  background: #f3f3f9;
  color: #45464f;
}
.enabled .card-heading .material-symbols-outlined {
  color: #006b5c;
}
.enabled .phase-icon {
  background: #6ff5dc33;
  color: #006b5c;
  border: 1px solid #006b5c4d;
}
.register-button.example-button:disabled {
  background: #006b5c;
  color: white;
  opacity: 1;
}
.file-picker {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}
.file-picker select {
  padding: 8px 12px;
  background: white;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
}
.empty {
  display: grid;
  justify-items: center;
  gap: 16px;
  text-align: center;
  padding: 40px 24px;
}
.empty button {
  padding: 8px 16px;
  color: white;
  background: #283a70;
  border: 0;
  border-radius: 4px;
}
@media (max-width: 1023px) {
  .phase-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 480px) {
  .card-body {
    padding: 20px 16px;
  }
  h1 {
    font-size: 24px;
    line-height: 32px;
  }
}
</style>
