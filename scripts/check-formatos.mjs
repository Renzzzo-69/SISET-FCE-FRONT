import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { computed, ref } from 'vue'
import ts from 'typescript'

const { descriptor } = parse(
  readFileSync(new URL('../src/views/FormatosView.vue', import.meta.url), 'utf8'),
)
const source = ts
  .transpileModule(descriptor.scriptSetup.content, {
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
  .outputText.replace('export {};', '')
let fallo = false
let enlace
let clicks = 0
const archivos = [
  {
    id: 1,
    nombre: 'Certificado de originalidad',
    nombre_original: 'B Certificado de originalidad.docx',
    categoria: 'Proyectos',
  },
  {
    id: 2,
    nombre: 'Informe de conformidad',
    nombre_original: 'Informe de conformidad proy. investi.docx',
    categoria: 'Proyectos',
  },
  {
    id: 3,
    nombre: 'Propuesta de jurado',
    nombre_original: 'Propuesta de Jurado.docx',
    categoria: 'Jurados',
  },
].map((item) => ({
  ...item,
  version: '1.0',
  tipo_archivo: 'docx',
  descarga: `/api/formatos-oficiales/${item.id}/descargar`,
}))
const api = {
  get: async (ruta, config) => {
    if (fallo) throw Error('No disponible')
    if (ruta === '/formatos-oficiales') return { data: { formatos: archivos } }
    assert.equal(config.responseType, 'blob')
    assert.equal(ruta, '/formatos-oficiales/3/descargar')
    return { data: new Blob(['word']) }
  },
}
const view = new Function(
  'ref',
  'computed',
  'onMounted',
  'api',
  'document',
  'window',
  `${source}; return { cargar, descargar, categorias, categoria, busqueda, visibles, limpiar, error, errorDescarga, descargando, cargando };`,
)(
  ref,
  computed,
  () => {},
  api,
  {
    createElement: () =>
      (enlace = {
        click() {
          clicks++
        },
        remove() {},
      }),
    body: { append() {} },
  },
  { setTimeout: (fn) => fn() },
)
await view.cargar()
assert.deepEqual(view.categorias.value, ['Todos', 'Proyectos', 'Jurados'])
assert.equal(view.visibles.value.length, 3)
view.categoria.value = 'Jurados'
assert.equal(view.visibles.value.length, 1)
view.limpiar()
view.busqueda.value = 'originalidad'
assert.equal(view.visibles.value[0].id, 1)
view.limpiar()
await view.descargar(archivos[2])
assert.equal(enlace.download, 'Propuesta de Jurado.docx')
assert.equal(clicks, 1)
assert.equal(view.descargando.value, null)
fallo = true
await view.descargar(archivos[2])
assert.ok(view.errorDescarga.value)
assert.equal(clicks, 1)
await view.cargar()
assert.ok(view.error.value)
assert.equal(view.cargando.value, false)
assert.doesNotMatch(descriptor.template.content, /picture_as_pdf|Catálogo de referencia/)
console.log(
  'Formatos: catálogo real, categorías, búsqueda, nombres originales y errores verificados.',
)
