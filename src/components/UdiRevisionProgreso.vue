<script setup lang="ts">
import { computed } from 'vue'
import { progresoRevisionUdi } from '@/utils/udiExpedientes'

const props = defineProps<{ expediente: Parameters<typeof progresoRevisionUdi>[0] }>()
const avance = computed(() => progresoRevisionUdi(props.expediente))
</script>

<template>
  <div class="udi-progress" :class="{ complete: avance.revisado }">
    <div class="progress-caption">
      <strong>{{ avance.completados }}/3 · {{ avance.porcentaje }}%</strong>
      <span>{{ avance.etiqueta }}</span>
    </div>
    <div
      class="progress-track"
      role="progressbar"
      aria-label="Avance de la gestión UDI"
      :aria-valuenow="avance.completados"
      :aria-valuemin="0"
      :aria-valuemax="3"
      :aria-valuetext="`${avance.completados} de 3 hitos completados: ${avance.etiqueta}`"
    >
      <span :style="{ width: `${avance.porcentaje}%` }"></span>
    </div>
  </div>
</template>

<style scoped>
.udi-progress {
  min-width: 150px;
  color: #324583;
}
.progress-caption {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  margin-bottom: 6px;
  font-size: 12px;
}
.progress-caption > span {
  color: #62636d;
  font-size: 11px;
}
.progress-track {
  height: 5px;
  overflow: hidden;
  border-radius: 4px;
  background: #e2e2e8;
}
.progress-track > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #6074ae;
}
.complete {
  color: #006b5c;
}
.complete .progress-track > span {
  background: #469b93;
}
</style>
