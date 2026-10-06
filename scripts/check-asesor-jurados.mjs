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
  `${source}\nreturn { seleccionado, jurados, tribunal, juradoPorCargo, detalle, informe };`,
)
const view = setup(computed, ref, () => {})
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
