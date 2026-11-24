import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { computed, ref } from 'vue'
import ts from 'typescript'
const { descriptor } = parse(
  readFileSync(new URL('../src/components/MiExpediente.vue', import.meta.url), 'utf8'),
)
const source = ts
  .transpileModule(descriptor.scriptSetup.content, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    transformers: {
      before: [
        () => (file) =>
          ts.factory.updateSourceFile(
            file,
            file.statements.filter((n) => !ts.isImportDeclaration(n)),
          ),
      ],
    },
  })
  .outputText.replace('export {};', '')
let coadvisor = 2
let fail = false
const helperCode = ts.transpileModule(
  readFileSync(new URL('../src/utils/udiExpedientes.ts', import.meta.url), 'utf8'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
).outputText
const { documentosSubsanadosUdi } = await import(`data:text/javascript;base64,${Buffer.from(helperCode).toString('base64')}`)
const requests = []
const api = {
  get: async (url) => {
    requests.push(url)
    if (url.endsWith('/revision-documentaria')) return { data: { data: { revision: null } } }
    if (url.startsWith('/expedientes/'))
      return {
        data: {
          data: {
            informes: [
              { id_asesor: 1, id_coasesor: coadvisor, estado: 1, es_tesis: 0, version: 1 },
            ],
          },
        },
      }
    if (url === '/jurados-expediente') return { data: [] }
    if (url === '/docentes/2' && fail) throw Error('Sin conexion')
    return { data: { nombres: url === '/docentes/1' ? 'Asesor' : 'Coasesor' } }
  },
}
const view = new Function(
  'computed',
  'ref',
  'onMounted',
  'api',
  'axios',
  'documentosSubsanadosUdi',
  'useAuthStore',
  `${source}; return { seleccionado, cargarDetalle, detalle, revision, archivos, actorHistorial, asesor, coasesor, errorEquipo };`,
)(computed, ref, () => {}, api, { isAxiosError: () => false }, documentosSubsanadosUdi, () => ({ sincronizarExpedientes() {} }))
view.seleccionado.value = 1
await view.cargarDetalle()
assert.equal(view.asesor.value.nombres, 'Asesor')
assert.equal(view.coasesor.value.nombres, 'Coasesor')
fail = true
await view.cargarDetalle()
assert.equal(view.coasesor.value, null)
assert.match(view.errorEquipo.value, /coasesor/)
coadvisor = null
requests.length = 0
await view.cargarDetalle()
assert.equal(view.coasesor.value, null)
assert.equal(requests.includes('/docentes/2'), false)
assert.equal(view.errorEquipo.value, '')
for (const [codigo, nombre] of [['udi', 'UDI'], ['secretaria_academica', 'Secretaría Académica'], ['decanatura', 'Decanatura'], ['tesista', 'Tesista']]) {
  assert.equal(view.actorHistorial({ responsable: { nombre: null, roles: [{ codigo, nombre }] } }), nombre)
}
assert.equal(view.actorHistorial({ responsable: { nombre: 'María Fernández Vásquez', roles: [{ codigo: 'tesista', nombre: 'Tesista' }] } }), 'Tesista - María Fernández Vásquez')
assert.equal(view.actorHistorial({ responsable: { nombre: 'Rosa Sandoval', roles: [{ codigo: 'docente', nombre: 'Docente' }] } }), 'Docente - Rosa Sandoval')
assert.equal(view.actorHistorial({ responsable: { nombre: 'Responsable UDI', roles: [{ codigo: 'udi', nombre: 'UDI' }] } }), 'UDI')
view.detalle.value.informes = [{ estado: 1, es_tesis: 0, version: 1, archivo_adjunto: '/original.pdf' }]
view.revision.value = { revision: { requisitos: [{ nombre: 'Proyecto de tesis', evaluacion: { observaciones: [{ subsanaciones: [
  { id_subsanacion_documentaria: 1, fecha_presentacion: '2026-10-28', archivo_adjunto: '/correccion-v2.pdf' },
  ] }] } }, { nombre: 'Datos de participantes', evaluacion: { observaciones: [{ subsanaciones: [
  { id_subsanacion_documentaria: 2, fecha_presentacion: '2026-10-29', archivo_adjunto: '/correccion-v3.pdf' },
] }] } }] } }
assert.deepEqual(view.archivos.value.map(({ nombre, ruta }) => [nombre, ruta]), [
  ['Proyecto de tesis · versión 3', '/correccion-v3.pdf'],
  ['Proyecto de tesis · versión 2', '/correccion-v2.pdf'],
  ['Proyecto de tesis · versión 1', '/original.pdf'],
])
assert.ok(!descriptor.template.content.includes('Subsanar Expediente'))
for (const field of ['dni', 'celular', 'correo_electronico'])
  assert.ok(descriptor.template.content.includes(`tesista!.${field}`))
console.log(
  'OK: contactos de ambos tesistas, coasesor, errores, cambio de expediente y encabezado.',
)
