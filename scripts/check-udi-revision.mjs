import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import { computed, reactive, ref } from 'vue'

const source = readFileSync(new URL('../src/views/UdiRevisionView.vue', import.meta.url), 'utf8')
const { descriptor } = parse(source)
const template = descriptor.template?.content ?? ''

assert.doesNotMatch(template, /legacy-view|expediente-overview|workspace-card|Recepci?n de expediente/)
assert.doesNotMatch(template, /@change="guardarEvaluacion\(requisito\)"/)
assert.doesNotMatch(template, /Guardar porcentaje/)
assert.match(template, /@click="enviarEvaluacionCompleta\(false\)"/)
assert.match(template, /@click="enviarEvaluacionCompleta\(true\)"/)
assert.match(template, /Notificar observaciones/)
assert.match(template, /v-if="requiereNotificarObservaciones"/)
assert.match(template, /Observaci&#243;n para el tesista \(opcional\)/)
assert.match(template, /v-if="puedeEvaluar && requisito\.estado === 1"/)
assert.match(template, /<div class="stitch-flow-actions">/)
assert.match(template, /Nuevo · Por revisar/)
assert.match(template, /Versión \{\{ item\.version \}\} · Subsanado/)
const reviewWorkspace = template.slice(template.indexOf('<section class="stitch-review"'), template.indexOf('<div class="stitch-files-list">'))
assert.match(reviewWorkspace, /v-if="estaEnSubsanacion\(requisito\)" class="stitch-correction-label">En subsanación/)
assert.doesNotMatch(reviewWorkspace, /class="stitch-observations-history"/)
assert.doesNotMatch(reviewWorkspace, /Descargar|descargarDocumento\(/)
assert.doesNotMatch(template, /detalle\.estado_actual\?\.codigo === 'en_revision' &&\s*!revisandoSubsanaciones/)
assert.doesNotMatch(template, /Documento corregido: \{\{ item\.requisito\.nombre \}\}/)
assert.match(template, /Informe de Turnitin \(PDF\)/)
assert.match(template, /Paquete para Decanatura/)
assert.match(template, /Informe de Turnitin[\s\S]*Propuesta de jurados/)
assert.match(template, /Registrar propuesta de jurados/)
assert.match(template, /Ver expediente listo para derivar/)

const expediente = (etapa, estado) => ({
  etapa: { codigo: etapa },
  estado_actual: { codigo: estado },
})

const panel = parse(readFileSync(new URL('../src/views/PanelView.vue', import.meta.url), 'utf8'))
const panelCode = ts
  .transpileModule(panel.descriptor.scriptSetup.content, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    transformers: {
      before: [
        () => (file) =>
          ts.factory.updateSourceFile(
            file,
            file.statements.filter((node) => !ts.isImportDeclaration(node)),
          ),
      ],
    },
  })
  .outputText.replace('export {};', '')
const panelView = new Function(
  'computed',
  'ref',
  'onMounted',
  'useAuthStore',
  `${panelCode}; return { expedientes, metricas, expedientesAtencion };`,
)(
  computed,
  ref,
  () => {},
  () => ({ tieneRol: () => true }),
)
panelView.expedientes.value = [
  expediente('registro_expediente_digital', 'derivado_udi'),
  expediente('revision_requisitos_documentarios', 'en_revision'),
  expediente('revision_jurados_proyecto', 'en_revision'),
]
assert.equal(panelView.metricas.value.expedientesVisibles, 3)
assert.equal(panelView.metricas.value.enRevision, 1)
assert.equal(panelView.metricas.value.requierenAtencion, 2)
assert.equal(panelView.expedientesAtencion.value.length, 2)

const revisionCode = ts.transpileModule(descriptor.scriptSetup.content, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  transformers: {
    before: [
      () => (file) => ts.factory.updateSourceFile(
        file,
        file.statements.filter((node) => !ts.isImportDeclaration(node)),
      ),
    ],
  },
}).outputText.replace('export {};', '')

const helperCode = ts.transpileModule(
  readFileSync(new URL('../src/utils/udiExpedientes.ts', import.meta.url), 'utf8'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
).outputText
const { documentosSubsanadosUdi } = await import(`data:text/javascript;base64,${Buffer.from(helperCode).toString('base64')}`)

for (const estadoInicial of ['derivado_udi', 'en_revision', 'pendiente_subsanacion']) {
  for (const fallaInicio of [false, true]) {
    let estado = estadoInicial
    const llamadas = []
    const redirects = []
    const route = reactive({ params: { id: '7' }, query: {} })
    const view = new Function(
      'computed', 'ref', 'onMounted', 'useRoute', 'useRouter', 'useAuthStore',
      'api', 'axios', 'progresoRevisionUdi', 'documentosSubsanadosUdi',
      `${revisionCode}; return { cargarInformacion, detalle, revision, cargando, mensajeError, adjuntosSubsanados, versionInforme, enviarEvaluacionCompleta, formulariosEvaluacion, porcentajeTurnitin };`,
    )(
      computed, ref, () => {}, () => route,
      () => ({ replace: async (to) => redirects.push(to) }), () => ({}),
      {
        get: async (url) => {
          llamadas.push(['GET', url])
          return { data: { data: url.endsWith('/revision-documentaria')
            ? { revision: { requisitos: [] } }
            : { estado_actual: { codigo: estado }, informes: [] } } }
        },
        post: async (url) => {
          llamadas.push(['POST', url])
          if (fallaInicio && url.endsWith('/iniciar')) throw new Error('Error al iniciar')
          estado = 'en_revision'
          return { data: {} }
        },
      },
      { isAxiosError: () => false }, () => ({ revisado: false }), documentosSubsanadosUdi,
    )
    await view.cargarInformacion()
    assert.equal(view.cargando.value, false)
    if (estadoInicial === 'pendiente_subsanacion') {
      assert.deepEqual(redirects, [{ name: 'udi-expediente', params: { id: 7 } }])
      assert.equal(llamadas.length, 1)
      continue
    }
    assert.equal(llamadas.filter(([method]) => method === 'POST').length,
      estadoInicial === 'derivado_udi' ? 1 : 0)
    if (estadoInicial === 'derivado_udi' && fallaInicio) {
      assert.ok(view.mensajeError.value)
      assert.equal(view.revision.value, null)
      assert.equal(llamadas.length, 2)
    } else {
      assert.equal(view.mensajeError.value, '')
      assert.equal(view.detalle.value.estado_actual.codigo, estado)
      assert.ok(view.revision.value.revision)
      await view.cargarInformacion()
      assert.equal(llamadas.filter(([method]) => method === 'POST').length,
        estadoInicial === 'derivado_udi' ? 1 : 0)

      view.revision.value = { revision: { requisitos: [{
        id_requisito_documentario: 1,
        nombre: 'Proyecto de tesis',
        evaluacion: { observaciones: [{ subsanaciones: [
          { id_subsanacion_documentaria: 1, resultado: 'rechazada', archivo_adjunto: 'v1.pdf' },
          { id_subsanacion_documentaria: 2, resultado: 'aceptada', archivo_adjunto: 'v2.pdf' },
          { id_subsanacion_documentaria: 3, resultado: null, archivo_adjunto: null },
          { id_subsanacion_documentaria: 4, resultado: null, archivo_adjunto: 'v4.pdf' },
        ] }] },
      }] } }
      view.detalle.value.informes = [{ es_tesis: 0, version: 1, estado: 1, id_informe_proyecto_tesis: 9 }]
      for (const item of view.revision.value.revision.requisitos[0].evaluacion.observaciones[0].subsanaciones) {
        item.fecha_presentacion = '2026-10-29T12:00:00'
      }
      assert.deepEqual(view.adjuntosSubsanados.value.map(({ nombre, version, subsanacion }) =>
        [nombre, version, subsanacion.id_subsanacion_documentaria]), [
        ['Proyecto de tesis', 4, 4],
        ['Proyecto de tesis', 3, 2],
        ['Proyecto de tesis', 2, 1],
      ])
      assert.equal(view.versionInforme.value, 4)
      view.revision.value.revision.requisitos[0].estado = 1
      view.formulariosEvaluacion.value = { 1: { resultado: 'observado', comentario: 'Nueva observaci?n' } }
      view.porcentajeTurnitin.value = 25
      const consultasAntes = llamadas.filter(([metodo]) => metodo === 'GET').length
      await view.enviarEvaluacionCompleta(true)
      assert.equal(view.mensajeError.value, '')
      assert.deepEqual(redirects.at(-1), { name: 'udi-expediente', params: { id: 7 } })
      assert.equal(llamadas.filter(([metodo]) => metodo === 'GET').length, consultasAntes)

    }
  }
}

console.log('OK: resumen, pestañas, historial y guardado conjunto de la revisión.')
