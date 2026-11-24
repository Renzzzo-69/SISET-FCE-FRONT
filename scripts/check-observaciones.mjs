// Ejecutar: node scripts/check-observaciones.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { computed, ref } from 'vue'
import ts from 'typescript'
import axios from 'axios'

const { descriptor } = parse(
  readFileSync(new URL('../src/views/ObservacionesView.vue', import.meta.url), 'utf8'),
)
const source = ts
  .transpileModule(descriptor.scriptSetup.content, {
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
const storage = new Map()
const sessionStorage = {
  getItem: (key) => storage.get(key),
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
}
let posts = 0
let fail = false
let payload
const registro = {
  id_expediente: 7,
  id_tesista: 5,
  etapa: { codigo: 'revision_requisitos_documentarios' },
  estado_actual: { codigo: 'pendiente_subsanacion' },
}
const datos = {
  rondas: [{ numero_ronda: 1 }, { numero_ronda: 2 }],
  revision: {
    numero_ronda: 2,
    requisitos: [
      {
        nombre: 'Solicitud',
        evaluacion: {
          observaciones: [
            {
              id_observacion_documentaria: 9,
              fecha_emision: '2026-10-29T12:00:00',
              estado: 'pendiente',
              es_subsanable: true,
              subsanaciones: [],
            },
          ],
        },
      },
    ],
  },
}
const api = {
  get: async (url) => ({
    data:
      url === '/expedientes'
        ? [registro]
        : url.endsWith('/revisiones-jurados')
          ? { data: [], jurados: [] }
          : { data: structuredClone(datos) },
  }),
  post: async (url, body) => {
    posts++
    assert.equal(url, '/expedientes/7/revision-documentaria/observaciones/9/subsanaciones')
    if (fail) throw new Error('Sin conexión')
    payload = body
    datos.revision.requisitos[0].evaluacion.observaciones[0].estado = 'en_subsanacion'
  },
}
const setup = new Function(
  'watch',
  'computed',
  'ref',
  'onMounted',
  'useRoute',
  'useAuthStore',
  'api',
  'axios',
  'sessionStorage',
  `${source}\nreturn { cargar, enviar, puedeEnviar, validarArchivo, archivo, errorFormulario, comentarios, guardarBorrador, seleccionar, revision, observaciones, actual, otras, expedientes, aviso, etapa, evaluador, revisionesJurados, columnasJurados, juradosAsignados, tieneJurados, cargarRevision, seleccionarJurado, validarArchivoJurado, enviarJurado, archivoLevantamiento, archivoProyecto, comentarioJurado, errorJurado, seleccionJurado, enviando };`,
)
const view = setup(
  () => {},
  computed,
  ref,
  () => {},
  () => ({ query: { expediente: '7' } }),
  () => ({ usuario: { id_usuario: 1, alumno: { id_alumno: 5 } }, tieneRol: () => true }),
  api,
  axios,
  sessionStorage,
)
await view.cargar()
assert.doesNotMatch(descriptor.template.content, /Ronda Actual|v-model="ronda"/)
assert.match(descriptor.template.content, /Ronda \{\{ actual.numeroRonda \}\}/)
assert.match(descriptor.template.content, /Ronda \{\{ item.numeroRonda \}\}/)
assert.equal(view.actual.value.numeroRonda, 1)
view.revision.value.revision.requisitos.push({
  nombre: 'Proyecto de tesis',
  evaluacion: {
    observaciones: [
      {
        id_observacion_documentaria: 10,
        fecha_emision: '2026-10-29T13:00:00',
        estado: 'pendiente',
        subsanaciones: [],
      },
    ],
  },
})
view.revision.value.revision.requisitos.unshift({
  nombre: 'Datos de participantes',
  evaluacion: {
    observaciones: [
      {
        id_observacion_documentaria: 11,
        fecha_emision: '2026-10-29T13:00:00',
        estado: 'cerrada',
        subsanaciones: [],
      },
    ],
  },
})
assert.deepEqual(
  view.observaciones.value.map((item) => [
    item.observacion.id_observacion_documentaria,
    item.numeroRonda,
  ]),
  [
    [9, 1],
    [10, 2],
    [11, 3],
  ],
)
view.seleccionar(10)
assert.equal(view.actual.value.numeroRonda, 2)
assert.deepEqual(
  view.otras.value.map((item) => item.numeroRonda),
  [1, 3],
)
view.seleccionar(9)
assert.equal(view.puedeEnviar.value, true)
view.revision.value.revision.numero_ronda = 1
assert.equal(view.puedeEnviar.value, false, 'No se puede enviar en una ronda anterior')
view.revision.value.revision.numero_ronda = 2
view.expedientes.value[0].id_tesista = 99
assert.equal(view.puedeEnviar.value, false, 'No se puede responder por otro tesista')
view.expedientes.value[0].id_tesista = 5
view.validarArchivo(new File(['texto'], 'archivo.exe'))
assert.equal(view.archivo.value, null)
view.validarArchivo(new File([new Uint8Array(30 * 1024 * 1024 + 1)], 'grande.pdf'))
assert.equal(view.archivo.value, null)
await view.enviar()
assert.equal(posts, 0, 'El archivo es obligatorio')
view.comentarios.value = 'Cambios realizados'
view.guardarBorrador()
view.seleccionar(9)
assert.equal(view.comentarios.value, 'Cambios realizados')
view.validarArchivo(new File(['documento'], 'corregido.pdf', { type: 'application/pdf' }))
fail = true
await view.enviar()
assert.ok(view.errorFormulario.value)
assert.equal(view.archivo.value.name, 'corregido.pdf', 'Un fallo conserva el archivo')
fail = false
await view.enviar()
assert.equal(payload.get('detalle'), 'Cambios realizados')
assert.equal(payload.get('archivo_adjunto').name, 'corregido.pdf')
assert.equal(storage.size, 0, 'El envío limpia el borrador')
assert.equal(view.puedeEnviar.value, false, 'No permite otro envío mientras está en revisión')
assert.match(view.aviso.value, /enviada correctamente/)
console.log('OK: permisos, rondas, archivos, borrador, error de red y envío de subsanación.')

view.evaluador.value = 'jurados'
view.etapa.value = 'tesis'
assert.equal(
  view.puedeEnviar.value,
  false,
  'La tesis no permite subsanar observaciones UDI del proyecto',
)
view.juradosAsignados.value = [
  { id_docente: 1, docente: 'Presidente', cargo: 'Presidente' },
  { id_docente: 2, docente: 'Secretario', cargo: 'Secretario' },
  { id_docente: 3, docente: 'Vocal', cargo: 'Vocal' },
]
view.revisionesJurados.value = [
  { id_revision: 1, id_docente: 1, numero_ronda: 1 },
  { id_revision: 2, id_docente: 1, numero_ronda: 2 },
  { id_revision: 3, id_docente: 2, numero_ronda: 1 },
]
assert.deepEqual(
  view.columnasJurados.value.map((item) => item.revisiones.length),
  [2, 1, 0],
  'Tres columnas conservan todas las rondas y al jurado sin revisiones',
)
const consultas = []
const tribunal = view.juradosAsignados.value.map((item) => ({ ...item }))
api.get = async (url, opciones) => {
  consultas.push({ url, etapa: opciones.params.etapa })
  return {
    data: {
      jurados: tribunal,
      data: [
        {
          id_revision: opciones.params.etapa === 'tesis' ? 10 : 20,
          id_docente: 1,
          numero_ronda: 1,
        },
      ],
    },
  }
}
await view.cargarRevision()
assert.deepEqual(consultas[0], { url: '/expedientes/7/revisiones-jurados', etapa: 'tesis' })
assert.equal(view.columnasJurados.value[0].revisiones[0].id_revision, 10)
view.etapa.value = 'proyecto'
await view.cargarRevision()
assert.equal(view.columnasJurados.value[0].revisiones[0].id_revision, 20)
assert.equal(view.revision.value, null)
console.log(
  'OK: columnas por jurado con todas sus rondas, etapas separadas y UDI antes de designacion.',
)

view.etapa.value = 'tesis'
view.revisionesJurados.value = [
  { id_revision: 1, id_docente: 1, numero_ronda: 1, veredicto: 'Observado' },
  { id_revision: 2, id_docente: 1, numero_ronda: 2, veredicto: 'Aprobado' },
  { id_revision: 3, id_docente: 2, numero_ronda: 1, veredicto: 'Aprobado' },
  { id_revision: 4, id_docente: 3, numero_ronda: 1, veredicto: 'Aprobado' },
]
assert.deepEqual(
  view.columnasJurados.value.map((jurado) => jurado.estado),
  ['Aprobado', 'Aprobado', 'Aprobado'],
)
assert.equal(
  view.columnasJurados.value[0].revisiones[0].veredicto,
  'Observado',
  'La aprobacion conserva las observaciones previas',
)
assert.equal(view.columnasJurados.value[0].revisiones[1].numero_ronda, 2)
console.log('OK: la aprobacion de tesis aparece por jurado y conserva todas sus rondas.')

api.get = async (url) => ({
  data:
    url === '/expedientes'
      ? [registro]
      : url.endsWith('/revisiones-jurados')
        ? { data: [], jurados: tribunal }
        : { data: structuredClone(datos) },
})
registro.etapa.codigo = 'fase_tesis_informe_final'
await view.cargar()
assert.equal(
  view.etapa.value,
  'proyecto',
  'Habilitar la tesis no oculta las aprobaciones del proyecto al abrir Observaciones',
)
registro.etapa.codigo = 'revision_jurados_tesis_final'
await view.cargar()
assert.equal(
  view.etapa.value,
  'tesis',
  'La tesis pasa a ser la etapa inicial cuando entra en revision',
)

view.evaluador.value = 'jurados'
view.etapa.value = 'proyecto'
const rondaJurado = {
  id_revision: 15,
  id_docente: 1,
  numero_ronda: 1,
  veredicto: 'Observado',
  puede_subsanar: true,
}
view.revisionesJurados.value = [rondaJurado]
view.seleccionarJurado(rondaJurado)
let enviosJurado = 0
let formularioJurado
api.post = async (url, body) => {
  enviosJurado++
  assert.equal(url, '/expedientes/7/revisiones-jurados/15/subsanacion')
  if (fail) throw new Error('Sin conexión')
  formularioJurado = body
}
await view.enviarJurado()
assert.equal(enviosJurado, 0, 'Se requieren los dos archivos')
assert.match(view.errorJurado.value, /Adjunta/)
function elegirArchivo(nombre, tipo) {
  const target = { files: [new File(['documento'], nombre)], value: nombre }
  view.validarArchivoJurado({ target }, tipo)
  return target
}
assert.equal(elegirArchivo('programa.exe', 'levantamiento').value, '')
assert.equal(view.archivoLevantamiento.value, null)
elegirArchivo('levantamiento.docx', 'levantamiento')
elegirArchivo('proyecto.pdf', 'proyecto')
view.comentarioJurado.value = 'Cambios realizados para la ronda 1'
fail = true
await view.enviarJurado()
assert.equal(view.archivoProyecto.value.name, 'proyecto.pdf', 'El fallo conserva ambos archivos')
assert.equal(view.archivoLevantamiento.value.name, 'levantamiento.docx')
assert.ok(view.errorJurado.value)
assert.equal(view.enviando.value, false)
fail = false
await view.enviarJurado()
assert.equal(formularioJurado.get('archivo_subsanacion').name, 'levantamiento.docx')
assert.equal(formularioJurado.get('archivo_proyecto').name, 'proyecto.pdf')
assert.equal(formularioJurado.get('detalle'), 'Cambios realizados para la ronda 1')
assert.equal(view.seleccionJurado.value, undefined)
assert.match(view.aviso.value, /nueva versión/)
assert.match(descriptor.template.content, /item.subsanacion.archivo/)
assert.match(descriptor.template.content, /item.subsanacion.proyecto/)
assert.match(descriptor.template.content, /item.archivo_observacion/)
console.log(
  'OK: subsanaciones por jurado y ronda, dos adjuntos obligatorios y recuperación ante errores.',
)
