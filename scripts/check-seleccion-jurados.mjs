import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { computed, ref } from 'vue'
import ts from 'typescript'

const { descriptor } = parse(readFileSync(new URL('../src/views/decanatura/AsignacionIndividualJurados.vue', import.meta.url), 'utf8'))
const source = ts.transpileModule(descriptor.scriptSetup.content, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  transformers: { before: [() => file => ts.factory.updateSourceFile(file, file.statements.filter(node => !ts.isImportDeclaration(node)))] },
}).outputText.replace('export {};', '')
let destino
const ruta = { name: 'udi-jurados-propuesta' }
const view = new Function('computed', 'ref', 'onMounted', 'useRoute', 'useRouter', `${source}\nreturn { seleccionados, docentes, aviso, cargoOcupado, alternarDocente, validarSeleccion, seleccionBloqueada, cambiarSeleccion, cancelar, cargando, guardando, archivoPropuesta };`)(computed, ref, () => {}, () => ruta, () => ({ push: async valor => { destino = valor } }))
view.docentes.value = [
  { id: 1, misma_escuela: true },
  { id: 2, misma_escuela: false },
  { id: 3, misma_escuela: false },
]
view.seleccionados.value = { 1: 'Presidente', 2: 'Secretario', 3: 'Vocal' }
view.cargando.value = false
const cuarto = { id: 4, no_seleccionable: false }
assert.equal(view.seleccionBloqueada(cuarto), true)
assert.equal(view.seleccionBloqueada(view.docentes.value[0]), false)
const casilla = { checked: true }
view.cambiarSeleccion(cuarto, { target: casilla })
assert.equal(casilla.checked, false)
assert.equal(Object.keys(view.seleccionados.value).length, 3)
view.alternarDocente(view.docentes.value[0], true)
assert.equal(view.seleccionados.value[1], 'Presidente')
assert.equal(view.cargoOcupado('Presidente', 2), true)
assert.equal(view.cargoOcupado('Presidente', 1), false)
await view.validarSeleccion()
assert.match(view.aviso.value, /al menos dos docentes de la misma escuela del tesista/)
view.docentes.value[1].misma_escuela = true
await view.validarSeleccion()
assert.match(view.aviso.value, /Adjunte el documento PDF/)
view.alternarDocente(view.docentes.value[0], false)
assert.equal(view.seleccionBloqueada(cuarto), false)
assert.equal(view.cargoOcupado('Presidente', 2), false)
view.seleccionados.value[2] = 'Presidente'
assert.equal(view.cargoOcupado('Secretario', 3), false)
const template = descriptor.template.content
assert.match(template, /<thead><tr[^>]*><th[^>]*>Acción<\/th>/)
assert.match(template, /:disabled="cargoOcupado\(rol, docente.id\)"/)
assert.match(template, /v-if="aviso" role="alert"/)
assert.match(template, /:disabled="seleccionBloqueada\(docente\)"/)
assert.match(template, /@click="cancelar"/)
view.archivoPropuesta.value = new File(['pdf'], 'propuesta.pdf')
await view.cancelar()
assert.deepEqual(destino, { name: 'udi-jurados' })
assert.deepEqual(view.seleccionados.value, {})
assert.equal(view.archivoPropuesta.value, null)
assert.equal(view.aviso.value, '')
// Al compartir la vista, Decanatura vuelve a su propio listado.
const vistaDecanatura = new Function('computed', 'ref', 'onMounted', 'useRoute', 'useRouter', `${source}\nreturn { cancelar };`)(computed, ref, () => {}, () => ({ name: 'decanatura-asignacion-individual' }), () => ({ push: async valor => { destino = valor } }))
await vistaDecanatura.cancelar()
assert.deepEqual(destino, { name: 'decanatura-asignacion' })
console.log('OK: máximo tres casillas, cargos, liberación de selección y cancelación en UDI y Decanatura.')
