import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { computed, ref, watch } from 'vue'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import { parse } from '@vue/compiler-sfc'
import ts from 'typescript'

function compilar(source) {
  return ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    transformers: { before: [() => file => ts.factory.updateSourceFile(file, file.statements.filter(n => !ts.isImportDeclaration(n)))] },
  }).outputText.replace('export {};', '').replaceAll('export ', '')
}
const window = new EventTarget()
const document = new EventTarget()
document.hidden = false
const timers = new Map()
let nextTimer = 0
const setTimeout = (fn, ms) => { const id = ++nextTimer; timers.set(id, { fn, ms }); return id }
const clearTimeout = id => timers.delete(id)
const recibos = new Map()
let fail = false
let nextRead
let llamadas = 0
let falloComplementos = false
let listaRecibida
const posts = []
const aviso = id => ({ id, titulo: id, texto: 'Real', categoria: 'Sistema', destino: { name: 'expedientes-detalle' }, leida: false })
const data = {
  detalle: { id_expediente: 7, cod_expediente: 'EXP-7' }, errores: [], lecturas: [],
  avisos: [aviso('historial-1'), { ...aviso('resolucion-2-vigente'), destino: { name: 'documentos' } }],
  plazos: [{ id: 1, vencimiento: '2026-12-02T23:59:59-05:00', semaforo: 'verde', cierre: null, restantes: 23 }],
}
const resumen = async (_alumno, _expediente, alCargarDetalle, lista) => {
  llamadas++
  listaRecibida = lista
  const snapshot = structuredClone(data)
  snapshot.lecturas = [...recibos.values()]
  alCargarDetalle?.({ ...snapshot, avisos: [], lecturas: [], plazos: [] })
  if (nextRead) { const esperar = nextRead; nextRead = undefined; await esperar }
  if (falloComplementos) throw Error('No se pudieron consultar las lecturas')
  return snapshot
}
const api = { post: async (url, body) => {
  posts.push({ url, body: structuredClone(body) })
  if (fail) throw Error('Red')
  for (const clave of body.claves) recibos.set(body.modulo + clave, { modulo: body.modulo, clave })
} }
const crear = new Function('computed', 'ref', 'defineStore', 'api', 'cargarResumenTesista', 'window', 'document', 'setTimeout', 'clearTimeout',
  compilar(readFileSync(new URL('../src/stores/actividadTesista.ts', import.meta.url), 'utf8')) + '; return useActividadTesistaStore;')(
  computed, ref, defineStore, api, resumen, window, document, setTimeout, clearTimeout)
setActivePinia(createPinia())
const store = crear()
store.iniciar(10, 10, null)
await store.actualizar()
assert.equal(store.conteos.notificaciones, 2)
assert.equal(store.conteos.agenda, 1)
data.plazos.push({ ...data.plazos[0], id: 2 })
await store.actualizar()
assert.equal(store.conteos.agenda, 1, 'La evaluación de varios jurados aparece como un evento')
assert.equal(store.conteos.documentos, 1)
await store.visitar('agenda')
assert.equal(store.conteos.agenda, 0)
assert.equal(store.conteos.notificaciones, 2, 'Visitar agenda no lee las notificaciones')
data.plazos[0].restantes--
await store.actualizar()
assert.equal(store.conteos.agenda, 0, 'El mero transcurso de un día no inventa novedades')
data.plazos[0].semaforo = 'amarillo'
data.plazos[1].semaforo = 'amarillo'
await store.actualizar()
assert.equal(store.conteos.agenda, 1, 'Cambiar de semáforo es una novedad real')
await store.leer(['historial-1'])
assert.equal(store.conteos.notificaciones, 1)
assert.equal(store.avisos[0].leida, true)
fail = true
await assert.rejects(store.leer(['resolucion-2-vigente']))
assert.equal(store.conteos.notificaciones, 1, 'Un error no se presenta como lectura guardada')
fail = false
// Consulta que empezó antes del guardado: no revierte una lectura que acaba de completarse.
let liberar
nextRead = new Promise(resolve => { liberar = resolve })
const consulta = store.actualizar()
await store.leer(['resolucion-2-vigente'])
liberar()
await consulta
assert.equal(store.conteos.notificaciones, 0)
data.avisos.push(aviso('historial-3'))
await store.actualizar()
assert.equal(store.conteos.notificaciones, 1, 'Una nueva actividad sigue sin leer')
store.detener()
assert.equal(store.avisos.length, 0)
assert.equal(timers.size, 0)
store.iniciar(10, 10, null)
await store.actualizar()
assert.equal(store.conteos.notificaciones, 1, 'La lectura persiste en una nueva sesión')
assert([...timers.values()].some(t => t.ms === 60000))
store.detener()
// Respuesta tardía de una cuenta cerrada: no puede restaurar datos en otra sesión.
nextRead = new Promise(resolve => { liberar = resolve })
store.iniciar(10, 10, null)
const anterior = store.actualizar()
store.detener()
liberar()
await anterior
assert.equal(store.resumen, null)

// El panel aparece antes que los complementos y todos los consumidores comparten la carga.
nextRead = new Promise(resolve => { liberar = resolve })
const llamadasIniciales = llamadas
const listaInicial = [{ id_expediente: 7 }]
store.iniciar(10, 10, null, listaInicial)
const cargaPanel = store.actualizar()
store.iniciar(10, 10, null, listaInicial)
const cargaNotificaciones = store.actualizar()
assert.equal(llamadas, llamadasIniciales + 1)
assert.equal(listaRecibida, listaInicial)
assert.equal(store.resumen.detalle.id_expediente, 7)
assert.equal(store.cargando, true)
assert.equal(store.avisos.length, 0, 'No inventa notificaciones sin conocer sus lecturas')
liberar()
await Promise.all([cargaPanel, cargaNotificaciones])
assert.equal(store.cargando, false)
store.detener()
falloComplementos = true
store.iniciar(10, 10, null)
await store.actualizar()
assert.equal(store.resumen.detalle.id_expediente, 7, 'Un fallo secundario conserva el panel principal')
assert.match(store.error, /No se pudo completar/)
falloComplementos = false
await store.actualizar()
assert.equal(store.error, '')
store.detener()

const { descriptor } = parse(readFileSync(new URL('../src/views/NotificacionesView.vue', import.meta.url), 'utf8'))
const fakeStore = { avisos: Array.from({ length: 18 }, (_, i) => aviso(`historial-${i}`)), resumen: null, cargando: false, error: '', guardando: false, leer: async () => {}, actualizar: async () => {} }
const view = new Function('computed', 'ref', 'watch', 'onMounted', 'useActividadTesistaStore',
  compilar(descriptor.scriptSetup.content) + '; return { visibles, verMas, marcarTodas, aviso, error, filtro };')(
  computed, ref, watch, () => {}, () => fakeStore)
assert.equal(view.visibles.value.length, 8)
view.verMas()
assert.equal(view.visibles.value.length, 16)
view.verMas()
assert.equal(view.visibles.value.length, 18)
fakeStore.leer = async () => { throw Error('Red') }
await view.marcarTodas()
assert.match(view.error.value, /No se pudo guardar/)
assert.equal(view.aviso.value, '')
assert(posts.every(p => !('id_usuario' in p.body)))
console.log('Actividad: lecturas persistentes, señales independientes, nuevas actividades, errores, concurrencia, sesión, actualización automática y lotes de 8 verificados.')
