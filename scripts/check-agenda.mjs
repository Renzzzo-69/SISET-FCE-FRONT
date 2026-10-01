// Ejecutar: node scripts/check-agenda.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { computed, ref } from 'vue'
import ts from 'typescript'

const { descriptor } = parse(
  readFileSync(new URL('../src/views/AgendaView.vue', import.meta.url), 'utf8'),
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
  `${source}\nreturn { mes, dias, cambiarMes, fechaSeleccionada, tipo, visibles, limpiar };`,
)
const view = setup(computed, ref)
assert.equal(view.dias.value.length, 35)
assert.equal(view.dias.value[0].clave, '2024-09-30', 'La semana empieza en lunes')
assert.equal(view.dias.value.at(-1).clave, '2024-11-03')
assert.equal(view.visibles.value.length, 3)
view.fechaSeleccionada.value = '2024-10-28'
assert.equal(view.visibles.value[0].titulo, 'Límite de subsanación')
view.tipo.value = 'Evaluación'
assert.equal(view.visibles.value.length, 0)
view.limpiar()
assert.equal(view.visibles.value.length, 3)
view.mes.value = new Date(2024, 1, 1)
assert.equal(view.dias.value.filter((dia) => !dia.fuera).length, 29)
view.mes.value = new Date(2024, 11, 1)
view.cambiarMes(1)
assert.equal(view.mes.value.getFullYear(), 2025)
assert.equal(view.mes.value.getMonth(), 0)
view.cambiarMes(-1)
assert.equal(view.mes.value.getFullYear(), 2024)
assert.equal(view.mes.value.getMonth(), 11)
console.log('OK: calendario semanal, año bisiesto, cambio de año y filtros combinados.')
