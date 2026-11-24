import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/services/api.ts', import.meta.url), 'utf8')
  .replace("import axios from 'axios'", '')
  .replaceAll('import.meta.env.VITE_API_URL', "'http://localhost:8000/api'")
  .replaceAll('export default api', '')
  .replaceAll('export ', '')
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText

async function comprobar(disposition, mime, esperado) {
  const enlace = { click() {}, remove() {} }
  const api = {
    interceptors: { request: { use() {} }, response: { use() {} } },
    async get(url) {
      assert.equal(new URL(url).searchParams.get('download'), '1')
      return { data: new Blob(['documento'], { type: mime }), headers: { 'content-disposition': disposition } }
    },
  }
  const descargar = new Function('axios', 'window', 'document', `${compiled}; return descargarDocumentoPrivado`)(
    { create: () => api },
    { location: { origin: 'http://localhost:5173' }, setTimeout: (callback) => callback() },
    { createElement: () => enlace, body: { append() {} } },
  )
  await descargar('/api/expedientes/7/informes/1/documento', 'respaldo')
  assert.equal(enlace.download, esperado)
}

await comprobar('attachment; filename=EXP-0001-2026II_Proyecto_v1.pdf', 'application/pdf', 'EXP-0001-2026II_Proyecto_v1.pdf')
await comprobar('attachment; filename="EXP-0001-2026II_Tesis_v2.docx"', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'EXP-0001-2026II_Tesis_v2.docx')
await comprobar(undefined, 'application/pdf', 'respaldo.pdf')
await comprobar(undefined, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'respaldo.docx')
console.log('Descargas: nombre del servidor, PDF, DOCX y respaldo verificados.')
