import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
let guard
let consultas = 0
const auth = {
  inicializado: true,
  autenticado: true,
  tieneExpediente: null,
  tieneRol: (...roles) => roles.includes('tesista'),
  actualizarExpediente: async () => {
    consultas++
    auth.tieneExpediente = true
  },
  moduloTesistaDisponible: () => true,
}
new Function('router', 'useAuthStore',
  source.slice(source.indexOf('router.beforeEach('), source.indexOf('export default router')),
)({ beforeEach: (callback) => { guard = callback } }, () => auth)

const navegar = (name) => guard({ name, meta: { requiereAutenticacion: true } })
assert.equal(await navegar('dashboard'), true)
assert.equal(consultas, 1, 'La primera entrada comprueba el expediente')
// Un servidor que no responde no debe bloquear las siguientes navegaciones.
auth.actualizarExpediente = () => { throw new Error('Consulta innecesaria al navegar') }
for (const tieneExpediente of [true, false]) {
  auth.tieneExpediente = tieneExpediente
  for (const ruta of ['perfil', 'formatos', 'dashboard']) {
    assert.equal(await navegar(ruta), true)
  }
}
console.log('OK: una consulta inicial; navegación posterior sin esperar al servidor.')
