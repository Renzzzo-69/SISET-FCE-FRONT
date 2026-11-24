import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { computed, reactive, ref } from 'vue'
import ts from 'typescript'

const { descriptor } = parse(
  readFileSync(new URL('../src/components/SelectorEtapaTesista.vue', import.meta.url), 'utf8'),
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
const route = reactive({ name: 'tesis-final', query: {}, params: {} })
const auth = reactive({ expedientes: [] })
const actividad = reactive({ resumen: null })
const view = new Function(
  'computed',
  'ref',
  'useRoute',
  'useRouter',
  'onMounted',
  'onBeforeUnmount',
  'useAuthStore',
  'useActividadTesistaStore',
  `${source}; return { expedientes, etapa };`,
)(
  computed,
  ref,
  () => route,
  () => ({}),
  () => {},
  () => {},
  () => auth,
  () => actividad,
)
auth.expedientes = [
  { id_expediente: 7, etapa: { codigo: 'revision_requisitos_documentarios' } },
]
assert.equal(view.etapa.value, 'proyecto')
view.expedientes.value[0].etapa.codigo = 'fase_tesis_informe_final'
assert.equal(view.etapa.value, 'proyecto')
route.name = 'expedientes-detalle'
route.query = { registrar: 'tesis-final' }
assert.equal(view.etapa.value, 'tesis')
route.query = {}
route.name = 'documentos'
view.expedientes.value[0].etapa.codigo = 'revision_jurados_tesis_final'
assert.equal(view.etapa.value, 'tesis')
route.query = { etapa: 'proyecto' }
assert.equal(view.etapa.value, 'proyecto')
route.query = { etapa: 'tesis' }
assert.equal(view.etapa.value, 'tesis')
console.log(
  'Selector: proyecto al consultar habilitación, tesis al registrar y consulta de etapas conservada.',
)
