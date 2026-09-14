<script setup lang="ts">
import { ref, computed } from 'vue'

type Teacher = {
  id: string
  initials: string
  name: string
  faculty: string
  status: 'Asesor' | 'Disponible' | 'Moderado' | 'Sobrecargado'
  disabled?: boolean
}

const teachers = ref<Teacher[]>([
  { id: 't1', initials: 'MV', name: 'Dr. Manuel Eduardo Villacorta Salas', faculty: 'Sistemas e Informática', status: 'Asesor', disabled: true },
  { id: 't2', initials: 'AL', name: 'Mg. Ana Luz López Flores', faculty: 'Sistemas e Informática', status: 'Disponible' },
  { id: 't3', initials: 'RC', name: 'Dr. Ricardo Cárdenas Peña', faculty: 'Ingeniería de Software', status: 'Moderado' },
  { id: 't4', initials: 'SP', name: 'Ing. Silvia Paredes Chung', faculty: 'Sistemas e Informática', status: 'Sobrecargado' },
])

const roles = ['Presidente', 'Secretario', 'Vocal']

const selected = ref<Record<string, { role: string }>>({})
const selectedRoles = ref<Record<string, string>>({})
const maxJurados = 3
const processing = ref(false)

const selectedCount = computed(() => Object.keys(selected.value).length)

function toggleSelect(t: Teacher, checked: boolean) {
  if (t.disabled) return
  if (checked) {
    if (selectedCount.value < maxJurados) {
      selected.value[t.id] = { role: '' }
      selectedRoles.value[t.id] = ''
    }
    else {
      // no-op; optionally show toast in future
    }
  } else {
    delete selected.value[t.id]
    delete selectedRoles.value[t.id]
  }
}

function setRole(id: string, role: string) {
  if (selected.value[id]) selected.value[id].role = role
}

function setRoleFromModel(id: string) {
  const role = selectedRoles.value[id] || ''
  setRole(id, role)
}

async function acceptAssignment() {
  if (selectedCount.value !== maxJurados) {
    alert(`Seleccione exactamente ${maxJurados} jurados con cargos distintos.`)
    return
  }
  processing.value = true
  await new Promise((r) => setTimeout(r, 1400))
  processing.value = false
  alert('Asignación realizada (mock).')
}
</script>

<template>
  <div class="max-w-container-max-width mx-auto p-gutter pb-32">
    <div class="flex items-center gap-4 mb-8">
      <button class="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-surface-container transition-all active:scale-95">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div>
        <h2 class="font-headline-md text-headline-md text-primary">Asignación Individual de Jurados</h2>
        <nav class="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
          <span>Decanatura</span>
          <span class="material-symbols-outlined !text-sm">chevron_right</span>
          <span>Asignación de Jurados</span>
          <span class="material-symbols-outlined !text-sm">chevron_right</span>
          <span class="text-primary font-bold">Asignación Individual</span>
        </nav>
      </div>
    </div>

    <!-- Project Context Card -->
    <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm mb-6 overflow-hidden">
      <div class="bg-surface-container-low px-card-padding py-3 border-b border-outline-variant/30">
        <h3 class="font-headline-sm text-headline-sm text-primary">Contexto del Proyecto de Tesis</h3>
      </div>
      <div class="p-card-padding grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="md:col-span-2">
          <label class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Título de la Tesis</label>
          <p class="font-headline-sm text-headline-sm text-on-surface mt-1">Implementación de un modelo de Inteligencia Artificial para la optimización de procesos académicos en la Universidad Nacional de la Amazonía Peruana, 2024</p>
        </div>
        <div class="space-y-4">
          <div>
            <label class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Estudiante / Investigador</label>
            <div class="flex items-center gap-3 mt-1">
              <span class="material-symbols-outlined text-secondary">person</span>
              <p class="font-body-md text-body-md font-bold text-on-surface">Pérez García, Juan Alberto (Cód. 202001542)</p>
            </div>
            <p class="font-label-md text-label-md text-on-surface-variant ml-8">Escuela Profesional de Ingeniería de Sistemas</p>
          </div>
        </div>
        <div class="space-y-4 border-l border-outline-variant/20 pl-6">
          <div>
            <label class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Asesor Actual</label>
            <div class="flex items-center gap-3 mt-1">
              <span class="material-symbols-outlined text-secondary">school</span>
              <p class="font-body-md text-body-md font-bold text-on-surface">Dr. Manuel Eduardo Villacorta Salas</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter Section -->
    <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm mb-6 p-card-padding">
      <h3 class="font-headline-sm text-headline-sm text-primary mb-4 flex items-center gap-2">
        <span class="material-symbols-outlined">filter_list</span>
        Criterios de Búsqueda de Jurados
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="md:col-span-2">
          <label class="font-label-md text-label-md text-on-surface-variant mb-1 block">Nombre del Docente</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input class="w-full pl-10 pr-4 py-2 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="Buscar por apellido o nombre..." type="text"/>
          </div>
        </div>
        <div>
          <label class="font-label-md text-label-md text-on-surface-variant mb-1 block">Escuela</label>
          <select class="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none">
            <option>Sistemas</option>
            <option>Agronomía</option>
            <option>Forestales</option>
          </select>
        </div>
        <div>
          <label class="font-label-md text-label-md text-on-surface-variant mb-1 block">Línea de Inv.</label>
          <select class="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none">
            <option>Gestión TI</option>
            <option>IA y Big Data</option>
            <option>Ciberseguridad</option>
          </select>
        </div>
      </div>
      <div class="mt-4">
        <label class="font-label-md text-label-md text-on-surface-variant mb-1 block">Grupo de Investigación</label>
        <select class="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none">
          <option>GITI - Grupo de Investigación en Tecnologías de la Información</option>
          <option>ARIA - Aplicaciones Robóticas e IA</option>
        </select>
      </div>
    </div>

    <!-- Teachers List -->
    <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
      <div class="bg-surface-container-low px-card-padding py-3 flex justify-between items-center border-b border-outline-variant/30">
        <h3 class="font-headline-sm text-headline-sm text-primary">Docentes Disponibles</h3>
        <span class="font-label-sm text-label-sm bg-primary/10 text-primary px-3 py-1 rounded-full">Total: {{ teachers.length }} Docentes</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-container-low/50 border-b border-outline-variant/30">
              <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase">Nombre y Facultad</th>
              <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase text-center">Estado / Carga</th>
              <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase">Definir Cargo</th>
              <th class="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase text-right">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/20">
            <tr v-for="t in teachers" :key="t.id" :class="[t.disabled ? 'bg-surface-container-high/20 opacity-60' : 'hover:bg-surface-container-low transition-colors group']">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div :class="['w-10 h-10 rounded-full flex items-center justify-center font-bold', t.disabled ? 'bg-outline-variant/50 text-outline' : 'bg-secondary-fixed text-on-secondary-fixed']">{{ t.initials }}</div>
                  <div>
                    <p class="font-body-md text-body-md font-bold text-on-surface">{{ t.name }}</p>
                    <p class="text-xs text-on-surface-variant">{{ t.faculty }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 text-center">
                <span v-if="t.status==='Asesor'" class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                  <span class="status-dot bg-error"></span> Asesor del Proyecto
                </span>
                <span v-else-if="t.status==='Disponible'" class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 font-label-sm text-label-sm">
                  <span class="status-dot bg-green-500 animate-pulse"></span> Disponible
                </span>
                <span v-else-if="t.status==='Moderado'" class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 font-label-sm text-label-sm">
                  <span class="status-dot bg-yellow-500"></span> Moderado
                </span>
                <span v-else class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-label-sm text-label-sm">
                  <span class="status-dot bg-red-500"></span> Sobrecargado
                </span>
              </td>
              <td class="px-6 py-4">
                <select :disabled="t.disabled || !selected[t.id]" class="w-full bg-white border border-outline-variant rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" v-model="selectedRoles[t.id]" @change="setRoleFromModel(t.id)">
                  <option value="">Seleccionar cargo...</option>
                  <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
                </select>
              </td>
                          <td class="px-6 py-4 text-right">
                            <input type="checkbox" :disabled="t.disabled" class="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer" :checked="!!selected[t.id]" @change="(e: Event) => toggleSelect(t, (e.target as HTMLInputElement).checked)" />
                          </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="p-card-padding border-t border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest">
        <p class="text-on-surface-variant text-sm italic">Recuerde que debe seleccionar exactamente {{ maxJurados }} jurados con cargos distintos.</p>
        <div class="flex gap-2">
          <button class="px-4 py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors active:scale-95">Anterior</button>
          <button class="px-4 py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors active:scale-95">Siguiente</button>
        </div>
      </div>
    </div>

    <!-- Floating summary bar -->
    <div class="fixed bottom-0 right-0 left-sidebar-width bg-surface border-t border-outline-variant/30 p-4 flex justify-between items-center shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-30">
      <div class="flex gap-4 items-center">
        <div class="flex -space-x-2">
          <div v-for="(id, idx) in Object.keys(selected).slice(0,3)" :key="id" class="w-8 h-8 rounded-full bg-secondary-container border-2 border-white flex items-center justify-center text-[10px] font-bold text-on-secondary-container">{{ teachers.find(t => t.id === id)?.initials }}</div>
          <div v-if="Object.keys(selected).length < 3" class="w-8 h-8 rounded-full bg-surface-container-highest border-2 border-white flex items-center justify-center text-[10px] text-outline">?</div>
        </div>
        <p class="text-sm font-medium text-on-surface-variant"><span class="text-primary font-bold">{{ selectedCount }}</span> de {{ maxJurados }} Jurados Seleccionados</p>
      </div>
      <div class="flex gap-4">
        <button class="px-8 py-3 rounded-full font-label-md text-label-md text-on-surface-variant hover:bg-surface-container transition-colors">Cancelar</button>
        <button @click="acceptAssignment" :disabled="processing" class="px-10 py-3 rounded-full bg-primary-container text-white font-label-md text-label-md shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60">
          <span v-if="!processing" class="material-symbols-outlined !text-lg">check_circle</span>
          <span v-else class="material-symbols-outlined animate-spin">progress_activity</span>
          <span v-if="!processing">Aceptar Asignación</span>
          <span v-else>Procesando...</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.p-card-padding { padding: 1.5rem; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
</style>
