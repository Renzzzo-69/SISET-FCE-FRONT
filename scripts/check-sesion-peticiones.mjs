import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import axios from 'axios'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const source = ts.transpileModule(
  readFileSync(new URL('../src/services/api.ts', import.meta.url), 'utf8')
    .replaceAll('import.meta.env.VITE_API_URL', "'http://localhost/api'"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
).outputText.replace(/^import .*$/gm, '').replaceAll('export ', '').replace('default api;', '')
const valores = new Map()
const localStorage = { getItem: key => valores.get(key) ?? null, removeItem: key => valores.delete(key) }
const { api, setUnauthorizedHandler } = new Function('axios', 'localStorage', `${source}; return { api, setUnauthorizedHandler };`)(axios, localStorage)
let cierres = 0
setUnauthorizedHandler(() => cierres++)

async function fallo401(tokenInicio, tokenActual) {
  valores.clear()
  if (tokenInicio) valores.set('token', tokenInicio)
  let rechazar
  const iniciada = new Promise(resolve => {
    api.defaults.adapter = config => new Promise((_resolve, reject) => {
      rechazar = () => reject(new axios.AxiosError('Sesión inválida', 'ERR_BAD_REQUEST', config, null, { status: 401, config }))
      resolve()
    })
  })
  const respuesta = api.get('/prueba').catch(error => error)
  await iniciada
  if (tokenActual) valores.set('token', tokenActual)
  else valores.delete('token')
  rechazar()
  assert.equal((await respuesta).response.status, 401)
}

await fallo401('sesion-anterior', 'sesion-nueva')
assert.equal(valores.get('token'), 'sesion-nueva')
assert.equal(cierres, 0)
await fallo401('sesion-actual', 'sesion-actual')
assert.equal(valores.has('token'), false)
assert.equal(cierres, 1)
await fallo401(null, 'sesion-nueva')
assert.equal(valores.get('token'), 'sesion-nueva')
assert.equal(cierres, 1)

for (const vista of ['CrearExpedienteView', 'UdiExpedientesView']) {
  const { descriptor } = parse(readFileSync(new URL(`../src/views/${vista}.vue`, import.meta.url), 'utf8'))
  const pattern = descriptor.template.content.match(/pattern="([^"]*[A-Za-z][^"]*)"/)[1]
  const regexp = new RegExp(`^(?:${pattern})$`, 'v')
  assert.equal(regexp.test('EXP-2026-II-999'), true)
  assert.equal(regexp.test('EXP/999'), false)
}
console.log('OK: los 401 antiguos conservan la sesión nueva y los códigos son válidos con el patrón HTML actual.')
