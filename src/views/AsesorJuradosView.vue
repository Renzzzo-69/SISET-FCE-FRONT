<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/services/api'
import type { Expediente, ExpedienteDetalle, ExpedienteDetalleResponse } from '@/types/api'

interface Docente {
  id_docente: number
  nombres: string
  apellido_paterno: string
  apellido_materno: string
  estado?: number
  usuario?: { correo_electronico: string } | null
  escuela?: { nombre: string } | null
}
interface Jurado {
  id_jurado: number
  id_expediente: number
  id_designacion: number | null
  cargo: string
  estado: number
  docente: Docente | null
  designacion: { id_designacion: number; estado: string; version: number } | null
}
const expedientes = ref<Expediente[]>([])
const seleccionado = ref<number | null>(null)
const detalle = ref<ExpedienteDetalle | null>(null)
const asesor = ref<Docente | null>(null)
const jurados = ref<Jurado[]>([])
const cargando = ref(true)
const error = ref('')
const errorAsesor = ref('')
const errorJurados = ref('')
const cargos = ['Presidente', 'Secretario', 'Vocal']
const informe = computed(
  () =>
    [...(detalle.value?.informes ?? [])]
      .filter((item) => item.estado === 1)
      .sort((a, b) => b.es_tesis - a.es_tesis || b.version - a.version)[0],
)
const tribunal = computed(() => {
  const vigentes = jurados.value.filter(
    (item) =>
      Number(item.id_expediente) === seleccionado.value &&
      Number(item.estado) === 1 &&
      item.designacion?.estado === 'vigente',
  )
  const ultima = [...vigentes].sort(
    (a, b) => (b.designacion?.version ?? 0) - (a.designacion?.version ?? 0),
  )[0]?.id_designacion
  return vigentes.filter((item) => item.id_designacion === ultima)
})
function nombre(docente: Docente | null) {
  return docente
    ? [docente.nombres, docente.apellido_paterno, docente.apellido_materno]
        .filter(Boolean)
        .join(' ')
    : 'Nombre no disponible'
}
function juradoPorCargo(cargo: string) {
  return tribunal.value.find((item) => item.cargo.toLowerCase() === cargo.toLowerCase())
}
async function cargarAsignaciones() {
  const respuestas = await Promise.allSettled([
    informe.value?.id_asesor
      ? api.get<Docente>(`/docentes/${informe.value.id_asesor}`)
      : Promise.resolve(null),
    api.get<Jurado[]>('/jurados-expediente'),
  ])
  const [respuestaAsesor, respuestaJurados] = respuestas
  if (respuestaAsesor.status === 'fulfilled') asesor.value = respuestaAsesor.value?.data ?? null
  else errorAsesor.value = 'No se pudo consultar la información del asesor.'
  if (respuestaJurados.status === 'fulfilled')
    jurados.value = respuestaJurados.value.data.filter(
      (item) => Number(item.id_expediente) === seleccionado.value,
    )
  else errorJurados.value = 'No se pudo consultar la asignación de jurados.'
}
async function cargarDetalle() {
  if (seleccionado.value === null) return
  cargando.value = true
  error.value = ''
  errorAsesor.value = ''
  errorJurados.value = ''
  detalle.value = null
  asesor.value = null
  jurados.value = []
  try {
    const { data } = await api.get<ExpedienteDetalleResponse>(`/expedientes/${seleccionado.value}`)
    detalle.value = data.data
    if (!data.data) throw new Error('Sin detalle')
    await cargarAsignaciones()
  } catch {
    error.value = 'No se pudo consultar el expediente.'
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
  } catch {
    error.value = 'No se pudieron cargar los expedientes.'
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)
</script>

<template>
  <section class="advisors-view" aria-labelledby="advisors-title" :aria-busy="cargando">
    <header class="page-heading">
      <h1 id="advisors-title">Asesor y Jurados</h1>
      <p>Gestión y seguimiento de los docentes asignados a su proyecto de tesis.</p>
    </header>
    <label v-if="expedientes.length > 1" class="file-picker"
      >Expediente<select v-model="seleccionado" :disabled="cargando" @change="cargarDetalle">
        <option v-for="item in expedientes" :key="item.id_expediente" :value="item.id_expediente">
          {{ item.cod_expediente }}
        </option>
      </select></label
    >
    <p v-if="cargando" class="card empty" role="status">Cargando asesor y jurados…</p>
    <div v-else-if="error" class="card empty" role="alert">
      <p>{{ error }}</p>
      <button @click="cargar">Reintentar</button>
    </div>
    <div v-else-if="!detalle" class="card empty">
      <p>Aún no tienes expedientes registrados.</p>
      <RouterLink :to="{ name: 'expedientes-nuevo' }">Registrar expediente</RouterLink>
    </div>
    <div v-else class="advisors-grid">
      <section class="card advisor-card">
        <header class="section-heading">
          <h2>
            <span class="material-symbols-outlined" aria-hidden="true">school</span>Asesor Asignado
          </h2>
          <span class="badge">{{
            asesor
              ? Number(asesor.estado) === 1
                ? 'Activo'
                : 'Inactivo'
              : errorAsesor
                ? 'Sin información'
                : informe?.id_asesor
                  ? 'No disponible'
                  : 'Pendiente'
          }}</span>
        </header>
        <div class="advisor-body">
          <span class="advisor-avatar material-symbols-outlined" aria-label="Sin foto disponible"
            >person</span
          >
          <h3>
            {{
              asesor
                ? nombre(asesor)
                : errorAsesor
                  ? 'Información no disponible'
                  : informe?.id_asesor
                    ? 'Asesor no disponible'
                    : 'Asesor por asignar'
            }}
          </h3>
          <p class="school">{{ asesor?.escuela?.nombre ?? 'Escuela no disponible' }}</p>
          <div class="advisor-contact">
            <p>
              <span class="material-symbols-outlined" aria-hidden="true">mail</span
              >{{ asesor?.usuario?.correo_electronico ?? 'Correo no disponible' }}
            </p>
            <p>
              <span class="material-symbols-outlined" aria-hidden="true">calendar_today</span
              >Asignación: fecha no disponible
            </p>
          </div>
          <div v-if="errorAsesor" class="error" role="alert">
            <p>{{ errorAsesor }}</p>
            <button @click="cargarDetalle">Reintentar</button>
          </div>
        </div>
        <footer>
          <RouterLink
            :to="{
              name: 'expedientes-detalle',
              params: { id: detalle.id_expediente },
              hash: '#historial',
            }"
            ><span class="material-symbols-outlined" aria-hidden="true">history</span>Ver Historial
            del Expediente</RouterLink
          >
        </footer>
      </section>
      <section class="card jury-card">
        <header class="section-heading">
          <h2>
            <span class="material-symbols-outlined" aria-hidden="true">gavel</span>Tribunal
            Evaluador (Jurados)
          </h2>
        </header>
        <div
          class="assignment-notice"
          :class="{ assigned: tribunal.length === 3 && !errorJurados }"
        >
          <span class="material-symbols-outlined" aria-hidden="true">{{
            tribunal.length === 3 && !errorJurados ? 'check_circle' : 'info'
          }}</span>
          <div>
            <h3>
              {{
                errorJurados
                  ? 'Consulta no disponible'
                  : tribunal.length === 3
                    ? 'Jurados asignados'
                    : tribunal.length
                      ? 'Asignación incompleta'
                      : 'Asignación Pendiente'
              }}
            </h3>
            <p>
              {{
                errorJurados ||
                (tribunal.length === 3
                  ? 'Estos son los docentes de la designación vigente de su expediente.'
                  : tribunal.length
                    ? 'La designación vigente no contiene información de los tres cargos.'
                    : 'No se registra una designación vigente de jurados para su expediente.')
              }}
            </p>
            <button v-if="errorJurados" @click="cargarDetalle">Reintentar</button>
          </div>
        </div>
        <div class="jury-grid">
          <article
            v-for="cargo in cargos"
            :key="cargo"
            class="jury-member"
            :class="{ assigned: juradoPorCargo(cargo) }"
          >
            <span class="member-avatar material-symbols-outlined" aria-hidden="true">{{
              juradoPorCargo(cargo) ? 'person' : 'person_search'
            }}</span
            ><span class="cargo">{{ cargo }}</span>
            <h3>
              {{
                juradoPorCargo(cargo)
                  ? nombre(juradoPorCargo(cargo)?.docente ?? null)
                  : errorJurados
                    ? 'No disponible'
                    : 'Por asignar'
              }}
            </h3>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.advisors-view {
  max-width: 1280px;
  margin: 0 auto;
  font-size: 14px;
  line-height: 20px;
}
h1,
h2,
h3,
p {
  margin: 0;
}
.page-heading {
  margin-bottom: 32px;
}
h1 {
  font-size: 28px;
  line-height: 36px;
  letter-spacing: -0.5px;
}
.page-heading p {
  color: #45464f;
  margin-top: 4px;
}
.advisors-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2.08fr);
  gap: 24px;
  align-items: stretch;
}
.card {
  background: white;
  border: 1px solid #c5c6d1;
  border-radius: 8px;
  box-shadow: 0 1px 2px #0000000d;
  overflow: hidden;
}
.advisor-card,
.jury-card {
  display: flex;
  flex-direction: column;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  background: #f3f3f980;
  border-bottom: 1px solid #c5c6d180;
}
h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}
h2 .material-symbols-outlined {
  color: #283a70;
}
.badge {
  padding: 2px 8px;
  border: 1px solid #283a70;
  border-radius: 12px;
  background: #283a701a;
  color: #283a70;
  font-size: 11px;
  line-height: 14px;
  white-space: nowrap;
}
.advisor-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 16px;
}
.advisor-avatar {
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  margin-bottom: 16px;
  background: #e7e8ee;
  color: #283a70;
  border: 4px solid #f9f9ff;
  border-radius: 12px;
  font-size: 48px;
}
.advisor-body h3 {
  font-size: 16px;
  line-height: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}
.school {
  color: #45464f;
  font-size: 12px;
  line-height: 16px;
  margin-bottom: 16px;
}
.advisor-contact {
  width: 100%;
  padding: 16px;
  margin-top: auto;
  background: #ededf3;
  border-radius: 4px;
  text-align: left;
  color: #45464f;
}
.advisor-contact p {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-wrap: anywhere;
}
.advisor-contact p + p {
  margin-top: 8px;
}
.advisor-contact .material-symbols-outlined {
  color: #757681;
  font-size: 16px;
  flex-shrink: 0;
}
.advisor-card footer {
  padding: 16px;
  border-top: 1px solid #c5c6d180;
  background: #f9f9ff;
}
.advisor-card footer a {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
  font-size: 12px;
  line-height: 16px;
  color: #283a70;
  text-decoration: none;
}
.advisor-card footer a:hover {
  text-decoration: underline;
}
.advisor-card footer .material-symbols-outlined {
  font-size: 14px;
}
.assignment-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #ffdf9b4d;
  border-bottom: 1px solid #c5c6d180;
}
.assignment-notice > .material-symbols-outlined {
  color: #6b5000;
  margin-top: 2px;
}
.assignment-notice h3 {
  color: #5a4300;
  font-size: 12px;
  line-height: 16px;
  font-weight: 700;
  margin-bottom: 4px;
}
.assignment-notice p {
  color: #45464f;
}
.assignment-notice.assigned {
  background: #6ff5dc26;
}
.assignment-notice.assigned h3,
.assignment-notice.assigned > .material-symbols-outlined {
  color: #006b5c;
}
.jury-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  padding: 16px;
  flex: 1;
}
.jury-member {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 12px;
  text-align: center;
  border: 1px dashed #c5c6d1;
  border-radius: 8px;
  background: #f9f9ff;
  min-height: 250px;
}
.jury-member.assigned {
  border-style: solid;
}
.member-avatar {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: #e2e2e8;
  color: #757681;
  font-size: 32px;
}
.assigned .member-avatar {
  background: #dce1ff;
  color: #283a70;
}
.cargo {
  padding: 2px 8px;
  margin-bottom: 8px;
  background: #e2e2e8;
  color: #45464f;
  border-radius: 2px;
  font-size: 11px;
  line-height: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.jury-member h3 {
  font-family: var(--siset-font-body);
  font-size: 14px;
  line-height: 20px;
  font-weight: 400;
}
.empty {
  padding: 40px 24px;
  text-align: center;
}
.empty p {
  margin-bottom: 16px;
}
.file-picker {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
select,
button {
  padding: 8px 12px;
  border: 1px solid #c5c6d1;
  border-radius: 4px;
  background: #f9f9ff;
  color: #283a70;
}
.assignment-notice button {
  margin-top: 8px;
}
.error {
  margin-top: 16px;
  color: #ba1a1a;
  font-size: 12px;
}
.error button {
  margin-top: 8px;
}
@media (max-width: 1100px) {
  .advisors-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 600px) {
  .jury-grid {
    grid-template-columns: 1fr;
  }
  .jury-member {
    min-height: 180px;
  }
  h1 {
    font-size: 24px;
    line-height: 32px;
  }
}
</style>
