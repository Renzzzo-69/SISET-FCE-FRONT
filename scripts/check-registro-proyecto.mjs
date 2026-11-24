import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { ref, reactive, computed, watch } from 'vue'
import ts from 'typescript'

const { descriptor } = parse(
  readFileSync(new URL('../src/views/CrearExpedienteView.vue', import.meta.url), 'utf8'),
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
let fail = true
let sent
const auth = { tieneRol: () => true, usuario: { alumno: { id_alumno: 7 } }, expedientes: [], sincronizarExpedientes: (data) => { auth.expedientes = data } }
const api = {
  get: async () => {
    if (fail) throw new Error('Sin conexión')
    return {
      data: [
        { id_alumno: 8, nombres: 'Ana', apellido_paterno: 'Pérez', apellido_materno: 'López' },
      ],
    }
  },
  post: async (_url, data) => {
    sent = data
    return { data: { id_expediente: 70, id_tesista: 7 } }
  },
}
const view = new Function(
  'ref',
  'reactive',
  'computed',
  'watch',
  'onMounted',
  'useAuthStore',
  'useRouter',
  'api',
  'axios',
  `${source}; return { formulario, catalogos, sublineasDisponibles, actualizarLinea, cargarCandidatos, candidatos, mensajeCandidatos, incluirCoTesista, confirmaciones, registrarExpediente, errores, coasesoresDisponibles, asesoresDisponibles, incluirCoasesor, camposVisitados };`,
)(
  ref,
  reactive,
  computed,
  watch,
  () => {},
  () => auth,
  () => ({ push: async () => {} }),
  api,
  { isAxiosError: () => false },
)
assert.equal(view.errores.value.titulo, undefined)
view.formulario.titulo = Array(31).fill('palabra').join(' ')
assert.ok(view.errores.value.titulo)
view.formulario.titulo = 'Titulo valido'
assert.equal(view.errores.value.titulo, undefined)
view.camposVisitados.resumen = true
assert.ok(view.errores.value.resumen)
view.formulario.resumen = 'Resumen valido'
assert.equal(view.errores.value.resumen, undefined)
await view.cargarCandidatos()
assert.ok(view.mensajeCandidatos.value)
fail = false
await view.cargarCandidatos()
assert.equal(view.candidatos.value[0].id_alumno, 8)
assert.equal(view.mensajeCandidatos.value, '')
view.catalogos.value = {
  areas: [{ id_area_investigacion: 1 }],
  docentes: [{ id_docente: 1, puede_asesorar: true }],
  lineas: [{ id_linea_investigacion: 1 }, { id_linea_investigacion: 2 }],
  sublineas: [
    { id_sublinea_investigacion: 3, id_linea_investigacion: 1 },
    { id_sublinea_investigacion: 4, id_linea_investigacion: 2 },
  ],
}
view.formulario.id_linea_investigacion = 1
assert.deepEqual(
  view.sublineasDisponibles.value.map((s) => s.id_sublinea_investigacion),
  [3],
)
view.formulario.id_sublinea_investigacion = 3
view.formulario.id_linea_investigacion = 2
view.actualizarLinea()
assert.equal(view.formulario.id_sublinea_investigacion, null)
const pdf = new File(['%PDF-1.4'], 'prueba.pdf', { type: 'application/pdf' })
Object.assign(view.formulario, {
  cod_expediente: 'EXP-TEST',
  id_co_tesista: 8,
  id_area_investigacion: 1,
  id_sublinea_investigacion: 4,
  id_asesor: 1,
  titulo: 'Proyecto de prueba',
  resumen: 'Resumen',
  solicitud_adjunta: pdf,
  proyecto_adjunto: pdf,
})
view.incluirCoTesista.value = true
Object.assign(view.confirmaciones, { normativas: true, documentos: true })
await view.registrarExpediente()
assert.deepEqual(view.errores.value, {})
assert.equal(sent.get('id_tesista'), '7')
assert.equal(sent.get('id_co_tesista'), '8')
assert.equal(sent.get('id_linea_investigacion'), '2')
assert.equal(sent.get('id_sublinea_investigacion'), '4')
assert.equal(sent.has('carta_aceptacion_asesor'), false)
console.log('OK: candidatos y reintento, línea/sublínea, ambos tesistas y envío sin carta.')

view.catalogos.value.docentes.push({ id_docente: 2, puede_asesorar: false })
assert.deepEqual(
  view.asesoresDisponibles.value.map((d) => d.id_docente),
  [1],
)
view.incluirCoasesor.value = true
view.formulario.id_coasesor = 2
assert.deepEqual(
  view.coasesoresDisponibles.value.map((d) => d.id_docente),
  [2],
)
await view.registrarExpediente()
assert.deepEqual(view.errores.value, {})
assert.equal(sent.get('id_coasesor'), '2')
view.formulario.id_asesor = 2
assert.ok(view.errores.value.id_asesor)
assert.equal(view.formulario.id_coasesor, null)
assert.deepEqual(
  view.coasesoresDisponibles.value.map((d) => d.id_docente),
  [1],
)
view.formulario.titulo = Array(21).fill('palabra').join(' ')
assert.ok(view.errores.value.titulo)
view.formulario.titulo = 'Titulo valido'
assert.equal(view.errores.value.titulo, undefined)
view.formulario.resumen = ''
assert.ok(view.errores.value.resumen)
view.formulario.resumen = 'Resumen corregido'
assert.equal(view.errores.value.resumen, undefined)
view.formulario.proyecto_adjunto = new File(['x'], 'archivo.exe', {
  type: 'application/octet-stream',
})
assert.ok(view.errores.value.proyecto_adjunto)
view.formulario.id_co_tesista = 999
assert.ok(view.errores.value.id_co_tesista)
sent = null
await view.registrarExpediente()
assert.equal(sent, null)
assert.ok(view.errores.value.id_coasesor)
console.log(
  'OK: errores reactivos, archivos invalidos, candidato inexistente y asesor/coasesor distintos.',
)
