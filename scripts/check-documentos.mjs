import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { computed, ref, watch } from 'vue'
import ts from 'typescript'

const { descriptor } = parse(
  readFileSync(new URL('../src/views/DocumentosView.vue', import.meta.url), 'utf8'),
)
const source = ts
  .transpileModule(
    descriptor.scriptSetup.content.replaceAll(
      'import.meta.env.VITE_API_URL',
      "'http://localhost:8000/api'",
    ),
    {
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
    },
  )
  .outputText.replace('export {};', '')
const calls = []
let failLibrary = false
let archivo = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
let errorArchivo = null
const descargas = []
const biblioteca = [
  'solicitud',
  'proyecto',
  'subsanacion',
  'subsanacion',
  'conformidad',
  'turnitin',
  'propuesta',
  'resolucion',
].map((tipo, index) => ({
  id: `archivo-${index}`,
  nombre: `Documento ${index}`,
  tipo,
  formato: index % 2 === 0 ? 'docx' : 'pdf',
  version: 1,
  ruta: `/api/expedientes/7/documentos/biblioteca/archivo-${index}`,
  activo: index !== 7,
  fecha: index === 0 ? null : `2026-10-${String(index + 10).padStart(2, '0')}`,
  responsable: null,
}))
const api = {
  get: async (url) => {
    calls.push(url)
    if (url.startsWith('http://localhost:8000/api/')) {
      if (errorArchivo) throw errorArchivo
      return { data: archivo }
    }
    if (url === '/expedientes') return { data: [{ id_expediente: 7 }] }
    if (url === '/expedientes/7') return { data: { data: { id_expediente: 7, informes: [] } } }
    if (url === '/expedientes/7/documentos') {
      if (failLibrary) throw Error('fallo')
      return { data: { data: biblioteca } }
    }
    if (url === '/resoluciones')
      return {
        data: {
          data: [
            {
              id_resolucion: 5,
              id_expediente: 7,
              archivo_pdf:
                'https://bucket.r2.cloudflarestorage.com/public/resoluciones/2026/documento.pdf',
            },
          ],
        },
      }
    throw Error(`Petición inesperada: ${url}`)
  },
}
const view = new Function(
  'ref',
  'computed',
  'watch',
  'onMounted',
  'onBeforeUnmount',
  'useRoute',
  'api',
  'axios',
  'window',
  'document',
  'descargarDocumentoPrivado',
  `${source}; return { cargar, cargarDetalle, documentos, resoluciones, cargarResoluciones, filtrados, visibles, paginas, pagina, tipo, estado, orden, limpiar, error, cargando, abrirArchivo, visor, vista, cerrarVista, errorArchivo, ocupado };`,
)(
  ref,
  computed,
  watch,
  () => {},
  () => {},
  () => ({ query: {} }),
  api,
  { isAxiosError: (error) => Boolean(error?.response) },
  { location: { origin: 'http://localhost:5173' } },
  { createElement: () => ({ innerHTML: '' }) },
  async (...args) => descargas.push(args),
)
await view.cargar()
assert.ok(calls.includes('/expedientes/7/documentos'))
assert.equal(view.documentos.value.length, 8)
assert.equal(view.visibles.value.length, 5)
assert.equal(view.paginas.value, 2)
assert.equal(view.orden.value, 'recientes')
assert.equal(view.visibles.value[0].id, 'archivo-7')
assert.equal(view.filtrados.value.at(-1).id, 'archivo-0')
view.tipo.value = 'subsanacion'
assert.equal(view.filtrados.value.length, 2)
view.tipo.value = 'resolucion'
view.estado.value = 'inactivo'
assert.equal(view.filtrados.value.length, 1)
view.limpiar()
assert.equal(view.filtrados.value.length, 8)
view.orden.value = 'recientes'
assert.equal(view.filtrados.value[0].id, 'archivo-7')
assert.equal(view.filtrados.value.at(-1).id, 'archivo-0')
view.orden.value = 'antiguos'
assert.equal(view.filtrados.value[0].id, 'archivo-1')
view.limpiar()
assert.equal(view.orden.value, 'recientes')
assert.equal(view.filtrados.value[0].id, 'archivo-7')
view.orden.value = 'tramite'
assert.equal(view.filtrados.value[0].id, 'archivo-0')
view.documentos.value.push({
  id: 'resolucion-5',
  formato: 'pdf',
  ruta: '/api/expedientes/7/documentos/biblioteca/resolucion-5',
})
await view.cargarResoluciones()
assert.equal(
  view.resoluciones.value[0].archivo_pdf,
  '/api/expedientes/7/documentos/biblioteca/resolucion-5',
)
failLibrary = true
await view.cargarDetalle()
assert.equal(view.documentos.value.length, 0)
assert.ok(view.error.value)
assert.equal(view.cargando.value, false)
let modal = false
view.visor.value = {
  showModal: () => {
    modal = true
  },
  close: () => {
    modal = false
  },
}
const ruta = '/api/expedientes/7/documentos/biblioteca/informe-6'
await view.abrirArchivo(ruta, 'Informe')
assert.ok(modal)
assert.match(view.vista.value.url, /^blob:/)
assert.equal(descargas.length, 0)
view.cerrarVista()
assert.equal(modal, false)
assert.equal(view.vista.value, null)
archivo = new Blob(['Word'], {
  type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
})
await view.abrirArchivo(ruta, 'Word')
assert.equal(modal, false)
assert.equal(view.vista.value, null)
assert.match(view.errorArchivo.value, /No se pudo abrir/)
assert.equal(descargas.length, 0)
view.cerrarVista()
await view.abrirArchivo(ruta, 'Word', true)
assert.equal(descargas.length, 1)
assert.equal(modal, false)
errorArchivo = {
  response: {
    status: 503,
    data: new Blob([JSON.stringify({ message: 'Base de datos no disponible.' })], {
      type: 'application/json',
    }),
  },
}
await view.abrirArchivo(ruta, 'Informe')
assert.equal(view.errorArchivo.value, 'Base de datos no disponible.')
assert.equal(view.ocupado.value, false)
errorArchivo.response.data = new Blob(['JSON incompleto'], { type: 'application/json' })
await view.abrirArchivo(ruta, 'Informe')
assert.match(view.errorArchivo.value, /No se pudo abrir/)
assert.equal(modal, false)
assert.match(descriptor.template.content, /<th>Formato<\/th>/)
assert.match(descriptor.template.content, /item.formato\?\.toUpperCase\(\)/)
assert.match(
  descriptor.template.content,
  /<button\s+v-if="item.formato === 'pdf'"[^>]*title="Previsualizar documento"/,
)
assert.match(descriptor.template.content, /colspan="6"/)
assert.doesNotMatch(descriptor.template.content, /upload_file|Nuevo\s+Documento/)
console.log(
  'Biblioteca: fuentes completas, subsanaciones, filtros, paginación y errores verificados.',
)
