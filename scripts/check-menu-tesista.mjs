import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { computed, ref } from 'vue'
import ts from 'typescript'

const source = ts.transpileModule(
  readFileSync(new URL('../src/stores/auth.ts', import.meta.url), 'utf8'),
  {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    transformers: { before: [() => (file) => ts.factory.updateSourceFile(file,
      file.statements.filter((node) => !ts.isImportDeclaration(node)))] },
  },
).outputText.replace('export const useAuthStore', 'const useAuthStore')
let expedientes = []
let fallo = false
const api = { get: async () => {
  if (fallo) throw new Error('Sin conexión')
  return { data: expedientes }
} }
const auth = new Function('computed', 'ref', 'defineStore', 'api', 'AUTH_TOKEN_KEY',
  'setUnauthorizedHandler', 'localStorage', `${source}; return useAuthStore();`)(
  computed, ref, (_name, setup) => setup, api, 'token', () => {},
  { getItem: () => null, removeItem: () => {} },
)
auth.usuario.value = { alumno: { id_alumno: 7 }, roles: [] }
const modulos = ['dashboard', 'expedientes-nuevo', 'expedientes', 'observaciones',
  'tesis-final', 'documentos', 'formatos', 'asesor-jurados', 'agenda', 'notificaciones', 'perfil']
const visibles = () => modulos.filter(auth.moduloTesistaDisponible)
await auth.actualizarExpediente()
assert.deepEqual(visibles(), ['expedientes-nuevo', 'formatos', 'perfil'])
for (const participantes of [
  { id_tesista: 7, id_co_tesista: null },
  { id_tesista: 12, id_co_tesista: 7 },
]) {
  expedientes = [participantes]
  await auth.actualizarExpediente()
  assert.deepEqual(visibles(), modulos.filter((nombre) => nombre !== 'expedientes-nuevo'))
}
expedientes = [{ id_tesista: 12, id_co_tesista: 13 }]
await auth.actualizarExpediente()
assert.equal(auth.tieneExpediente.value, false)
fallo = true
await auth.actualizarExpediente()
assert.deepEqual(visibles(), ['formatos', 'perfil'])
assert.ok(auth.errorExpediente.value)
fallo = false
await auth.actualizarExpediente()
assert.equal(auth.errorExpediente.value, '')
auth.limpiarSesion()
assert.equal(auth.tieneExpediente.value, null)
console.log('OK: menú inicial, ambos tesistas, expedientes ajenos, error, recuperación y cierre de sesión.')
