import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { computed, ref, reactive, watch, nextTick } from 'vue'
import { parse } from '@vue/compiler-sfc'
import ts from 'typescript'

function compile(source) {
  return ts
    .transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      transformers: {
        before: [
          () => (file) =>
            ts.factory.updateSourceFile(
              file,
              file.statements.filter((node) => !ts.isImportDeclaration(node)),
            ),
        ],
      },
    })
    .outputText.replace('export {};', '')
}
const helper = compile(
  readFileSync(new URL('../src/utils/udiExpedientes.ts', import.meta.url), 'utf8'),
)
const { progresoRevisionUdi, documentosSubsanadosUdi } = await import(
  `data:text/javascript;base64,${Buffer.from(helper).toString('base64')}`
)
const expediente = (id, etapa, estado) => ({
  id_expediente: id,
  etapa: { codigo: etapa },
  estado_actual: { codigo: estado },
  tesista: { nombres: 'Ana', apellido_paterno: 'Flores', apellido_materno: 'Rojas' },
  co_tesista: null,
})
const fixtures = [
  expediente(1, 'registro_expediente_digital', 'derivado_udi'),
  expediente(2, 'revision_requisitos_documentarios', 'en_revision'),
  expediente(3, 'revision_requisitos_documentarios', 'pendiente_subsanacion'),
  expediente(4, 'revision_requisitos_documentarios', 'conforme'),
  expediente(5, 'aprobacion_designacion_jurados', 'derivado_decanatura'),
  expediente(6, 'revision_jurados_proyecto', 'en_revision'),
  expediente(7, 'cierre_archivo', 'archivado'),
]
assert.deepEqual(
  fixtures.map((item) => progresoRevisionUdi(item).completados),
  [0, 1, 1, 2, 3, 3, 3],
)
assert.deepEqual(
  fixtures.map((item) => progresoRevisionUdi(item).porcentaje),
  [0, 33, 33, 67, 100, 100, 100],
)
assert.match(progresoRevisionUdi(fixtures[2]).etiqueta, /subsanación/)
assert.equal(progresoRevisionUdi({ etapa: null, estado_actual: null }).revisado, false)
for (const item of fixtures) {
  assert.deepEqual(
    progresoRevisionUdi(item),
    progresoRevisionUdi({ etapa_actual: item.etapa, estado_actual: item.estado_actual }),
  )
}

const inbox = parse(
  readFileSync(new URL('../src/views/UdiExpedientesView.vue', import.meta.url), 'utf8'),
).descriptor
const route = reactive({ name: 'udi-expedientes-por-revisar' })
const view = new Function(
  'computed',
  'ref',
  'onMounted',
  'watch',
  'useRoute',
  'useRouter',
  'api',
  'progresoRevisionUdi',
  'documentosSubsanadosUdi',
  `${compile(inbox.scriptSetup.content)}; return { cargarExpedientes, expedientesFiltrados, filtros, busquedaTesista };`,
)(
  computed,
  ref,
  () => {},
  watch,
  () => route,
  () => ({}),
  { get: async () => ({ data: fixtures }) },
  progresoRevisionUdi,
  documentosSubsanadosUdi,
)
await view.cargarExpedientes()
assert.deepEqual(
  view.expedientesFiltrados.value.map((item) => item.id_expediente),
  [1, 2, 3, 4],
)
view.busquedaTesista.value = 'otro nombre'
assert.equal(view.expedientesFiltrados.value.length, 0)
view.busquedaTesista.value = 'flores'
assert.equal(view.expedientesFiltrados.value.length, 4)
view.filtros.value.estado = 'conforme'
route.name = 'udi-expedientes-revisados'
await nextTick()
await nextTick()
assert.equal(view.filtros.value.estado, '')
assert.equal(view.busquedaTesista.value, '')
assert.deepEqual(
  view.expedientesFiltrados.value.map((item) => item.id_expediente),
  [5, 6, 7],
)
assert.match(inbox.template.content, /name: 'udi-expediente'/)
assert.doesNotMatch(inbox.template.content, /name: 'udi-revision'/)

const review = parse(
  readFileSync(new URL('../src/views/UdiRevisionView.vue', import.meta.url), 'utf8'),
).descriptor
const requests = []
const redirects = []
let detalle = {
  etapa_actual: fixtures[5].etapa,
  estado_actual: fixtures[5].estado_actual,
  informes: [],
}
const revisionApi = {
  get: async (url) => {
    requests.push(url)
    return { data: { data: url.endsWith('/revision-documentaria') ? { revision: null } : detalle } }
  },
}
const reviewView = new Function(
  'computed',
  'ref',
  'onMounted',
  'useRoute',
  'useRouter',
  'useAuthStore',
  'api',
  'axios',
  'progresoRevisionUdi',
  'documentosSubsanadosUdi',
  `${compile(review.scriptSetup.content)}; return { cargarInformacion, detalle, revision, mensajeError };`,
)(
  computed,
  ref,
  () => {},
  () => ({ params: { id: '6' }, query: {} }),
  () => ({ replace: async (to) => redirects.push(to) }),
  () => ({ usuario: null }),
  revisionApi,
  { isAxiosError: () => false },
  progresoRevisionUdi,
  documentosSubsanadosUdi,
)
await reviewView.cargarInformacion()
assert.deepEqual(redirects, [{ name: 'udi-expediente', params: { id: 6 } }])
assert.deepEqual(requests, ['/expedientes/6'])
assert.equal(reviewView.detalle.value, null)
assert.equal(reviewView.revision.value, null)
detalle = {
  etapa_actual: fixtures[1].etapa,
  estado_actual: fixtures[1].estado_actual,
  informes: [],
}
requests.length = 0
await reviewView.cargarInformacion()
assert.equal(redirects.length, 1)
assert.deepEqual(requests, ['/expedientes/6', '/expedientes/6/revision-documentaria'])
assert.equal(reviewView.mensajeError.value, '')

const file = parse(
  readFileSync(new URL('../src/views/UdiExpedienteView.vue', import.meta.url), 'utf8'),
).descriptor
assert.match(file.template.content, /v-if="!avance.revisado"/)
assert.match(file.template.content.replace(/\s+/g, ' '), /Revisado · Solo consulta/)
assert.doesNotMatch(file.scriptSetup.content, /MiExpediente/)
assert.doesNotMatch(file.scriptSetup.content, /api\.(post|put|patch|delete)\(/)
for (const section of [
  'Semáforo de gestión',
  'Cuerpo de jurados propuestos',
  'Reporte de similitud',
  'Documentos clave',
]) {
  assert.ok(file.template.content.includes(section), section)
}
const generalRequests = []
let errorJurados = false
let expedienteGeneral = fixtures[5]
const generalApi = {
  get: async (url) => {
    generalRequests.push(url)
    if (url === '/expedientes/6')
      return {
        data: {
          data: {
            etapa_actual: expedienteGeneral.etapa,
            estado_actual: expedienteGeneral.estado_actual,
            informes: [
              { estado: 1, es_tesis: 0, version: 1, id_asesor: 1, titulo: 'Proyecto anterior' },
              {
                estado: 1,
                es_tesis: 0,
                version: 2,
                id_asesor: 1,
                id_coasesor: 2,
                titulo: 'Proyecto vigente',
                turnitin: 23,
              },
              { estado: 0, es_tesis: 0, version: 3, titulo: 'Proyecto inactivo' },
            ],
            historial: [],
          },
        },
      }
    if (url.endsWith('/revision-documentaria'))
      return {
        data: {
          data: {
            revision: {
              requisitos: [
                {
                  nombre: 'Solicitud',
                  evaluacion: {
                    observaciones: [
                      {
                        id_observacion_documentaria: 1,
                        detalle: 'Corregir firma',
                        fecha_emision: '2026-10-14T10:00:00',
                        subsanaciones: [{ id_subsanacion_documentaria: 1 }],
                      },
                    ],
                  },
                },
              ],
            },
            documentos_derivacion: { conformidad_tecnica: '/conformidad.pdf' },
          },
        },
      }
    if (url === '/jurados-expediente') {
      if (errorJurados) throw Error('Sin conexión')
      return {
        data: [
          {
            id_expediente: 6,
            id_designacion: 1,
            estado: 1,
            designacion: { estado: 'propuesta', version: 1 },
          },
          {
            id_expediente: 6,
            id_designacion: 2,
            estado: 1,
            designacion: { estado: 'vigente', version: 2 },
          },
          {
            id_expediente: 6,
            id_designacion: 3,
            estado: 1,
            designacion: { estado: 'anulada', version: 3 },
          },
          {
            id_expediente: 99,
            id_designacion: 4,
            estado: 1,
            designacion: { estado: 'vigente', version: 4 },
          },
        ],
      }
    }
    return { data: { nombres: 'Docente', apellido_paterno: 'García' } }
  },
}
const generalView = new Function(
  'computed',
  'ref',
  'watch',
  'onMounted',
  'useRoute',
  'api',
  'axios',
  'progresoRevisionUdi',
  'documentosSubsanadosUdi',
  `${compile(file.scriptSetup.content)}; return { cargar, detalle, revision, avance, informe, asesor, coasesor, tribunal, observaciones, ultimasObservaciones, subsanaciones, documentos, versionProyecto, error, errorEquipo };`,
)(
  computed,
  ref,
  () => {},
  () => {},
  () => ({ params: { id: '6' }, query: {} }),
  generalApi,
  { isAxiosError: () => false },
  progresoRevisionUdi,
  documentosSubsanadosUdi,
)
await generalView.cargar()
assert.equal(generalView.error.value, '')
assert.equal(generalView.avance.value.revisado, true)
assert.equal(generalView.informe.value.titulo, 'Proyecto vigente')
assert.equal(generalView.asesor.value.nombres, 'Docente')
assert.equal(generalView.coasesor.value.nombres, 'Docente')
assert.deepEqual(
  generalView.tribunal.value.map((item) => item.id_designacion),
  [2],
)
assert.equal(generalView.observaciones.value.length, 1)
assert.equal(generalView.ultimasObservaciones.value[0].observacion.detalle, 'Corregir firma')
assert.equal(generalView.subsanaciones.value.length, 1)
assert.equal(generalView.documentos.value[0].ruta, '/conformidad.pdf')
assert.equal(generalRequests.includes('/expedientes'), false)
generalView.detalle.value.solicitud_adjunta = '/solicitud-v1.pdf'
generalView.detalle.value.informes = [
  { estado: 1, es_tesis: 0, version: 1, archivo_adjunto: '/proyecto-v1.pdf' },
]
generalView.revision.value.revision.requisitos = [
  {
    nombre: 'Proyecto de tesis',
    evaluacion: { observaciones: [
      { subsanaciones: [{ id_subsanacion_documentaria: 1, numero_intento: 1, fecha_presentacion: '2026-10-28', archivo_adjunto: '/proyecto-v2.pdf', resultado: 'aceptada' }] },
      { subsanaciones: [{ id_subsanacion_documentaria: 3, numero_intento: 1, fecha_presentacion: '2026-10-29', archivo_adjunto: '/proyecto-v3.pdf', resultado: null }] },
    ] },
  },
  {
    nombre: 'Solicitud de inscripción',
    evaluacion: { observaciones: [{ subsanaciones: [
      { id_subsanacion_documentaria: 2, numero_intento: 1, fecha_presentacion: '2026-10-28', archivo_adjunto: '/solicitud-v2.pdf', resultado: null },
    ] }] },
  },
]
assert.equal(generalView.versionProyecto.value, 3)
assert.deepEqual(generalView.documentos.value.filter((item) => item.version).map((item) => [item.nombre, item.ruta]), [
  ['Proyecto de tesis · versión 3 · Subsanado', '/proyecto-v3.pdf'],
  ['Proyecto de tesis · versión 2 · Subsanado', '/proyecto-v2.pdf'],
  ['Proyecto de tesis · versión 1', '/proyecto-v1.pdf'],
  ['Solicitud · versión 2 · Subsanado', '/solicitud-v2.pdf'],
  ['Solicitud · versión 1', '/solicitud-v1.pdf'],
])
generalView.revision.value.revision.requisitos[0].evaluacion.observaciones.pop()
assert.equal(generalView.versionProyecto.value, 2)
errorJurados = true
await generalView.cargar()
assert.equal(generalView.error.value, '')
assert.match(generalView.errorEquipo.value, /jurados/)
assert.equal(generalView.tribunal.value.length, 0)
expedienteGeneral = fixtures[1]
await generalView.cargar()
assert.equal(generalView.avance.value.revisado, false)
assert.equal(generalView.avance.value.porcentaje, 33)
console.log(
  'OK: dos bandejas, progreso hasta derivación, ficha general y bloqueo de revisión finalizada por URL.',
)
