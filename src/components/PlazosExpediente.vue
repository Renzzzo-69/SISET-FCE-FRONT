<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import axios from 'axios'
import api from '@/services/api'
import { consultarPlazos, fechaPlazo, textoPlazo, type PlazoTramite } from '@/services/plazos'

const props = defineProps<{ expediente: number }>()
const emit = defineEmits<{ registrado: [] }>()
const plazos = ref<PlazoTramite[]>([])
const cargando = ref(false)
const guardando = ref(false)
const error = ref('')
const mensaje = ref('')
const historial = ref(false)
const semaforo = ref('todos')
const elegido = ref<PlazoTramite | null>(null)
const constancia = ref('')
const resultado = ref('cumplido')
const archivo = ref<File | null>(null)
const visibles = computed(() =>
  plazos.value.filter(
    (p) =>
      (historial.value || !p.cierre) &&
      (semaforo.value === 'todos' || p.semaforo === semaforo.value),
  ),
)
async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    plazos.value = await consultarPlazos(props.expediente)
  } catch {
    error.value = 'No se pudieron consultar los plazos. Intenta nuevamente.'
  } finally {
    cargando.value = false
  }
}
function abrir(p: PlazoTramite) {
  elegido.value = p
  constancia.value = ''
  archivo.value = null
  resultado.value = p.responsable === 'jurado' && p.codigo !== 'PRO-08' ? 'aprobado' : 'cumplido'
  mensaje.value = ''
}
async function registrar() {
  if (!elegido.value) return
  guardando.value = true
  error.value = ''
  try {
    const datos = new FormData()
    datos.append('constancia', constancia.value)
    datos.append('resultado', resultado.value)
    if (archivo.value) datos.append('archivo', archivo.value)
    await api.post(
      `/expedientes/${props.expediente}/plazos/${elegido.value.id}/cumplimiento`,
      datos,
    )
    elegido.value = null
    await cargar()
    mensaje.value = 'Actuación registrada y siguiente plazo actualizado.'
    emit('registrado')
  } catch (e) {
    error.value = axios.isAxiosError(e)
      ? (e.response?.data?.message ?? 'No se pudo registrar.')
      : 'No se pudo registrar.'
  } finally {
    guardando.value = false
  }
}
watch(() => props.expediente, cargar, { immediate: true })
</script>

<template>
  <section class="plazos" aria-labelledby="plazos-titulo" :aria-busy="cargando">
    <header>
      <div>
        <h2 id="plazos-titulo">Plazos del trámite</h2>
        <p>Desde el día del registro · Hora de Lima · Amarillo al 20 % restante</p>
      </div>
      <label><input v-model="historial" type="checkbox" /> Mostrar ciclos cerrados</label>
      <label
        >Semáforo
        <select v-model="semaforo">
          <option value="todos">Todos</option>
          <option value="verde">Dentro del plazo</option>
          <option value="amarillo">Próximo a vencer</option>
          <option value="rojo">Vencido</option>
        </select></label
      >
    </header>
    <p v-if="error" role="alert">{{ error }} <button @click="cargar">Reintentar</button></p>
    <p v-if="mensaje" role="status">{{ mensaje }}</p>
    <p v-if="cargando">Consultando plazos…</p>
    <p v-else-if="!visibles.length">
      No hay plazos abiertos con un evento de inicio registrado para este expediente.
    </p>
    <ul v-else>
      <li v-for="p in visibles" :key="p.id" :class="p.semaforo">
        <div>
          <strong>{{ p.nombre }}</strong
          ><small
            >{{ p.codigo }} · {{ p.responsable
            }}{{
              p.docente ? ` · ${p.docente}` : p.id_docente ? ` · Docente #${p.id_docente}` : ''
            }}</small
          >
          <span>{{ textoPlazo(p) }}</span>
        </div>
        <div class="fechas">
          <span>Inicio: {{ fechaPlazo(p.inicio) }}</span
          ><span>Vence: {{ fechaPlazo(p.vencimiento) }} · 23:59</span>
          <span
            >{{ p.duracion }} días {{ p.tipo_dias === 'habiles' ? 'hábiles' : 'calendario' }}</span
          >
          <button v-if="p.puede_completar" @click="abrir(p)">Registrar actuación</button>
          <small v-if="p.cierre">{{ p.resultado }} · {{ p.constancia }}</small>
        </div>
      </li>
    </ul>
    <form v-if="elegido" class="actuacion" @submit.prevent="registrar">
      <h3>{{ elegido.nombre }}</h3>
      <p>
        Registra únicamente una actuación ya realizada. Su fecha de registro cerrará este plazo.
      </p>
      <label
        >Constancia de la actuación (documento, comunicación y destinatario)
        <textarea v-model="constancia" required minlength="10" maxlength="2000" rows="3"></textarea>
      </label>
      <label v-if="elegido.responsable === 'jurado' && elegido.codigo !== 'PRO-08'"
        >Resultado
        <select v-model="resultado">
          <option value="aprobado">Aprobado</option>
          <option value="observado">Observado</option>
        </select>
      </label>
      <label v-if="elegido.responsable === 'jurado' && elegido.codigo !== 'PRO-08'"
        >Informe de evaluación (PDF)
        <input
          type="file"
          accept="application/pdf"
          required
          @change="archivo = ($event.target as HTMLInputElement).files?.[0] ?? null"
        />
      </label>
      <div>
        <button type="button" :disabled="guardando" @click="elegido = null">Cancelar</button>
        <button type="submit" :disabled="guardando">
          {{ guardando ? 'Registrando…' : 'Registrar actuación' }}
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.plazos {
  margin: 20px 0;
  padding: 22px;
  background: white;
  border: 1px solid #c5c6d1;
  border-radius: 10px;
  color: #30343c;
}
header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
h2 {
  font-size: 18px;
  color: #283a70;
  margin: 0 0 6px;
}
p,
small {
  font-size: 12px;
}
p {
  margin: 4px 0;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}
li {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  border: 1px solid #ddd;
  border-left: 5px solid;
  border-radius: 7px;
  padding: 14px;
}
li > div {
  display: grid;
  gap: 6px;
}
.fechas {
  font-size: 12px;
}
.verde {
  border-left-color: #00866b;
}
.amarillo {
  border-left-color: #d29a17;
  background: #fffcf1;
}
.rojo {
  border-left-color: #ba1a1a;
  background: #fff4f3;
}
.cerrado {
  border-left-color: #858795;
}
small {
  color: #606575;
}
button {
  padding: 7px 12px;
  border: 1px solid #c5c6d1;
  border-radius: 5px;
  color: #283a70;
  background: #f5f6fc;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: wait;
}
.actuacion {
  margin-top: 18px;
  display: grid;
  gap: 12px;
  padding: 16px;
  background: #f5f6fc;
}
label {
  display: grid;
  gap: 6px;
  font-size: 12px;
}
header label {
  display: flex;
  align-items: center;
}
textarea,
select {
  border: 1px solid #c5c6d1;
  border-radius: 5px;
  padding: 8px;
  background: white;
}
.actuacion > div {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
</style>
