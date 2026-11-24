<script setup lang="ts">
import { ref, watch } from 'vue'
import api from '@/services/api'
import DocumentoAcciones from '@/components/DocumentoAcciones.vue'
import type { CambioIntegrante } from '@/services/cambiosIntegrantes'

const props = defineProps<{ expediente: number }>()
const cambios = ref<CambioIntegrante[]>([])
const error = ref('')
watch(
  () => props.expediente,
  async (id, _, limpiar) => {
    let vigente = true
    limpiar(() => {
      vigente = false
    })
    cambios.value = []
    error.value = ''
    try {
      const { data } = await api.get<{ data: CambioIntegrante[] }>('/cambios-integrantes', {
        params: { id_expediente: id },
      })
      if (vigente) cambios.value = data.data.filter((c) => c.fecha_ejecucion)
    } catch {
      if (vigente) error.value = 'No se pudo cargar el historial de cambios.'
    }
  },
  { immediate: true },
)
</script>

<template>
  <section aria-label="Historial de cambios" class="space-y-4">
    <h2 class="text-xl font-bold text-primary">Historial de cambios de asesor y jurados</h2>
    <p v-if="error" role="alert" class="text-error">{{ error }}</p>
    <p v-else-if="!cambios.length" class="text-on-surface-variant">No hay reemplazos ejecutados.</p>
    <article
      v-for="c in cambios"
      :key="c.id"
      class="rounded-xl border border-outline-variant p-4 space-y-2"
    >
      <h3 class="font-bold">Cambio de {{ c.tipo }} · {{ c.cargo ?? 'Asesor' }}</h3>
      <p>{{ c.saliente }} → {{ c.entrante }}</p>
      <p class="text-sm">
        {{ c.origen === 'oficio' ? 'De oficio' : 'Externo' }} · Ejecutado: {{ c.fecha_ejecucion }}
      </p>
      <DocumentoAcciones :archivo="c.archivo" :nombre="`Resolución ${c.numero_resolucion}`" />
    </article>
  </section>
</template>
