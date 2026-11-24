// Ejecutar: node scripts/check-asesor-jurados.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { computed, ref } from 'vue'
import ts from 'typescript'

const { descriptor } = parse(
  readFileSync(new URL('../src/views/AsesorJuradosView.vue', import.meta.url), 'utf8'),
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
const setup = new Function(
  'computed',
  'ref',
  'onMounted',
  'api',
  `${source}\nreturn { seleccionado, jurados, tribunal, juradoPorCargo, detalle, informe, cargarAsignaciones, cargarDetalle, asesor, coasesor, errorAsesor, errorCoasesor, equipoAsesor };`,
)
const consultas = []
let fallaCoasesor = false
let idCoasesor = 21
const docente = (id) => ({
  id_docente: id,
  nombres: `Docente ${id}`,
  dni: '01234567',
  celular: '999888777',
  usuario: { correo_electronico: `d${id}@siset.test` },
})
const api = {
  get: async (url, opciones) => {
    consultas.push({ url, opciones })
    if (url === '/expedientes/7')
      return {
        data: {
          data: {
            informes: [
              { id_asesor: 20, id_coasesor: idCoasesor, es_tesis: 1, version: 1, estado: 1 },
            ],
          },
        },
      }
    if (url === '/docentes/21' && fallaCoasesor) throw Error()
    if (url.startsWith('/docentes/')) return { data: docente(Number(url.split('/').at(-1))) }
    return { data: [] }
  },
}
const view = setup(computed, ref, () => {}, api)
view.seleccionado.value = 7
const jurado = (id, expediente, version, estado, cargo = 'Presidente') => ({
  id_jurado: id,
  id_expediente: expediente,
  id_designacion: version,
  estado: 1,
  cargo,
  docente: null,
  designacion: { version, estado },
})
view.jurados.value = [
  jurado(1, 7, 1, 'anulada'),
  jurado(2, 7, 2, 'vigente'),
  jurado(3, 7, 3, 'propuesta'),
  jurado(4, 8, 4, 'vigente'),
]
assert.deepEqual(
  view.tribunal.value.map((item) => item.id_jurado),
  [2],
)
assert.equal(view.juradoPorCargo('presidente').id_jurado, 2)
assert.equal(view.juradoPorCargo('Vocal'), undefined)
view.jurados.value.push(jurado(5, 7, 5, 'vigente', 'Vocal'))
assert.deepEqual(
  view.tribunal.value.map((item) => item.id_jurado),
  [5],
  'No mezcla distintas designaciones',
)
view.jurados.value[4].estado = 0
assert.deepEqual(
  view.tribunal.value.map((item) => item.id_jurado),
  [2],
)
view.detalle.value = {
  informes: [
    { id_asesor: 10, es_tesis: 0, version: 1, estado: 1 },
    { id_asesor: 20, es_tesis: 1, version: 1, estado: 1 },
    { id_asesor: 30, es_tesis: 1, version: 2, estado: 0 },
  ],
}
assert.equal(
  view.informe.value.id_asesor,
  20,
  'Usa el informe activo más reciente de la fase final',
)
console.log('OK: expediente, vigencia, cargos y selección del asesor.')
view.detalle.value.informes[1].id_coasesor = 21
await view.cargarAsignaciones()
assert.equal(view.asesor.value.id_docente, 20)
assert.equal(view.coasesor.value.id_docente, 21)
assert.equal(view.equipoAsesor.value[1].titulo, 'Coasesor')
assert.deepEqual(consultas.find((item) => item.url === '/jurados-expediente').opciones, {
  params: { id_expediente: 7 },
})
fallaCoasesor = true
await view.cargarDetalle()
assert.equal(view.asesor.value.id_docente, 20)
assert.equal(view.coasesor.value, null)
assert.match(view.errorCoasesor.value, /coasesor/)
idCoasesor = null
consultas.length = 0
await view.cargarDetalle()
assert.equal(view.coasesor.value, null)
assert.equal(view.errorCoasesor.value, '')
assert.ok(!consultas.some((item) => item.url === '/docentes/21'))
assert.match(descriptor.template.content, /mailto:/)
assert.match(descriptor.template.content, /tel:/)
assert.match(descriptor.template.content, /docente\?\.dni/)
console.log('OK: contactos, coasesor, error parcial y limpieza de asignaciones anteriores.')
