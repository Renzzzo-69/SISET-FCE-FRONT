import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { computed, ref } from 'vue'
import ts from 'typescript'

function compilar(source) {
  return ts
    .transpileModule(source, {
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
    .outputText.replaceAll('export ', '')
    .replace('{};', '')
}
const consultas = []
const api = {
  get: async (url, opciones) => {
    consultas.push({ url, opciones })
    return {
      data: {
        expediente: null,
        expedientes: [],
        plazos: [],
        actualizado_en: '2026-11-10T12:00:00-05:00',
      },
    }
  },
}
const servicio = new Function(
  'api',
  compilar(readFileSync(new URL('../src/services/agendaTesista.ts', import.meta.url), 'utf8')) +
    '; return { consultarAgenda, eventosAgenda, fechaLima };',
)(api)
await servicio.consultarAgenda(7)
assert.equal(consultas.length, 1, 'La agenda no espera documentos, resoluciones ni revisiones')
assert.equal(consultas[0].url, '/agenda-academica')
assert.equal(consultas[0].opciones.params.expediente, 7)

const jurados = [11, 12, 13].map((id, i) => ({
  id,
  codigo: 'PRO-03',
  ciclo: 'jurados-1',
  nombre: 'Evaluación del proyecto',
  responsable: 'jurado',
  docente: 'Docente ' + id,
  id_docente: id,
  inicio: '2026-11-03T12:00:00-05:00',
  vencimiento: '2026-12-03T04:59:59+00:00',
  restantes: 23,
  duracion: 30,
  tipo_dias: 'calendario',
  semaforo: 'verde',
  cierre: null,
}))
let eventos = servicio.eventosAgenda(jurados)
assert.equal(eventos.length, 1, 'Una revisión de tres jurados se presenta como un proceso')
assert.equal(eventos[0].participantes.length, 3)
assert.equal(eventos[0].fecha, '2026-12-02', 'La fecha se convierte a Lima, no se toma el día UTC')
assert.equal(eventos[0].esPersonal, false)
const subsanacion = {
  ...jurados[0],
  id: 40,
  codigo: 'PRO-05',
  ciclo: 'observacion-1',
  nombre: 'Subsanar observaciones',
  responsable: 'tesista',
  id_docente: null,
  docente: null,
  vencimiento: '2026-11-21T04:59:59Z',
  semaforo: 'amarillo',
}
eventos = servicio.eventosAgenda([...jurados, subsanacion])
assert.equal(eventos[0].esPersonal, true)
assert.equal(eventos[0].fecha, '2026-11-20')
assert.equal(
  servicio.eventosAgenda([{ ...subsanacion, cierre: '2026-11-11T10:00:00-05:00' }]).length,
  0,
  'Una actuación cerrada sale de los pendientes',
)
assert.equal(
  servicio.eventosAgenda([
    ...jurados,
    { ...jurados[0], id: 99, vencimiento: '2026-12-04T04:59:59Z' },
  ]).length,
  2,
  'No agrupa fechas límite distintas',
)

const { descriptor } = parse(
  readFileSync(new URL('../src/views/AgendaView.vue', import.meta.url), 'utf8'),
)
assert.doesNotMatch(descriptor.template.content, /Actualizar plazos/)
const fixture = {
  expediente: { id: 7, codigo: 'EXP-7', etapa_codigo: 'revision_jurados_proyecto' },
  expedientes: [{ id: 7, codigo: 'EXP-7' }],
  plazos: jurados,
  actualizado_en: '2026-11-10T12:00:00-05:00',
}
let servidor = fixture
let fallo = false
let alDesmontar
let alMontar
let siguienteTimer = 0
const temporizadores = new Map()
const listeners = new Map()
const superficie = {
  addEventListener: (key, handler) => listeners.set(key, handler),
  removeEventListener: (key) => listeners.delete(key),
}
const panel = new Function(
  'ref',
  'computed',
  'watch',
  'onMounted',
  'onUnmounted',
  'axios',
  'useRoute',
  'useRouter',
  'consultarAgenda',
  'eventosAgenda',
  'fechaLima',
  'window',
  'document',
  'setTimeout',
  'clearTimeout',
  compilar(descriptor.scriptSetup.content) +
    '; return { cargar, agenda, cargando, error, eventos, mes, misPendientes, visibles };',
)(
  ref,
  computed,
  () => {},
  (fn) => {
    alMontar = fn
  },
  (fn) => {
    alDesmontar = fn
  },
  { isAxiosError: () => false },
  () => ({ query: {} }),
  () => ({ replace: () => {} }),
  async () => {
    if (fallo) throw Error('Red desconectada')
    return structuredClone(servidor)
  },
  servicio.eventosAgenda,
  servicio.fechaLima,
  superficie,
  { ...superficie, visibilityState: 'visible' },
  (fn, ms) => {
    const id = ++siguienteTimer
    temporizadores.set(id, { fn, ms })
    return id
  },
  (id) => temporizadores.delete(id),
)
assert.equal(panel.cargando.value, true)
assert.equal(panel.agenda.value, null, 'No muestra cero eventos antes de recibir los datos')
alMontar()
await Promise.resolve()
await Promise.resolve()
assert.equal(panel.eventos.value.length, 1)
assert.equal(
  panel.mes.value.getMonth(),
  11,
  'Abre diciembre si el próximo vencimiento está en diciembre',
)
assert.ok(
  [...temporizadores.values()].some((t) => t.ms === 60000),
  'Consulta automáticamente cada minuto',
)
assert.ok(listeners.has('focus') && listeners.has('online') && listeners.has('visibilitychange'))
panel.mes.value = new Date('2027-01-01T12:00:00')
servidor = { ...fixture, plazos: [...jurados, subsanacion] }
await panel.cargar()
assert.equal(
  panel.misPendientes.value.length,
  1,
  'Las nuevas observaciones generan un pendiente en la siguiente consulta',
)
assert.equal(
  panel.mes.value.getMonth(),
  0,
  'La consulta automática conserva el mes elegido por el usuario',
)
fallo = true
await panel.cargar()
assert.equal(panel.eventos.value.length, 2, 'Un fallo de red conserva las fechas ya consultadas')
assert.ok(panel.error.value)
assert.ok(
  [...temporizadores.values()].some((t) => t.ms === 5000),
  'Reintenta sin un botón de actualización',
)
alDesmontar()
assert.equal(temporizadores.size, 0)
assert.equal(listeners.size, 0, 'Al salir de la agenda se limpian eventos y consultas periódicas')
console.log(
  'Agenda: consulta propia, fechas de Lima, agrupación, pendientes, actualización automática y recuperación verificados.',
)
