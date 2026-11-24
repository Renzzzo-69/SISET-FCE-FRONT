<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import api, { descargarDocumentoPrivado } from '@/services/api'

type Formato = {
  id: number
  codigo: string
  version: string
  fecha_vigencia: string | null
  archivo: string
  estado: 'activo' | 'depreciado'
}
type Plantilla = {
  codigo: string
  nombre: string
  descripcion: string
  categoria: string
  destinatarios: string[]
  destino: string
  icono: string
}

const plantillas: Plantilla[] = [
  {
    codigo: 'certificado_originalidad',
    nombre: 'Certificado de originalidad',
    descripcion: 'Documento oficial que acredita la originalidad del trabajo presentado.',
    categoria: 'proyectos',
    destinatarios: ['tesista'],
    destino: 'Formatos oficiales del Tesista',
    icono: 'verified',
  },
  {
    codigo: 'informe_conformidad_proyecto',
    nombre: 'Informe de conformidad',
    descripcion: 'Formato de conformidad del proyecto de investigación.',
    categoria: 'proyectos',
    destinatarios: ['tesista'],
    destino: 'Formatos oficiales del Tesista',
    icono: 'fact_check',
  },
  {
    codigo: 'propuesta_jurado',
    nombre: 'Propuesta de jurado',
    descripcion: 'Formato institucional para presentar la propuesta de integrantes del jurado.',
    categoria: 'jurados',
    destinatarios: ['tesista'],
    destino: 'Formatos oficiales del Tesista',
    icono: 'groups',
  },
  {
    codigo: 'plantilla_observaciones_jurado',
    nombre: 'Plantilla de observaciones del jurado',
    descripcion: 'Documento oficial para registrar las observaciones de la evaluación del proyecto o tesis.',
    categoria: 'jurados',
    destinatarios: ['jurado'],
    destino: 'Modal Realizar observaciones · Jurado',
    icono: 'rate_review',
  },
  {
    codigo: 'carta_aceptacion_asesor',
    nombre: 'Carta de aceptación para ser asesor',
    descripcion: 'Formato mediante el cual el docente acepta formalmente asumir la asesoría.',
    categoria: 'inscripcion',
    destinatarios: ['tesista'],
    destino: 'Formatos oficiales del Tesista',
    icono: 'person_check',
  },
  {
    codigo: 'carta_aceptacion_coasesor',
    nombre: 'Carta de aceptación para ser coasesor',
    descripcion: 'Formato mediante el cual el docente acepta formalmente asumir la coasesoría.',
    categoria: 'inscripcion',
    destinatarios: ['tesista'],
    destino: 'Formatos oficiales del Tesista',
    icono: 'group_add',
  },
  {
    codigo: 'solicitud_asignacion_jurado',
    nombre: 'Solicitud de asignación de jurado',
    descripcion: 'Solicitud oficial para iniciar el procedimiento de asignación del jurado.',
    categoria: 'jurados',
    destinatarios: ['tesista'],
    destino: 'Formatos oficiales del Tesista',
    icono: 'assignment_ind',
  },
  {
    codigo: 'declaracion_jurada_autenticidad',
    nombre: 'Declaración jurada de autenticidad',
    descripcion: 'Declaración mediante la cual el tesista garantiza la autenticidad de su trabajo.',
    categoria: 'inscripcion',
    destinatarios: ['tesista'],
    destino: 'Formatos oficiales del Tesista',
    icono: 'gavel',
  },
]

const formatos = ref<Formato[]>([]),
  cargando = ref(true),
  error = ref(''),
  publicando = ref(false),
  seleccionada = ref<Plantilla | null>(null)
const formulario = reactive({ version: '1.0', fecha_vigencia: '', archivo: null as File | null })
const formatosPorCodigo = computed(() => new Map(formatos.value.map((f) => [f.codigo, f])))
const formatoDe = (p: Plantilla) => formatosPorCodigo.value.get(p.codigo)

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get('/decanatura/formatos')
    formatos.value = data.formatos
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'No se pudieron cargar los formatos oficiales.'
  } finally {
    cargando.value = false
  }
}
function abrirCarga(p: Plantilla) {
  const f = formatoDe(p)
  seleccionada.value = p
  formulario.version = f?.version ?? '1.0'
  formulario.fecha_vigencia = f?.fecha_vigencia ?? new Date().toISOString().slice(0, 10)
  formulario.archivo = null
  error.value = ''
}
function seleccionarArchivo(e: Event) {
  formulario.archivo = (e.target as HTMLInputElement).files?.[0] ?? null
}
async function publicar() {
  const p = seleccionada.value
  if (!p || !formulario.archivo) {
    error.value = 'Seleccione el documento que desea publicar.'
    return
  }
  publicando.value = true
  error.value = ''
  try {
    const d = new FormData()
    d.append('nombre', p.nombre)
    d.append('codigo', p.codigo)
    d.append('categoria', p.categoria)
    p.destinatarios.forEach((x) => d.append('destinatarios[]', x))
    d.append('descripcion', p.descripcion)
    d.append('version', formulario.version)
    if (formulario.fecha_vigencia) d.append('fecha_vigencia', formulario.fecha_vigencia)
    d.append('archivo', formulario.archivo)
    const f = formatoDe(p)
    await api.post(f ? `/decanatura/formatos/${f.id}` : '/decanatura/formatos', d)
    seleccionada.value = null
    await cargar()
  } catch (e: any) {
    const v = e.response?.data?.errors
    error.value =
      e.response?.data?.message ??
      (v ? Object.values(v).flat().join(' ') : 'No se pudo publicar el formato.')
  } finally {
    publicando.value = false
  }
}
async function desactivar(p: Plantilla) {
  const f = formatoDe(p)
  if (!f || !confirm(`¿Desactivar “${p.nombre}”?`)) return
  await api.delete(`/decanatura/formatos/${f.id}`)
  await cargar()
}
function fecha(v: string | null | undefined) {
  return v ? new Date(`${v}T00:00:00`).toLocaleDateString('es-PE') : 'Sin publicar'
}
onMounted(cargar)
</script>

<template>
  <main class="mx-auto w-full space-y-7">
    <header>
      <h1 class="text-3xl font-bold text-primary">Formatos Oficiales</h1>
      <p class="mt-1 max-w-3xl text-on-surface-variant">
        Publique cada documento en su espacio predeterminado. El sistema lo enviará al módulo
        correspondiente.
      </p>
    </header>
    <div v-if="error" class="rounded-xl bg-error-container p-4 text-error">{{ error }}</div>
    <div v-if="cargando" class="py-20 text-center text-on-surface-variant">
      Cargando formatos...
    </div>
    <section v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="p in plantillas"
        :key="p.codigo"
        class="flex flex-col rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-sm"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="material-symbols-outlined text-2xl text-primary">{{ p.icono }}</span
          ><span
            class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            :class="
              formatoDe(p)?.estado === 'activo'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-surface-container-high text-on-surface-variant'
            "
            >{{ formatoDe(p)?.estado === 'activo' ? 'Publicado' : 'Pendiente' }}</span
          >
        </div>
        <h2 class="mt-3 text-base font-bold text-primary">{{ p.nombre }}</h2>
        <p class="mt-1 line-clamp-2 text-xs leading-5 text-on-surface-variant">
          {{ p.descripcion }}
        </p>
        <div class="mt-3 border-t border-outline-variant/30 pt-3">
          <p class="text-[11px] font-semibold text-on-surface-variant">Destino predeterminado</p>
          <p class="mt-1 flex items-start gap-1.5 text-xs font-semibold">
            <span class="material-symbols-outlined text-lg text-primary">outbox</span
            >{{ p.destino }}
          </p>
        </div>
        <dl class="mt-2 flex gap-5 text-xs">
          <div>
            <dt class="text-on-surface-variant">Versión</dt>
            <dd class="font-bold">{{ formatoDe(p) ? `v${formatoDe(p)?.version}` : '—' }}</dd>
          </div>
          <div>
            <dt class="text-on-surface-variant">Vigencia</dt>
            <dd class="font-bold">{{ fecha(formatoDe(p)?.fecha_vigencia) }}</dd>
          </div>
        </dl>
        <div class="mt-auto flex flex-wrap gap-1.5 pt-4">
          <template v-if="formatoDe(p)?.estado === 'activo'"
            ><button
              class="rounded-md border border-outline-variant px-2.5 py-1.5 text-xs font-semibold text-primary"
              @click="descargarDocumentoPrivado(formatoDe(p)!.archivo, p.codigo)"
            >
              Descargar
            </button></template
          >
          <button
            class="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white"
            @click="abrirCarga(p)"
          >
            {{ formatoDe(p) ? 'Reemplazar' : 'Subir documento' }}</button
          ><button
            v-if="formatoDe(p)?.estado === 'activo'"
            class="px-2 py-1.5 text-xs font-semibold text-error"
            @click="desactivar(p)"
          >
            Desactivar
          </button>
        </div>
      </article>
    </section>
    <Teleport to="body"
      ><div
        v-if="seleccionada"
        class="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4"
        @click.self="seleccionada = null"
      >
        <form
          class="w-full max-w-xl space-y-5 rounded-2xl bg-surface p-6 shadow-2xl"
          @submit.prevent="publicar"
        >
          <div>
            <p class="text-sm font-bold uppercase tracking-wide text-primary">
              Publicar formato oficial
            </p>
            <h2 class="mt-1 text-2xl font-bold">{{ seleccionada.nombre }}</h2>
            <p class="mt-1 text-sm text-on-surface-variant">Destino: {{ seleccionada.destino }}</p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="text-sm font-bold"
              >Versión<input
                v-model.trim="formulario.version"
                required
                maxlength="20"
                class="mt-2 w-full rounded-lg border border-outline-variant bg-surface-container p-3" /></label
            ><label class="text-sm font-bold"
              >Vigente desde<input
                v-model="formulario.fecha_vigencia"
                type="date"
                class="mt-2 w-full rounded-lg border border-outline-variant bg-surface-container p-3"
            /></label>
          </div>
          <label
            class="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-outline-variant p-7 text-center"
            ><input
              class="sr-only"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              @change="seleccionarArchivo"
            /><span class="material-symbols-outlined text-4xl text-primary">cloud_upload</span
            ><span class="font-bold">{{ formulario.archivo?.name ?? 'Seleccionar documento' }}</span
            ><span class="text-xs text-on-surface-variant"
              >PDF, Word o Excel · máximo 30 MB</span
            ></label
          >
          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 font-bold text-primary"
              @click="seleccionada = null"
            >
              Cancelar</button
            ><button
              :disabled="publicando"
              class="rounded-lg bg-primary px-5 py-2.5 font-bold text-white disabled:opacity-50"
            >
              {{ publicando ? 'Publicando...' : 'Publicar documento' }}
            </button>
          </div>
        </form>
      </div></Teleport
    >
  </main>
</template>

<style scoped>
.slot-emerald {
  background: #16a085;
}
.slot-blue {
  background: #3659a2;
}
.slot-amber {
  background: #d89126;
}
.slot-rose {
  background: #b84d65;
}
</style>
