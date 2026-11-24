<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useActividadTesistaStore } from '@/stores/actividadTesista'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const actividad = useActividadTesistaStore()
const expedientes = computed(() => actividad.resumen?.expedientes ?? auth.expedientes)
const expediente = computed(
  () =>
    expedientes.value.find(
      (item) => item.id_expediente === Number(route.query.expediente ?? route.params.id),
    ) ?? expedientes.value[0],
)
const tesisDisponible = computed(() =>
  [
    'fase_tesis_informe_final',
    'revision_jurados_tesis_final',
    'aprobacion_informe_final',
    'cierre_archivo',
  ].includes(expediente.value?.etapa?.codigo ?? ''),
)
const etapa = computed(() =>
  route.query.etapa === 'proyecto'
    ? 'proyecto'
    : route.query.etapa === 'tesis' ||
        route.query.registrar === 'tesis-final' ||
        ['revision_jurados_tesis_final', 'aprobacion_informe_final', 'cierre_archivo'].includes(
          expediente.value?.etapa?.codigo ?? '',
        )
      ? 'tesis'
      : 'proyecto',
)
function consultar(evento: Event) {
  if (!expediente.value) return
  void router.push({
    name: 'observaciones',
    query: {
      expediente: expediente.value.id_expediente,
      etapa: (evento.target as HTMLSelectElement).value,
    },
  })
}
</script>

<template>
  <label v-if="expediente" class="phase-selector">
    <span>Consultar etapa</span>
    <select :value="etapa" @change="consultar">
      <option value="proyecto">Proyecto de tesis</option>
      <option value="tesis" :disabled="!tesisDisponible">Tesis final</option>
    </select>
  </label>
</template>

<style scoped>
.phase-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #283a70;
}
select {
  border: 1px solid #c5c6d1;
  border-radius: 6px;
  padding: 6px;
  background: white;
  max-width: 180px;
}
@media (max-width: 600px) {
  .phase-selector span {
    display: none;
  }
  select {
    max-width: 135px;
  }
}
</style>
