import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { computed, reactive, ref, watch } from 'vue'
import ts from 'typescript'
const { descriptor } = parse(
  readFileSync(new URL('../src/views/UdiAlumnosView.vue', import.meta.url), 'utf8'),
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
let fallo = false
let payload
const alumno = {
  id_alumno: 1,
  id_usuario: 8,
  id_escuela: 2,
  nombres: 'Ana',
  apellido_paterno: 'Pérez',
  apellido_materno: 'López',
  dni: '01234567',
  celular: '999999999',
  estado: 1,
  usuario: { id_usuario: 8, correo_electronico: 'ana@test.local' },
  escuela: { id_escuela: 2, nombre: 'Economía' },
}
const api = {
  put: async (_url, data) => {
    if (fallo) throw Error()
    payload = data
    return { data: { data: { ...alumno, ...data } } }
  },
  post: async (_url, data) => {
    payload = data
    return {
      data: {
        data: {
          ...alumno,
          id_alumno: 2,
          id_usuario: 9,
          usuario: { id_usuario: 9, correo_electronico: data.correo_electronico },
          ...data,
        },
      },
    }
  },
}
const view = new Function(
  'ref',
  'reactive',
  'computed',
  'watch',
  'onMounted',
  'api',
  'axios',
  `${source}; return { alumnos, filtrados, busqueda, escuela, estado, abrir, guardar, errorFormulario, formulario };`,
)(ref, reactive, computed, watch, () => {}, api, { isAxiosError: () => false })
view.alumnos.value = [alumno]
view.busqueda.value = 'perez'
assert.equal(view.filtrados.value.length, 1)
view.busqueda.value = '01234567'
assert.equal(view.filtrados.value.length, 1)
view.escuela.value = '3'
assert.equal(view.filtrados.value.length, 0)
view.escuela.value = '2'
view.abrir(alumno, true)
await view.guardar()
assert.equal(payload.estado, 0)
assert.equal('dni' in payload, false)
assert.equal('id_usuario' in payload, false)
assert.equal(view.alumnos.value[0].estado, 0)
view.abrir(alumno)
assert.equal(view.formulario.dni, '01234567')
view.formulario.nombres = 'Cambio pendiente'
fallo = true
await view.guardar()
assert.ok(view.errorFormulario.value)
assert.equal(view.formulario.nombres, 'Cambio pendiente')
fallo = false
view.abrir()
Object.assign(view.formulario, {
  correo_electronico: 'nuevo@test.local',
  password: 'ClaveSegura123',
  password_confirmation: 'ClaveSegura123',
  id_escuela: 2,
  nombres: 'Nuevo',
  apellido_paterno: 'Alumno',
  apellido_materno: 'Prueba',
  dni: '00123456',
  celular: '999888777',
})
await view.guardar()
assert.equal(payload.correo_electronico, 'nuevo@test.local')
assert.equal(payload.password, 'ClaveSegura123')
assert.equal(payload.dni, '00123456')
view.abrir()
assert.equal(view.formulario.dni, '')
assert.equal('id_usuario' in payload, false)
assert.equal(view.alumnos.value.length, 2)
console.log('OK: filtros, alta de usuario y alumno, cambio de estado y conservación ante errores.')
