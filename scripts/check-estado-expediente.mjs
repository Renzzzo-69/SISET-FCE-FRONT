import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ref, computed } from 'vue'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import ts from 'typescript'

const source = ts.transpileModule(readFileSync(new URL('../src/stores/auth.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  transformers: { before: [() => file => ts.factory.updateSourceFile(file, file.statements.filter(node => !ts.isImportDeclaration(node)))] },
}).outputText.replaceAll('export ', '')
const localStorage = { getItem: () => null, removeItem() {} }
let consulta = async () => { throw new Error('Sin conexión') }
const api = { get: () => consulta() }
const useAuthStore = new Function('ref', 'computed', 'defineStore', 'localStorage', 'api', 'AUTH_TOKEN_KEY', 'setUnauthorizedHandler', `${source}; return useAuthStore;`)(ref, computed, defineStore, localStorage, api, 'token', () => {})
setActivePinia(createPinia())
const auth = useAuthStore()
auth.usuario = { id_usuario: 1, alumno: { id_alumno: 10 }, roles: [] }
await auth.actualizarExpediente()
assert.equal(auth.tieneExpediente, null)
assert.ok(auth.errorExpediente)

const expediente = { id_expediente: 7, id_tesista: '10', id_co_tesista: null }
auth.sincronizarExpedientes([expediente])
assert.equal(auth.tieneExpediente, true)
assert.equal(auth.errorExpediente, '')
assert.equal(auth.moduloTesistaDisponible('expedientes'), true)
assert.equal(auth.moduloTesistaDisponible('expedientes-nuevo'), false)

await auth.actualizarExpediente()
assert.equal(auth.tieneExpediente, true, 'Un fallo temporal conserva el expediente comprobado')
assert.ok(auth.errorExpediente)

for (const falla of [true, false]) {
  let completar
  consulta = () => new Promise((resolve, reject) => {
    completar = () => falla ? reject(new Error('Petición antigua')) : resolve({ data: [] })
  })
  const pendiente = auth.actualizarExpediente()
  auth.sincronizarExpedientes([expediente])
  completar()
  await pendiente
  assert.equal(auth.tieneExpediente, true)
  assert.equal(auth.errorExpediente, '')
}

auth.limpiarSesion()
assert.equal(auth.tieneExpediente, null)
assert.deepEqual(auth.expedientes, [])
auth.usuario = { id_usuario: 2, alumno: { id_alumno: 20 }, roles: [] }
auth.sincronizarExpedientes([expediente])
assert.equal(auth.tieneExpediente, false, 'El expediente de otro alumno no habilita módulos')
auth.sincronizarExpedientes([{ ...expediente, id_co_tesista: '20' }])
assert.equal(auth.tieneExpediente, true)
console.log('OK: menú y expediente sincronizados; fallos y respuestas antiguas no ocultan el expediente confirmado.')
