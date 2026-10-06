<script setup lang="ts">
import { onMounted, ref } from 'vue'

import api from '@/services/api'
import { useTheme } from '@/services/theme'

type Perfil = {
  correo_electronico: string
  celular: string | null
  tipo_perfil: string | null
  puede_editar_celular: boolean
}

const { oscuro, cambiarTema } = useTheme()
const cargando = ref(true)
const guardando = ref(false)
const correo = ref('')
const celular = ref('')
const puedeEditar = ref(false)
const mensaje = ref('')
const error = ref('')

async function cargarPerfil() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<Perfil>('/configuracion/perfil')
    correo.value = data.correo_electronico
    celular.value = data.celular ?? ''
    puedeEditar.value = data.puede_editar_celular
    if (!data.puede_editar_celular) {
      error.value =
        'La cuenta todavía no tiene un perfil personal asociado. Registre primero sus datos administrativos.'
    }
  } catch {
    error.value = 'No se pudo cargar la configuración del perfil.'
  } finally {
    cargando.value = false
  }
}

async function guardarCambios() {
  mensaje.value = ''
  error.value = ''
  guardando.value = true
  try {
    const { data } = await api.put<{ message: string; celular: string }>('/configuracion/perfil', {
      celular: celular.value,
    })
    celular.value = data.celular
    mensaje.value = data.message
  } catch (err: any) {
    error.value =
      err.response?.data?.message ??
      err.response?.data?.errors?.celular?.[0] ??
      'No se pudo actualizar el celular.'
  } finally {
    guardando.value = false
  }
}

onMounted(cargarPerfil)
</script>

<template>
  <div class="max-w-container-max-width mx-auto">
    <div class="mb-8">
      <h2 class="font-headline-lg text-headline-lg text-primary">Configuración del Perfil</h2>
      <p class="text-on-surface-variant">
        Administre su información personal y preferencias de la interfaz del sistema.
      </p>
    </div>

    <div
      v-if="mensaje"
      class="mb-4 rounded-xl border border-secondary/30 bg-secondary-container/30 px-4 py-3 text-secondary"
    >
      {{ mensaje }}
    </div>
    <div
      v-if="error"
      class="mb-4 rounded-xl border border-status-error/30 bg-error-container px-4 py-3 text-status-error"
    >
      {{ error }}
    </div>

    <section
      class="mb-8 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm"
    >
      <header
        class="flex items-center gap-2 border-b border-outline-variant/30 bg-surface-container-low px-card-padding py-4 text-primary"
      >
        <span class="material-symbols-outlined">contact_mail</span>
        <h3 class="font-headline-sm text-headline-sm">Información de Contacto</h3>
      </header>
      <form class="p-card-padding" @submit.prevent="guardarCambios">
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <label class="block text-sm text-on-surface-variant">
            Correo Electrónico
            <div class="relative mt-2">
              <input
                :value="correo"
                readonly
                aria-readonly="true"
                class="w-full cursor-not-allowed rounded-lg border border-outline-variant bg-surface-container px-4 py-3 pr-10 text-on-surface opacity-80"
              /><span
                class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline"
                >alternate_email</span
              >
            </div>
          </label>
          <label class="block text-sm text-on-surface-variant">
            Número de Celular
            <div class="relative mt-2">
              <input
                v-model="celular"
                :disabled="!puedeEditar || cargando"
                maxlength="15"
                inputmode="tel"
                class="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 pr-10 text-on-surface focus:border-primary focus:ring-primary/20"
                placeholder="Ingrese su celular"
              /><span
                class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline"
                >smartphone</span
              >
            </div>
          </label>
        </div>
        <div class="mt-8 flex justify-end">
          <button
            type="submit"
            :disabled="!puedeEditar || cargando || guardando"
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-7 py-3 font-bold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <span class="material-symbols-outlined text-lg">save</span
            >{{ guardando ? 'Guardando...' : 'Guardar Cambios' }}
          </button>
        </div>
      </form>
    </section>

    <section
      class="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm"
    >
      <header
        class="flex items-center gap-2 border-b border-outline-variant/30 bg-surface-container-low px-card-padding py-4 text-primary"
      >
        <span class="material-symbols-outlined">visibility</span>
        <h3 class="font-headline-sm text-headline-sm">Preferencias de Visualización</h3>
      </header>
      <div class="p-card-padding">
        <div
          class="flex flex-col gap-6 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-start gap-4 sm:items-center">
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-primary shadow-sm transition-all dark:ring-1 dark:ring-primary/20 dark:shadow-[0_0_24px_rgba(120,155,255,0.16)]"
            >
              <span class="material-symbols-outlined">{{
                oscuro ? 'nights_stay' : 'dark_mode'
              }}</span>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-bold text-on-surface">Modo Oscuro</p>
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  :class="
                    oscuro
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-surface-container-high text-on-surface-variant'
                  "
                  >{{ oscuro ? 'Activo' : 'Inactivo' }}</span
                >
              </div>
              <p class="max-w-lg text-sm text-on-surface-variant">
                Ajusta la apariencia del sistema para reducir la fatiga visual y ahorrar batería en
                dispositivos móviles.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="oscuro"
            class="relative h-8 w-14 shrink-0 rounded-full transition-all duration-300"
            :class="
              oscuro ? 'bg-secondary shadow-[0_0_22px_rgba(77,224,193,0.35)]' : 'bg-outline-variant'
            "
            @click="cambiarTema(!oscuro)"
          >
            <span
              class="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all duration-300"
              :class="oscuro ? 'left-7' : 'left-1'"
            ></span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
