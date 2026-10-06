// Ejecutar: node scripts/check-documentos.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { computed, ref, watch, nextTick } from 'vue'
import ts from 'typescript'

const { descriptor } = parse(
  readFileSync(new URL('../src/views/DocumentosView.vue', import.meta.url), 'utf8'),
)
const source = ts
  .transpileModule(
    descriptor.scriptSetup.content.replace(
      'import.meta.env.VITE_API_URL',
      "'http://localhost/api'",
    ),
    {
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
    },
  )
  .outputText.replace('export {};', '')
const requests = []
const api = {
  get: async (url, config) => {
    requests.push({ url, config })
    return {
      data: {
        data: [
          { id_expediente: 7, id_resolucion: 1 },
          { id_expediente: 8, id_resolucion: 2 },
        ],
      },
    }
  },
}
const setup = new Function(
  'computed',
  'ref',
  'watch',
  'onMounted',
  'onBeforeUnmount',
  'useAuthStore',
  'useRoute',
  'api',
  `${source}\nreturn { detalle, documentos, filtrados, visibles, paginas, pagina, tipo, estado, limpiar, seleccionado, cargarResoluciones, resoluciones, puedeCrear, abrirArchivo, errorArchivo };`,
)
const view = setup(
  computed,
  ref,
  watch,
  () => {},
  () => {},
  () => ({ usuario: { alumno: { id_alumno: 5 } }, tieneRol: () => true }),
  () => ({ query: {} }),
  api,
)
view.detalle.value = {
  id_expediente: 7,
  cod_expediente: 'EXP-7',
  tesista_1: { id_alumno: 5 },
  version: 1,
  estado: 1,
  solicitud_adjunta: '/solicitud',
  informes: Array.from({ length: 6 }, (_, i) => ({
    es_tesis: i === 5 ? 1 : 0,
    version: i + 1,
    estado: i === 5 ? 1 : 0,
    archivo_adjunto: `/archivo/${i}`,
    carta_aceptacion_asesor: null,
  })),
}
assert.equal(view.puedeCrear.value, true)
assert.equal(view.documentos.value.length, 7)
assert.equal(view.paginas.value, 2)
view.pagina.value = 2
assert.equal(view.visibles.value.length, 2)
view.tipo.value = 'tesis'
await nextTick()
assert.equal(view.pagina.value, 1)
assert.equal(view.filtrados.value.length, 1)
view.estado.value = 'inactivo'
assert.equal(view.filtrados.value.length, 0)
view.limpiar()
assert.equal(view.filtrados.value.length, 7)
view.seleccionado.value = 7
await view.cargarResoluciones()
assert.equal(requests[0].config.params.id_expediente, 7)
assert.deepEqual(
  view.resoluciones.value.map((item) => item.id_resolucion),
  [1],
)
view.detalle.value.tesista_1.id_alumno = 99
assert.equal(view.puedeCrear.value, false)
globalThis.window = { location: { origin: 'http://localhost' } }
await view.abrirArchivo('https://example.com/archivo.pdf', 'externo')
assert.equal(requests.length, 1, 'No se envían credenciales a otro origen')
assert.ok(view.errorArchivo.value)
delete globalThis.window
console.log('OK: filtros, paginación, permisos, resoluciones por expediente y origen de archivos.')
