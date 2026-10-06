// Ejecutar: node scripts/check-tesis-final.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { computed, ref } from 'vue'
import ts from 'typescript'

const { descriptor } = parse(
  readFileSync(new URL('../src/views/TesisFinalView.vue', import.meta.url), 'utf8'),
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
const rutas = []
const setup = new Function(
  'computed',
  'ref',
  'onMounted',
  'useAuthStore',
  'useRouter',
  `${source}\nreturn { detalle, puedeRegistrar, registrar };`,
)
const view = setup(
  computed,
  ref,
  () => {},
  () => ({ usuario: { alumno: { id_alumno: 5 } }, tieneRol: () => true }),
  () => ({ push: (ruta) => rutas.push(ruta) }),
)
view.registrar()
assert.equal(rutas.length, 0)
view.detalle.value = {
  id_expediente: 7,
  etapa_actual: { codigo: 'fase_tesis_informe_final' },
  estado_actual: { codigo: 'fase_tesis_habilitada' },
  tesista_1: { id_alumno: 5 },
  informes: [{ es_tesis: 0 }],
}
assert.equal(view.puedeRegistrar.value, true)
view.registrar()
assert.deepEqual(rutas[0], {
  name: 'expedientes-detalle',
  params: { id: 7 },
  query: { registrar: 'tesis-final' },
  hash: '#informes',
})
view.detalle.value.estado_actual.codigo = 'en_revision'
assert.equal(view.puedeRegistrar.value, false)
view.registrar()
assert.equal(rutas.length, 1, 'La fase bloqueada no navega al formulario')
view.detalle.value.estado_actual.codigo = 'fase_tesis_habilitada'
view.detalle.value.tesista_1.id_alumno = 99
assert.equal(view.puedeRegistrar.value, false, 'Un tesista ajeno no puede registrar')
view.detalle.value.tesista_2 = { id_alumno: 5 }
assert.equal(view.puedeRegistrar.value, true, 'El segundo tesista puede registrar')
view.detalle.value.informes = []
assert.equal(view.puedeRegistrar.value, false, 'El registro requiere un proyecto previo')
console.log('OK: habilitación, titularidad y acceso al registro de tesis final.')
