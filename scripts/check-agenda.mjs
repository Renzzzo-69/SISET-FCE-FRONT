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
  'useRoute',
  'useRouter',
  'watch',
  'onMounted',
  'onUnmounted',
  'fechaLima',
  'eventosAgenda',
  `${source}\nreturn { agenda, mes, dias, cambiarMes, fechaSeleccionada, tipo, alcance, visibles, limpiar };`,
)
const view = setup(computed, ref, () => ({ query: {} }), () => ({}), () => {}, () => {}, () => {}, () => '2024-10-01', (plazos) => plazos)
view.agenda.value = { plazos: [
  { fecha: '2024-10-28', titulo: 'Límite de subsanación', tipo: 'Subsanación', esPersonal: true },
  { fecha: '2024-10-29', titulo: 'Evaluación de jurados', tipo: 'Evaluación', esPersonal: false },
  { fecha: '2024-10-30', titulo: 'Remisión de documentos', tipo: 'Trámite', esPersonal: false },
] }
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
view.alcance.value = 'mios'
assert.equal(view.visibles.value.length, 1)
view.limpiar()
assert.equal(view.alcance.value, 'todos')
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
