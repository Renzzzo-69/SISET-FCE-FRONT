<script setup lang="ts">
import { onMounted, ref } from 'vue'

import api, { descargarDocumentoPrivado } from '@/services/api'

interface ExpedienteListo {
  id: number
  codigo: string
  titulo: string
  tesista: string
  fecha_conformidad: string | null
  documentos: {
    conformidad_tecnica: string
    informe_turnitin: string
    propuesta_jurados: string
  }
}

const expedientes = ref<ExpedienteListo[]>([])
const cargando = ref(true)
const error = ref('')
const operacion = ref<number | null>(null)

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<{ expedientes: ExpedienteListo[] }>(
      '/udi/expedientes-listos-derivar',
    )
    expedientes.value = data.expedientes
  } catch {
    error.value = 'No se pudieron cargar los expedientes listos para derivar.'
  } finally {
    cargando.value = false
  }
}

async function descargar(ruta: string, nombre: string) {
  await descargarDocumentoPrivado(ruta, nombre)
}

async function derivar(expediente: ExpedienteListo) {
  if (!window.confirm(`¿Derivar ${expediente.codigo} a Decanatura con sus tres documentos?`)) return
  operacion.value = expediente.id
  error.value = ''
  try {
    await api.post(`/expedientes/${expediente.id}/revision-documentaria/derivacion-decanatura`)
    expedientes.value = expedientes.value.filter((item) => item.id !== expediente.id)
  } catch {
    error.value = 'No se pudo derivar el expediente. Verifique que los tres documentos sigan disponibles.'
  } finally {
    operacion.value = null
  }
}

function fecha(fechaConformidad: string | null) {
  return fechaConformidad
    ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(fechaConformidad))
    : 'Sin fecha'
}

onMounted(cargar)
</script>

<template>
  <section class="ready-page">
    <header>
      <div>
        <p class="eyebrow">Unidad de Investigación</p>
        <h1>Expedientes listos para derivar</h1>
        <p>Solo aparecen expedientes que ya cuentan con los tres documentos requeridos.</p>
      </div>
      <span class="ready-count">{{ expedientes.length }} listos</span>
    </header>

    <p v-if="error" class="ready-error" role="alert">{{ error }}</p>
    <div v-if="cargando" class="ready-empty">Cargando expedientes...</div>
    <div v-else-if="!expedientes.length" class="ready-empty">
      No hay expedientes con el paquete documental completo.
    </div>
    <div v-else class="ready-list">
      <article v-for="expediente in expedientes" :key="expediente.id" class="ready-card">
        <div class="ready-main">
          <span>{{ expediente.codigo }}</span>
          <div>
            <h2>{{ expediente.titulo }}</h2>
            <p>{{ expediente.tesista }} · Conformidad: {{ fecha(expediente.fecha_conformidad) }}</p>
          </div>
        </div>
        <div class="ready-documents">
          <button
            v-for="documento in [
              { nombre: 'Conformidad técnica', ruta: expediente.documentos.conformidad_tecnica, archivo: 'conformidad-tecnica' },
              { nombre: 'Propuesta de jurados', ruta: expediente.documentos.propuesta_jurados, archivo: 'propuesta-jurados' },
              { nombre: 'Informe de Turnitin', ruta: expediente.documentos.informe_turnitin, archivo: 'informe-turnitin' },
            ]"
            :key="documento.archivo"
            type="button"
            @click="descargar(documento.ruta, `${expediente.codigo}-${documento.archivo}`)"
          >
            <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
            {{ documento.nombre }}
            <span class="material-symbols-outlined" aria-hidden="true">download</span>
          </button>
        </div>
        <button
          type="button"
          class="derive-button"
          :disabled="operacion === expediente.id"
          @click="derivar(expediente)"
        >
          <span class="material-symbols-outlined" aria-hidden="true">forward_to_inbox</span>
          {{ operacion === expediente.id ? 'Derivando...' : 'Derivar a Decanatura' }}
        </button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.ready-page { display: grid; gap: 24px; max-width: 1200px; margin: 0 auto; }
.ready-page > header { display: flex; align-items: end; justify-content: space-between; gap: 20px; }
.ready-page h1 { margin: 4px 0; color: #283a70; }
.ready-page header p { margin: 0; color: #62636d; }
.eyebrow { color: #283a70 !important; font-size: 11px; font-weight: 800; text-transform: uppercase; }
.ready-count { padding: 8px 14px; color: #006b5c; background: #6ff5dc; border-radius: 999px; font-weight: 800; }
.ready-list { display: grid; gap: 14px; }
.ready-card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, .8fr) auto; align-items: center; gap: 20px; padding: 20px; background: white; border: 1px solid #d4d4df; border-radius: 14px; box-shadow: 0 2px 5px #0000000d; }
.ready-main { display: flex; align-items: flex-start; gap: 14px; }
.ready-main > span { padding: 6px 9px; color: #283a70; background: #dce1ff; border-radius: 6px; font-size: 12px; font-weight: 800; }
.ready-main h2 { margin: 0 0 6px; color: #191c20; font-size: 16px; }
.ready-main p { margin: 0; color: #62636d; font-size: 12px; }
.ready-documents { display: grid; gap: 6px; }
.ready-documents button { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; padding: 8px 10px; color: #005b50; background: #eefbf7; border: 0; border-radius: 8px; text-align: left; cursor: pointer; }
.ready-documents .material-symbols-outlined { font-size: 17px; }
.derive-button { display: inline-flex; align-items: center; gap: 8px; padding: 12px 16px; color: white; background: #006b5c; border: 0; border-radius: 8px; font-weight: 800; cursor: pointer; }
.derive-button:disabled { opacity: .55; }
.ready-empty, .ready-error { padding: 30px; background: white; border: 1px solid #d4d4df; border-radius: 14px; text-align: center; }
.ready-error { color: #ba1a1a; background: #ffdad6; }
@media (max-width: 900px) { .ready-card { grid-template-columns: 1fr; } .derive-button { justify-content: center; } }
</style>
