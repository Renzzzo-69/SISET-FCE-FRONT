<template>
  <div class="flex-1 lg:ml-[260px] min-h-screen flex flex-col">
    <header class="flex justify-between items-center h-[70px] px-gutter w-full sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant shadow-sm">
      <div class="flex items-center gap-4">
        <button class="lg:hidden p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 class="font-headline-sm text-headline-sm text-primary">Detalle de {{ label }}</h2>
      </div>
    </header>

    <main class="p-gutter lg:p-10 max-w-7xl mx-auto w-full">
      <div class="flex items-center gap-4 mb-6">
        <button class="p-2 hover:bg-surface-container rounded-full transition-colors">
          <span class="material-symbols-outlined text-primary">arrow_back</span>
        </button>
        <div>
          <h3 class="font-headline-lg text-primary leading-tight">{{ title }}</h3>
        </div>
      </div>

      <section class="space-y-6 pb-12">
          <article class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm">
            <div class="relative flex justify-between items-start max-w-4xl mx-auto">
              <div class="absolute top-5 left-0 w-full h-1 bg-surface-container-high -z-0"></div>
              <div class="absolute top-5 left-0 w-[66%] h-1 bg-secondary -z-0" :style="{ width: progressWidth }"></div>

              <div class="relative z-10 flex flex-col items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-md">
                  <span class="material-symbols-outlined">check</span>
                </div>
                <div class="text-center">
                  <p class="text-label-md font-bold text-secondary">Solicitud</p>
                  <p class="text-[10px] text-on-surface-variant uppercase font-medium">Completado</p>
                </div>
              </div>

              <div class="relative z-10 flex flex-col items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-md">
                  <span class="material-symbols-outlined">check</span>
                </div>
                <div class="text-center">
                  <p class="text-label-md font-bold text-secondary">Revisión UDI</p>
                  <p class="text-[10px] text-on-surface-variant uppercase font-medium">Completado</p>
                </div>
              </div>

              <div class="relative z-10 flex flex-col items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-white border-4 border-secondary text-secondary flex items-center justify-center shadow-md ring-4 ring-secondary/20 animate-pulse">
                  <span class="material-symbols-outlined">gavel</span>
                </div>
                <div class="text-center">
                  <p class="text-label-md font-bold text-secondary">Jurados</p>
                  <p class="text-[10px] text-primary uppercase font-bold">En Progreso</p>
                </div>
              </div>

              <div class="relative z-10 flex flex-col items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center">
                  <span class="material-symbols-outlined">fact_check</span>
                </div>
                <div class="text-center">
                  <p class="text-label-md font-bold text-on-surface-variant">Aprobación</p>
                  <p class="text-[10px] text-on-surface-variant uppercase font-medium">Pendiente</p>
                </div>
              </div>
            </div>
          </article>

          <div class="space-y-6">
            <article class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
              <div class="flex items-center gap-2 mb-6 text-primary">
                <span class="material-symbols-outlined">gavel</span>
                <h4 class="font-headline-sm">Evaluación de Jurados</h4>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div v-for="(j, idx) in jurados" :key="idx" :class="j.variant">
                  <p class="text-label-sm font-bold text-on-surface-variant mb-1 uppercase">{{ j.role }}</p>
                  <div class="mb-2">
                    <p class="text-body-md font-bold" :class="j.textClass">{{ j.name }}</p>
                  </div>
                  <div class="flex items-center gap-2" :class="j.statusClass">
                    <span class="material-symbols-outlined text-[18px]">{{ j.icon }}</span>
                    <span class="font-bold">{{ j.statusLabel }}</span>
                  </div>
                  <div class="mt-2 pt-2 border-t" :class="j.borderClass">
                    <p class="text-label-sm">Correo: {{ j.email }}</p>
                    <p class="text-label-sm">Cel: {{ j.phone }}</p>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div class="flex flex-wrap justify-end items-center gap-4 py-8 border-t border-outline-variant">
            <a :href="informeUrl" class="h-11 px-5 border border-primary/40 text-primary rounded-lg font-medium text-body-md flex items-center justify-center gap-2 hover:bg-primary/5 transition-all">
              <span class="material-symbols-outlined text-[20px]">visibility</span>
              <span>Ver Informe</span>
            </a>

            <button v-if="!aprobada" class="h-11 px-5 border-2 border-secondary text-secondary rounded-lg font-bold text-body-md flex items-center justify-center gap-2 hover:bg-secondary/5 transition-all">
              <span class="material-symbols-outlined text-[20px]">check_circle</span>
              <span>Aprobar Informe</span>
            </button>

            <button v-if="!aprobada" class="h-11 px-5 border border-tertiary/40 text-tertiary rounded-lg font-medium text-body-md flex items-center justify-center gap-2 hover:bg-tertiary/5 transition-all">
              <span class="material-symbols-outlined text-[20px]">edit_note</span>
              <span>Realizar Observación</span>
            </button>
          </div>
      </section>
    </main>

    <footer class="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-outline-variant text-on-surface-variant gap-4">
      <div class="flex items-center gap-6">
        <p class="text-label-sm">© 2024 Facultad de Ciencias Económicas</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ kind?: 'tesis' | 'proyecto'; status?: 'revision' | 'aprobada' }>()

const label = computed(() => (props.kind === 'proyecto' ? 'Proyecto' : 'Tesis'))
const title = computed(() => (props.kind === 'proyecto' ? 'TÍTULO DEL PROYECTO' : 'TÍTULO DE LA TESIS'))
const aprobada = computed(() => props.status === 'aprobada')

const informeUrl = computed(() => '#')

// sample jurados data for UI-only
const jurados = [
  { role: 'Presidente', name: 'Dr. Juan Carlos Vega', statusLabel: 'Pendiente', icon: 'schedule', email: 'presidente@example.com', phone: '900 333 444', variant: 'bg-surface-container-high border border-outline-variant p-4 rounded-xl', textClass: 'text-on-surface-variant', statusClass: 'text-on-surface-variant', borderClass: 'border-outline-variant' },
  { role: 'Secretario', name: 'Ing. Mg. Segundo Roger Ramírez', statusLabel: 'Observaciones', icon: 'info', email: 'segundoroger@gmail.com', phone: '944 929 63', variant: 'bg-tertiary-container/10 border border-tertiary-container/20 p-4 rounded-xl', textClass: 'text-tertiary-container', statusClass: 'text-tertiary-container', borderClass: 'border-tertiary-container/20' },
  { role: 'Vocal', name: 'Lic. Marco Antonio Ruiz', statusLabel: 'Aprobado', icon: 'check_circle', email: 'vocal1@example.com', phone: '900 111 222', variant: 'bg-secondary/10 border border-secondary/20 p-4 rounded-xl', textClass: 'text-secondary', statusClass: 'text-secondary', borderClass: 'border-secondary/20' }
]

// progress width example based on status
const progressWidth = computed(() => (props.status === 'aprobada' ? '100%' : props.status === 'revision' ? '66%' : '0%'))
</script>

<style scoped>
.p-gutter { padding: 1.25rem; }
</style>
