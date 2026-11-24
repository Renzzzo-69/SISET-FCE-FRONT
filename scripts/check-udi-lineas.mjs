import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { ref, computed, watch, nextTick } from 'vue'
import ts from 'typescript'
const { descriptor } = parse(readFileSync(new URL('../src/views/UdiLineasView.vue', import.meta.url), 'utf8'))
const source = ts.transpileModule(descriptor.scriptSetup.content, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  transformers: { before: [() => file => ts.factory.updateSourceFile(file, file.statements.filter(n => !ts.isImportDeclaration(n)))] },
}).outputText.replace('export {};', '')
let falla = false
let cierres = 0
const api = {
  get: async () => ({ data: [{ id_linea_investigacion: 1, nombre: 'Economía', estado: 1 }, { id_linea_investigacion: 2, nombre: 'Finanzas', estado: 0 }] }),
  put: async (_url, data) => { if (falla) throw Error(); return { data: { data: { id_linea_investigacion: 1, ...data } } } },
  post: async (_url, data) => ({ data: { data: { id_linea_investigacion: 3, estado: 1, ...data } } }),
}
const view = new Function('ref', 'computed', 'watch', 'onMounted', 'axios', 'api', `${source}; return { cargar, lineas, busqueda, estado, filtradas, activas, abrir, guardar, nombre, dialogo, errorFormulario };`)(ref, computed, watch, () => {}, { isAxiosError: () => false }, api)
view.dialogo.value = { showModal() {}, close() { cierres++ } }
await view.cargar()
assert.equal(view.activas.value, 1)
view.busqueda.value = 'economia'
assert.equal(view.filtradas.value.length, 1)
view.estado.value = '0'
assert.equal(view.filtradas.value.length, 0)
view.abrir(view.lineas.value[0], 'estado')
await view.guardar()
assert.equal(view.lineas.value[0].estado, 0)
view.abrir(view.lineas.value[0])
view.nombre.value = 'Cambio pendiente'
falla = true
await view.guardar()
assert.ok(view.errorFormulario.value)
assert.equal(view.nombre.value, 'Cambio pendiente')
assert.equal(cierres, 1)
view.abrir()
view.nombre.value = 'Nueva línea'
await view.guardar()
assert.equal(view.lineas.value.length, 3)
await nextTick()
console.log('OK: filtros sin acentos, estados, alta y conservación del formulario ante errores.')
