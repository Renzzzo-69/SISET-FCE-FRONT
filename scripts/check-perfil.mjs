import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { computed, ref } from 'vue'
import ts from 'typescript'

const { descriptor } = parse(
  readFileSync(new URL('../src/views/PerfilView.vue', import.meta.url), 'utf8'),
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
let failProfile = false
let failExpediente = true
let failPhone = false
let failPhoto = false
const calls = []
const personal = {
  correo_electronico: 'ana@test.local',
  celular: '987654321',
  nombres: 'Ana',
  apellido_paterno: 'Pérez',
  apellido_materno: 'Díaz',
  dni: '01234567',
  programa_academico: 'Economía',
  puede_editar_celular: true,
  tiene_foto: false,
}
const api = {
  get: async (url) => {
    if (url === '/expedientes') {
      if (failExpediente) throw Error()
      return { data: [] }
    }
    if (failProfile) throw Error()
    return { data: { ...personal } }
  },
  put: async (url, data) => {
    calls.push({ url, data })
    if (failPhone) throw Error()
    return { data }
  },
  post: async (url, data) => {
    calls.push({ url, data })
    if (failPhoto) throw Error()
    return { data: {} }
  },
}
const view = new Function(
  'ref',
  'computed',
  'onMounted',
  'onBeforeUnmount',
  'api',
  'useAuthStore',
  'axios',
  `${source}; return { cargar, nombre, perfil, celular, foto, fotoUrl, seleccionarFoto, descartar, guardarCambios, hayCambios, errorFormulario, mensaje, error, errorExpediente, cargando };`,
)(
  ref,
  computed,
  () => {},
  () => {},
  api,
  () => ({ usuario: { alumno: { id_alumno: 7 }, estado: 1 }, tieneRol: () => true }),
  { isAxiosError: () => false },
)
await view.cargar()
assert.equal(view.nombre.value, 'Ana Pérez Díaz')
assert.equal(view.perfil.value.dni, '01234567')
assert.ok(view.errorExpediente.value)
assert.equal(view.cargando.value, false)
view.celular.value = '-------'
await view.guardarCambios()
assert.ok(view.errorFormulario.value)
assert.equal(calls.length, 0)
view.celular.value = '999888777'
view.descartar()
assert.equal(view.celular.value, '987654321')
assert.equal(view.hayCambios.value, false)
view.celular.value = '999888777'
failPhone = true
await view.guardarCambios()
assert.ok(view.errorFormulario.value)
assert.equal(view.perfil.value.celular, '987654321')
assert.equal(view.celular.value, '999888777')
failPhone = false
await view.guardarCambios()
assert.deepEqual(calls.at(-1).data, { celular: '999888777' })
assert.equal(view.hayCambios.value, false)
assert.ok(view.mensaje.value)
const choose = (file) => view.seleccionarFoto({ target: { files: [file], value: 'foto' } })
choose(new File(['svg'], 'foto.svg', { type: 'image/svg+xml' }))
assert.ok(view.errorFormulario.value)
assert.equal(view.foto.value, null)
choose(new File(['png'], 'foto.png', { type: 'image/png' }))
assert.ok(view.fotoUrl.value)
assert.equal(view.hayCambios.value, true)
view.descartar()
assert.equal(view.fotoUrl.value, '')
choose(new File(['png'], 'foto.png', { type: 'image/png' }))
view.celular.value = '988777666'
failPhoto = true
await view.guardarCambios()
assert.equal(view.perfil.value.celular, '988777666')
assert.match(view.errorFormulario.value, /El celular se guardó/)
assert.ok(view.foto.value)
failPhoto = false
await view.guardarCambios()
assert.equal(calls.at(-1).url, '/configuracion/perfil/foto')
assert.ok(calls.at(-1).data.get('foto') instanceof File)
assert.equal(view.foto.value, null)
assert.equal(view.hayCambios.value, false)
failProfile = true
failExpediente = false
await view.cargar()
assert.ok(view.error.value)
assert.equal(view.cargando.value, false)
assert.match(descriptor.template.content, /@submit.prevent="guardarCambios"/)
assert.match(descriptor.template.content, /@click="descartar"/)
console.log(
  'Perfil: carga independiente, validación, guardado, descarte, foto y errores verificados.',
)
