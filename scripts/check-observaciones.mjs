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
    data: url === '/expedientes' ? [registro] : { data: structuredClone(datos) },
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
  'computed',
  'ref',
  'onMounted',
  'useRoute',
  'useAuthStore',
  'api',
  'axios',
  'sessionStorage',
  `${source}\nreturn { cargar, enviar, puedeEnviar, validarArchivo, archivo, errorFormulario, comentarios, guardarBorrador, seleccionar, revision, expedientes, aviso };`,
)
const view = setup(
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
