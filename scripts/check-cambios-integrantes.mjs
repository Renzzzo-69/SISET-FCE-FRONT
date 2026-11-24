import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { ref } from 'vue'
import ts from 'typescript'

const { descriptor } = parse(readFileSync(new URL('../src/components/HistorialCambios.vue', import.meta.url), 'utf8'))
const source = ts.transpileModule(descriptor.scriptSetup.content, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  transformers: { before: [() => file => ts.factory.updateSourceFile(file, file.statements.filter(node => !ts.isImportDeclaration(node)))] },
}).outputText.replace('export {};', '')
let cargar
let resolver
let rechazar = false
const peticiones = []
const api = {
  get: async (url, opciones) => {
    peticiones.push({ url, opciones })
    if (rechazar) throw new Error('Red no disponible')
    return new Promise((resolve) => { resolver = resolve })
  },
}
const props = { expediente: 7 }
const vista = new Function('ref', 'watch', 'defineProps', 'api', `${source}\nreturn { cambios, error };`)(ref, (_, callback) => { cargar = callback }, () => props, api)
let limpiar
let pendiente = cargar(7, undefined, (callback) => { limpiar = callback })
resolver({ data: { data: [{ id: 1, fecha_ejecucion: null }, { id: 2, fecha_ejecucion: '2026-11-23' }] } })
await pendiente
assert.deepEqual(vista.cambios.value.map((c) => c.id), [2])
assert.equal(peticiones[0].url, '/cambios-integrantes')
assert.equal(peticiones[0].opciones.params.id_expediente, 7)
pendiente = cargar(7, undefined, (callback) => { limpiar = callback })
const resolverAnterior = resolver
limpiar()
const actual = cargar(8, 7, () => {})
resolver({ data: { data: [{ id: 8, fecha_ejecucion: '2026-11-23' }] } })
await actual
resolverAnterior({ data: { data: [{ id: 7, fecha_ejecucion: '2026-11-23' }] } })
await pendiente
assert.deepEqual(vista.cambios.value.map((c) => c.id), [8], 'Una consulta anterior no debe mostrar datos de otro expediente')
rechazar = true
await cargar(8, 8, () => {})
assert.match(vista.error.value, /No se pudo cargar/)
assert.deepEqual(vista.cambios.value, [])
const rutas = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
assert.doesNotMatch(rutas, /secretaria-cambios|decanatura-cambios|CambiosIntegrantesView/)
assert.equal(existsSync(new URL('../src/views/CambiosIntegrantesView.vue', import.meta.url)), false)
console.log('OK: consulta de cambios ejecutados, errores y cambio de expediente; sin pantallas de escritura de otros roles.')
