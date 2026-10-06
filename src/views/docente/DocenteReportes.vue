<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '@/services/api'

type Fila = {
  id_expediente: number
  codigo: string
  titulo: string
  tesista: string
  escuela: string | null
  tipo: 'proyecto' | 'tesis'
  responsabilidad: 'asesor' | 'jurado'
  cargo: string
  version: number
  estado_codigo: string
  estado: string
  categoria: 'revision' | 'aprobado' | 'otro'
  etapa: string
  fecha: string
  dias_transcurridos: number
  ronda: number | null
  veredicto: string | null
}
type Respuesta = { docente: { nombre: string; correo: string; celular: string }; filas: Fila[] }
const cargando = ref(true),
  error = ref(''),
  filas = ref<Fila[]>([]),
  docente = ref({ nombre: '', correo: '', celular: '' })
const buscar = ref(''),
  tipo = ref('todos'),
  responsabilidad = ref('todos'),
  categoria = ref('todos'),
  anio = ref('todos')
const anios = computed(() =>
  [...new Set(filas.value.map((f) => new Date(f.fecha).getFullYear()))].sort((a, b) => b - a),
)
const filtradas = computed(() => {
  const q = buscar.value.trim().toLocaleLowerCase('es')
  return filas.value.filter(
    (f) =>
      (tipo.value === 'todos' || f.tipo === tipo.value) &&
      (responsabilidad.value === 'todos' || f.responsabilidad === responsabilidad.value) &&
      (categoria.value === 'todos' || f.categoria === categoria.value) &&
      (anio.value === 'todos' || new Date(f.fecha).getFullYear() === Number(anio.value)) &&
      (!q ||
        `${f.codigo} ${f.titulo} ${f.tesista} ${f.escuela ?? ''} ${f.estado} ${f.cargo}`
          .toLocaleLowerCase('es')
          .includes(q)),
  )
})
const resumen = computed(() => {
  const data = filtradas.value
  const aprobados = data.filter((f) => f.categoria === 'aprobado').length
  const dias = data.length
    ? Math.round(data.reduce((s, f) => s + f.dias_transcurridos, 0) / data.length)
    : 0
  return {
    participaciones: data.length,
    expedientes: new Set(data.map((f) => f.id_expediente)).size,
    revision: data.filter((f) => f.categoria === 'revision').length,
    observados: data.filter((f) => ['observado', 'pendiente_subsanacion'].includes(f.estado_codigo))
      .length,
    aprobados,
    promedio: dias,
    tasa: data.length ? Math.round((aprobados / data.length) * 100) : 0,
  }
})
const porTipo = computed(() => [
  {
    label: 'Proyectos',
    valor: filtradas.value.filter((f) => f.tipo === 'proyecto').length,
    color: '#40558f',
  },
  {
    label: 'Tesis',
    valor: filtradas.value.filter((f) => f.tipo === 'tesis').length,
    color: '#008577',
  },
])
const porRol = computed(() => [
  {
    label: 'Asesoría',
    valor: filtradas.value.filter((f) => f.responsabilidad === 'asesor').length,
    color: '#40558f',
  },
  {
    label: 'Jurado',
    valor: filtradas.value.filter((f) => f.responsabilidad === 'jurado').length,
    color: '#00a58e',
  },
])
const estados = computed(() => {
  const grupos = new Map<string, number>()
  filtradas.value.forEach((f) => grupos.set(f.estado, (grupos.get(f.estado) ?? 0) + 1))
  return [...grupos]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, valor]) => ({ label, valor }))
})
const escuelas = computed(() => {
  const grupos = new Map<string, number>()
  filtradas.value.forEach((f) => {
    const k = f.escuela ?? 'Sin escuela'
    grupos.set(k, (grupos.get(k) ?? 0) + 1)
  })
  return [...grupos]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, valor]) => ({ label, valor }))
})
const meses = computed(() => {
  const base = new Date()
  const lista = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    const valor = filtradas.value.filter((f) => {
      const x = new Date(f.fecha)
      return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth()
    }).length
    lista.push({
      label: new Intl.DateTimeFormat('es-PE', { month: 'short' }).format(d).replace('.', ''),
      valor,
    })
  }
  return lista
})
const maxMes = computed(() => Math.max(1, ...meses.value.map((m) => m.valor)))
const maxEscuela = computed(() => Math.max(1, ...escuelas.value.map((e) => e.valor)))
const maxEstado = computed(() => Math.max(1, ...estados.value.map((e) => e.valor)))
const donut = computed(() => {
  const total = Math.max(1, resumen.value.participaciones),
    a = (resumen.value.aprobados / total) * 360,
    r = (resumen.value.revision / total) * 360
  return `conic-gradient(#008577 0deg ${a}deg, #f2a900 ${a}deg ${a + r}deg, #d9dce8 ${a + r}deg 360deg)`
})
const prioritarios = computed(() =>
  filtradas.value
    .filter((f) => ['observado', 'pendiente_subsanacion'].includes(f.estado_codigo))
    .sort((a, b) => b.dias_transcurridos - a.dias_transcurridos)
    .slice(0, 4),
)
function fecha(v: string) {
  return new Date(v).toLocaleDateString('es-PE')
}
function limpiar() {
  buscar.value = ''
  tipo.value = 'todos'
  responsabilidad.value = 'todos'
  categoria.value = 'todos'
  anio.value = 'todos'
}
function rutaDetalle(f: Fila) {
  const base = `docente-${f.responsabilidad}-${f.tipo === 'tesis' ? 'tesis' : 'proyectos'}-detalle`
  return {
    name: f.categoria === 'aprobado' ? `${base}-aprobada` : base,
    params: { id: f.id_expediente },
  }
}
function exportar() {
  const h = [
    'Expediente',
    'Título',
    'Tesista',
    'Escuela',
    'Tipo',
    'Responsabilidad',
    'Cargo',
    'Versión',
    'Estado',
    'Etapa',
    'Fecha',
    'Días',
    'Ronda',
    'Veredicto',
  ]
  const v = filtradas.value.map((f) => [
    f.codigo,
    f.titulo,
    f.tesista,
    f.escuela ?? '',
    f.tipo,
    f.responsabilidad,
    f.cargo,
    f.version,
    f.estado,
    f.etapa,
    fecha(f.fecha),
    f.dias_transcurridos,
    f.ronda ?? '',
    f.veredicto ?? '',
  ])
  const csv = [h, ...v]
    .map((r) => r.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(','))
    .join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `reporte-docente-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get<Respuesta>('/docente/reportes')
    filas.value = data.filas
    docente.value = data.docente
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'No se pudo cargar el dashboard.'
  } finally {
    cargando.value = false
  }
}
onMounted(cargar)
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    <header
      class="flex justify-between items-center h-[70px] px-gutter sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant shadow-sm"
    >
      <h2 class="font-headline-sm text-primary">Docente — Reportes</h2>
      <div class="text-right hidden sm:block">
        <p class="font-headline-sm text-primary">
          <span class="font-medium">Bienvenido</span> {{ docente.nombre }}
        </p>
        <p class="text-label-md text-on-surface-variant">
          {{ docente.correo }}<span v-if="docente.celular"> · {{ docente.celular }}</span>
        </p>
      </div>
    </header>
    <main class="p-gutter lg:p-10 space-y-7 max-w-[1500px] mx-auto w-full">
      <section
        class="rounded-3xl p-7 text-white shadow-lg relative overflow-hidden"
        style="background: linear-gradient(120deg, #243b77 0%, #40558f 55%, #008577 130%)"
      >
        <div class="absolute -right-20 -top-28 w-80 h-80 rounded-full bg-white/10"></div>
        <div class="relative flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <p class="text-white/70 text-xs font-bold uppercase tracking-[.18em]">
              Analítica académica
            </p>
            <h3 class="text-3xl font-bold mt-2">Panel de desempeño docente</h3>
            <p class="text-white/75 mt-2 max-w-2xl">
              Seguimiento integral de asesorías, evaluaciones de jurado, estados y carga académica.
            </p>
          </div>
          <button
            :disabled="!filtradas.length"
            class="bg-white text-primary px-5 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
            @click="exportar"
          >
            <span class="material-symbols-outlined">download</span>Exportar reporte
          </button>
        </div>
      </section>

      <section
        class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          <div class="xl:col-span-2">
            <label class="text-xs font-bold text-on-surface-variant">Buscar</label>
            <div class="mt-1 flex items-center rounded-xl border border-outline-variant px-3">
              <span class="material-symbols-outlined text-outline">search</span
              ><input
                v-model="buscar"
                class="w-full border-none bg-transparent py-2.5 outline-none"
                placeholder="Expediente, título o tesista"
              />
            </div>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant">Tipo</label
            ><select
              v-model="tipo"
              class="mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-2.5"
            >
              <option value="todos">Todos</option>
              <option value="proyecto">Proyectos</option>
              <option value="tesis">Tesis</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant">Participación</label
            ><select
              v-model="responsabilidad"
              class="mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-2.5"
            >
              <option value="todos">Todas</option>
              <option value="asesor">Asesoría</option>
              <option value="jurado">Jurado</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant">Resultado</label
            ><select
              v-model="categoria"
              class="mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-2.5"
            >
              <option value="todos">Todos</option>
              <option value="revision">En revisión</option>
              <option value="aprobado">Aprobados</option>
              <option value="otro">Otros</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-bold text-on-surface-variant">Año</label
            ><select
              v-model="anio"
              class="mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-2.5"
            >
              <option value="todos">Todos</option>
              <option v-for="a in anios" :key="a" :value="String(a)">{{ a }}</option>
            </select>
          </div>
        </div>
        <div class="mt-3 flex justify-between text-xs text-on-surface-variant">
          <span>Los gráficos responden a los filtros aplicados.</span
          ><button class="font-bold text-primary hover:underline" @click="limpiar">
            Limpiar filtros
          </button>
        </div>
      </section>

      <div v-if="cargando" class="py-20 text-center text-on-surface-variant">
        Construyendo dashboard...
      </div>
      <div v-else-if="error" class="rounded-xl bg-error-container p-5 text-error">
        {{ error }} <button class="font-bold underline" @click="cargar">Reintentar</button>
      </div>
      <template v-else
        ><section class="grid grid-cols-2 xl:grid-cols-6 gap-4">
          <article
            v-for="tarjeta in [
              { l: 'Participaciones', v: resumen.participaciones, i: 'work_history', c: '#40558f' },
              { l: 'Expedientes únicos', v: resumen.expedientes, i: 'folder_open', c: '#5268a5' },
              { l: 'En revisión', v: resumen.revision, i: 'rate_review', c: '#f2a900' },
              { l: 'Observados', v: resumen.observados, i: 'warning', c: '#ba1a1a' },
              { l: 'Aprobados', v: resumen.aprobados, i: 'verified', c: '#008577' },
              {
                l: 'Promedio seguimiento',
                v: `${resumen.promedio} d`,
                i: 'schedule',
                c: '#6750a4',
              },
            ]"
            :key="tarjeta.l"
            class="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant shadow-sm"
          >
            <div class="flex justify-between items-start">
              <div>
                <p class="text-[11px] uppercase tracking-wider text-on-surface-variant">
                  {{ tarjeta.l }}
                </p>
                <p class="text-3xl font-bold mt-2" :style="{ color: tarjeta.c }">{{ tarjeta.v }}</p>
              </div>
              <span
                class="material-symbols-outlined p-2 rounded-xl"
                :style="{ color: tarjeta.c, backgroundColor: `${tarjeta.c}18` }"
                >{{ tarjeta.i }}</span
              >
            </div>
          </article>
        </section>

        <section class="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <article
            class="xl:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm"
          >
            <div class="flex justify-between">
              <div>
                <h4 class="font-headline-md text-primary">Actividad de los últimos 6 meses</h4>
                <p class="text-xs text-on-surface-variant">
                  Registros según fecha de asignación o seguimiento
                </p>
              </div>
              <span class="material-symbols-outlined text-primary">monitoring</span>
            </div>
            <div class="h-64 flex items-end gap-4 mt-6 border-b border-outline-variant px-2">
              <div
                v-for="mes in meses"
                :key="mes.label"
                class="flex-1 h-full flex flex-col justify-end items-center gap-2"
              >
                <span class="text-xs font-bold text-primary">{{ mes.valor }}</span>
                <div
                  class="w-full max-w-16 rounded-t-xl bg-gradient-to-t from-primary to-secondary transition-all"
                  :style="{ height: `${Math.max(4, (mes.valor / maxMes) * 85)}%` }"
                ></div>
                <span class="text-xs capitalize text-on-surface-variant pb-2">{{ mes.label }}</span>
              </div>
            </div>
          </article>
          <article
            class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm"
          >
            <h4 class="font-headline-md text-primary">Resultado global</h4>
            <div class="flex items-center justify-center my-6">
              <div
                class="w-44 h-44 rounded-full flex items-center justify-center"
                :style="{ background: donut }"
              >
                <div
                  class="w-28 h-28 rounded-full bg-surface-container-lowest flex flex-col items-center justify-center"
                >
                  <span class="text-3xl font-bold text-primary">{{ resumen.tasa }}%</span
                  ><span class="text-xs text-on-surface-variant">aprobación</span>
                </div>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span class="inline-block w-2 h-2 rounded-full bg-secondary"></span>
                <p>Aprobados</p>
              </div>
              <div>
                <span class="inline-block w-2 h-2 rounded-full bg-[#f2a900]"></span>
                <p>Revisión</p>
              </div>
              <div>
                <span class="inline-block w-2 h-2 rounded-full bg-[#d9dce8]"></span>
                <p>Otros</p>
              </div>
            </div>
          </article>
        </section>

        <section class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <article
            class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm"
          >
            <h4 class="font-headline-md text-primary">Distribución académica</h4>
            <p class="text-xs text-on-surface-variant mb-5">Proyecto frente a tesis</p>
            <div v-for="item in porTipo" :key="item.label" class="mb-5">
              <div class="flex justify-between text-sm mb-2">
                <span>{{ item.label }}</span
                ><strong>{{ item.valor }}</strong>
              </div>
              <div class="h-3 rounded-full bg-surface-container">
                <div
                  class="h-full rounded-full"
                  :style="{
                    width: `${resumen.participaciones ? (item.valor / resumen.participaciones) * 100 : 0}%`,
                    backgroundColor: item.color,
                  }"
                ></div>
              </div>
            </div>
            <div class="pt-4 border-t border-outline-variant">
              <div v-for="item in porRol" :key="item.label" class="flex justify-between py-2">
                <span class="text-sm">{{ item.label }}</span
                ><strong :style="{ color: item.color }">{{ item.valor }}</strong>
              </div>
            </div>
          </article>
          <article
            class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm"
          >
            <h4 class="font-headline-md text-primary">Estados más frecuentes</h4>
            <p class="text-xs text-on-surface-variant mb-5">Concentración del flujo actual</p>
            <div v-if="!estados.length" class="text-sm text-on-surface-variant">Sin datos</div>
            <div v-for="item in estados" :key="item.label" class="mb-4">
              <div class="flex justify-between text-xs mb-1">
                <span>{{ item.label }}</span
                ><strong>{{ item.valor }}</strong>
              </div>
              <div class="h-2 rounded-full bg-surface-container">
                <div
                  class="h-full rounded-full bg-primary"
                  :style="{ width: `${(item.valor / maxEstado) * 100}%` }"
                ></div>
              </div>
            </div>
          </article>
          <article
            class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm"
          >
            <h4 class="font-headline-md text-primary">Carga por escuela</h4>
            <p class="text-xs text-on-surface-variant mb-5">Top de escuelas vinculadas</p>
            <div v-if="!escuelas.length" class="text-sm text-on-surface-variant">Sin datos</div>
            <div v-for="item in escuelas" :key="item.label" class="mb-4">
              <div class="flex justify-between text-xs mb-1">
                <span class="truncate pr-3">{{ item.label }}</span
                ><strong>{{ item.valor }}</strong>
              </div>
              <div class="h-2 rounded-full bg-surface-container">
                <div
                  class="h-full rounded-full bg-secondary"
                  :style="{ width: `${(item.valor / maxEscuela) * 100}%` }"
                ></div>
              </div>
            </div>
          </article>
        </section>

        <section class="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <article
            class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm"
          >
            <div class="flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-error">priority_high</span>
              <h4 class="font-headline-md text-primary">Atención prioritaria</h4>
            </div>
            <div v-if="!prioritarios.length" class="py-8 text-center text-on-surface-variant">
              No hay trabajos observados.
            </div>
            <RouterLink
              v-for="fila in prioritarios"
              :key="`${fila.id_expediente}-${fila.tipo}-${fila.responsabilidad}`"
              :to="rutaDetalle(fila)"
              class="block p-3 rounded-xl hover:bg-surface-container mb-2"
              ><div class="flex justify-between gap-2">
                <div>
                  <p class="text-xs font-bold text-error">{{ fila.codigo }} · {{ fila.estado }}</p>
                  <p class="text-sm font-medium line-clamp-1">{{ fila.titulo }}</p>
                </div>
                <strong class="text-sm whitespace-nowrap">{{ fila.dias_transcurridos }} d</strong>
              </div></RouterLink
            >
          </article>
          <article
            class="xl:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm"
          >
            <div class="p-5 border-b border-outline-variant flex justify-between">
              <div>
                <h4 class="font-headline-md text-primary">Detalle del reporte</h4>
                <p class="text-xs text-on-surface-variant">
                  {{ filtradas.length }} registros encontrados
                </p>
              </div>
              <span class="material-symbols-outlined text-primary">table_view</span>
            </div>
            <div v-if="!filtradas.length" class="p-12 text-center text-on-surface-variant">
              No existen registros con estos filtros.
            </div>
            <div v-else class="overflow-x-auto max-h-[470px]">
              <table class="w-full text-left">
                <thead class="sticky top-0 bg-surface-container-low">
                  <tr class="text-xs uppercase text-on-surface-variant">
                    <th class="px-5 py-4">Trabajo</th>
                    <th class="px-5 py-4">Participación</th>
                    <th class="px-5 py-4">Estado</th>
                    <th class="px-5 py-4">Tiempo</th>
                    <th class="px-5 py-4"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant">
                  <tr
                    v-for="fila in filtradas"
                    :key="`${fila.id_expediente}-${fila.tipo}-${fila.responsabilidad}`"
                    class="hover:bg-surface-container-low"
                  >
                    <td class="px-5 py-4 min-w-72">
                      <p class="font-bold text-primary">{{ fila.codigo }} · {{ fila.tipo }}</p>
                      <p class="text-sm line-clamp-1">{{ fila.titulo }}</p>
                      <p class="text-xs text-on-surface-variant">{{ fila.tesista }}</p>
                    </td>
                    <td class="px-5 py-4">
                      <p class="font-bold capitalize">{{ fila.responsabilidad }}</p>
                      <p class="text-xs text-on-surface-variant">{{ fila.cargo }}</p>
                    </td>
                    <td class="px-5 py-4">
                      <span class="text-xs font-bold">{{ fila.estado }}</span>
                      <p class="text-xs text-on-surface-variant">{{ fila.etapa }}</p>
                    </td>
                    <td class="px-5 py-4">
                      <strong>{{ fila.dias_transcurridos }} días</strong>
                      <p class="text-xs text-on-surface-variant">{{ fecha(fila.fecha) }}</p>
                    </td>
                    <td class="px-5 py-4">
                      <RouterLink
                        :to="rutaDetalle(fila)"
                        class="text-primary font-bold hover:underline"
                        >Detalle</RouterLink
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </section></template
      >
    </main>
  </div>
</template>
