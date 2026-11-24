import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { computed, reactive, ref } from 'vue'
import ts from 'typescript'

function compilar(source) {
  return ts
    .transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      transformers: {
        before: [
          () => (file) =>
            ts.factory.updateSourceFile(
              file,
              file.statements.filter((n) => !ts.isImportDeclaration(n)),
            ),
        ],
      },
    })
    .outputText.replaceAll('export ', '')
    .replace('{};', '')
}
const lista = [
  {
    id_expediente: 7,
    cod_expediente: 'EXP-REAL-7',
    id_tesista: 20,
    id_co_tesista: 10,
    estado: 1,
    etapa: { codigo: 'revision_requisitos_documentarios' },
  },
  { id_expediente: 9, cod_expediente: 'AJENO', id_tesista: 30, id_co_tesista: null, estado: 1 },
]
const detalle = {
  id_expediente: 7,
  cod_expediente: 'EXP-REAL-7',
  etapa_actual: { codigo: 'revision_requisitos_documentarios', nombre: 'Revisión UDI' },
  estado_actual: { codigo: 'pendiente_subsanacion', nombre: 'Pendiente de subsanación' },
  informes: [{ estado: 1, es_tesis: 0, version: 2 }],
  historial: [
    {
      id_historial: 1,
      accion_realizada: 'derivado_udi',
      fecha_cambio: '2026-11-01',
      etapa_nueva: { nombre: 'Revisión UDI' },
      estado_nuevo: { nombre: 'En revisión' },
    },
  ],
}
const revision = {
  revision: {
    requisitos: [
      {
        evaluacion: {
          observaciones: [
            {
              id_observacion_documentaria: 1,
              estado: 'pendiente',
              es_subsanable: true,
              detalle: 'Corregir proyecto',
              fecha_emision: '2026-11-02',
            },
            {
              id_observacion_documentaria: 2,
              estado: 'en_subsanacion',
              es_subsanable: true,
              detalle: 'Documento enviado',
              fecha_emision: '2026-11-02',
            },
            {
              id_observacion_documentaria: 3,
              estado: 'cerrada',
              detalle: 'Resuelto',
              fecha_emision: '2026-11-02',
            },
          ],
        },
      },
    ],
  },
}
const jurados = [
  { id_revision: 1, id_docente: 4, numero_ronda: 1, veredicto: 'observado', docente: 'Docente' },
  { id_revision: 2, id_docente: 4, numero_ronda: 2, veredicto: 'aprobado', docente: 'Docente' },
]
const consultas = []
let fallo = ''
const api = {
  get: async (url, opciones) => {
    consultas.push({ url, opciones })
    if (url === fallo) throw Error('Error de red')
    if (url === '/expedientes') return { data: structuredClone(lista) }
    if (url === '/expedientes/7') return { data: { data: structuredClone(detalle) } }
    if (url.endsWith('/revision-documentaria')) return { data: { data: revision } }
    if (url.endsWith('/plazos')) return { data: { data: [] } }
    if (url.endsWith('/lecturas-actividad')) return { data: { data: [{ modulo: 'notificaciones', clave: 'historial-1' }] } }
    if (url === '/formatos-oficiales') return { data: { formatos: [] } }
    if (url.endsWith('/revisiones-jurados'))
      return { data: { data: jurados, jurados: [{ id_docente: 4 }] } }
    if (url === '/resoluciones')
      return {
        data: {
          data: [
            {
              id_resolucion: 5,
              numero_resolucion: 'RES REAL',
              fecha_emision: '2026-11-03',
              estado: 'vigente',
            },
          ],
        },
      }
    throw Error(`Consulta inesperada: ${url}`)
  },
}
const servicio = new Function(
  'api',
  'consultarPlazos',
  'fechaPlazo',
  'textoPlazo',
  `${compilar(readFileSync(new URL('../src/services/resumenTesista.ts', import.meta.url), 'utf8'))}; return { cargarResumenTesista, pasoTesista, pasosTesista };`,
)(api, async (id) => (await api.get(`/expedientes/${id}/plazos`)).data.data, () => '', () => '')
const inicioConsultas = consultas.length
let activas = 0
let maximoActivas = 0
const obtener = api.get
api.get = async (...args) => {
  activas++
  maximoActivas = Math.max(maximoActivas, activas)
  try { return await obtener(...args) } finally { activas-- }
}
let parcialInicial
let cabeceraInicial
await servicio.cargarResumenTesista(10, null, (datos) => {
  if (!datos.detalle) {
    cabeceraInicial = datos
    assert.equal(datos.expediente.id_expediente, 7)
    assert.equal(consultas.length - inicioConsultas, 0, 'El panel usa la cabecera ya autorizada sin esperar otra consulta')
    return
  }
  parcialInicial = datos
  assert.equal(datos.detalle.id_expediente, 7)
  assert.equal(datos.observaciones, null, 'Las observaciones pendientes de carga no se presentan como cero')
  assert.equal(consultas.length - inicioConsultas, 1, 'El detalle se publica antes de consultar los complementos')
}, lista)
assert.ok(parcialInicial)
assert.ok(cabeceraInicial)
assert.equal(consultas.length - inicioConsultas, 7, 'Reutiliza el listado obtenido al entrar al sistema')
assert.equal(maximoActivas, 1, 'Las consultas secundarias no agotan su espera en la cola del servidor local')
fallo = '/expedientes/7/lecturas-actividad'
let detalleRecuperado
await assert.rejects(servicio.cargarResumenTesista(10, null, datos => { detalleRecuperado = datos }))
assert.equal(detalleRecuperado.detalle.id_expediente, 7, 'Un fallo de lectura no impide publicar el expediente')
fallo = ''
let resumen = await servicio.cargarResumenTesista(10, 9)
assert.equal(resumen.detalle.id_expediente, 7, 'No permite seleccionar el expediente ajeno')
assert.equal(resumen.expedientes.length, 1)
assert.equal(resumen.observaciones, 2)
assert.equal(resumen.pendientes, 1)
assert.equal(resumen.avisos[0].titulo, 'Resolución RES REAL')
assert.equal(resumen.avisos.find(a => a.id === 'historial-1').leida, true, 'Respeta las lecturas guardadas')
assert.equal(new Set(resumen.avisos.map((item) => item.id)).size, resumen.avisos.length)
assert.equal(servicio.pasoTesista('revision_requisitos_documentarios', 'en_revision'), 2)
assert.equal(servicio.pasoTesista('revision_requisitos_documentarios', 'conforme'), 3)
assert.equal(servicio.pasoTesista('revision_jurados_proyecto', 'en_revision'), 5)
assert.equal(servicio.pasoTesista('desconocida', 'en_revision'), 0)
fallo = '/expedientes/7/revision-documentaria'
const parcial = await servicio.cargarResumenTesista(10)
assert.equal(parcial.observaciones, null, 'Un error no se presenta como cero observaciones')
assert.equal(parcial.errores.length, 1)
assert.ok(parcial.avisos.some((item) => item.categoria === 'Resoluciones'))
fallo = ''
lista[0].etapa.codigo = 'revision_jurados_proyecto'
detalle.etapa_actual.codigo = 'revision_jurados_proyecto'
assert.equal(
  (await servicio.cargarResumenTesista(10)).observaciones,
  0,
  'No cuenta observaciones antiguas del jurado aprobadas después',
)
assert.equal((await servicio.cargarResumenTesista(99)).detalle, null)
assert.ok(!consultas.some((item) => item.url === '/expedientes/9'))

const { descriptor } = parse(
  readFileSync(new URL('../src/components/TesistaPanel.vue', import.meta.url), 'utf8'),
)
const actividad = reactive({
  resumen: null, cargando: false, error: '',
  iniciar() {},
  async actualizar() { this.resumen = structuredClone(resumen) },
})
const panel = new Function(
  'ref',
  'computed',
  'onMounted',
  'useAuthStore',
  'useRoute',
  'useActividadTesistaStore',
  'pasoTesista',
  `${compilar(descriptor.scriptSetup.content)}; return { cargar, resumen, pasoActual, faseTesis, acciones, finalizado };`,
)(
  ref,
  computed,
  () => {},
  () => ({ usuario: { id_usuario: 10, alumno: { id_alumno: 10 } }, expedientes: lista }),
  () => ({ query: {} }),
  () => actividad,
  servicio.pasoTesista,
)
await panel.cargar()
assert.equal(panel.pasoActual.value, 2)
assert.equal(panel.faseTesis.value, 'Bloqueada')
assert.equal(panel.acciones.value[0].destino.name, 'observaciones')
assert.equal(panel.acciones.value[3].destino.name, 'formatos')
panel.resumen.value.detalle.etapa_actual.codigo = 'fase_tesis_informe_final'
panel.resumen.value.detalle.estado_actual.codigo = 'fase_tesis_habilitada'
assert.equal(panel.faseTesis.value, 'Habilitada')
assert.equal(panel.pasoActual.value, 7)
panel.resumen.value.detalle.etapa_actual.codigo = 'cierre_archivo'
panel.resumen.value.detalle.estado_actual.codigo = 'archivado'
assert.equal(panel.finalizado.value, true)
resumen = {
  expedientes: lista,
  expediente: { ...lista[0], etapa: { codigo: 'revision_jurados_proyecto' }, estado_actual: { codigo: 'en_revision' } },
  detalle: null, avisos: [], errores: [], observaciones: null, pendientes: null,
}
await panel.cargar()
assert.equal(panel.pasoActual.value, 5, 'Muestra la etapa autorizada antes de recibir el detalle completo')
assert.equal(panel.acciones.value[0].destino.name, 'expedientes-detalle', 'Un detalle pendiente no ofrece registrar otro expediente')
resumen = {
  expedientes: [],
  detalle: null,
  avisos: [],
  errores: [],
  observaciones: 0,
  pendientes: 0,
}
await panel.cargar()
assert.equal(panel.acciones.value[0].destino.name, 'expedientes-nuevo')
assert.equal(panel.pasoActual.value, 0)
assert.match(descriptor.template.content, /Sin plazo con inicio registrado/)
assert.doesNotMatch(descriptor.template.content, /EXP-2026-0042|Borrador V1.2|vence en 3 días/)
console.log(
  'Panel: datos propios, estados, seguimiento, observaciones, avisos, acciones y fallos parciales verificados.',
)
