import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { computed, ref } from 'vue'
import ts from 'typescript'

function cargarScript(archivo, contexto, variables) {
  const { descriptor } = parse(readFileSync(new URL(archivo, import.meta.url), 'utf8'))
  const source = ts.transpileModule(descriptor.scriptSetup.content, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    transformers: { before: [() => file => ts.factory.updateSourceFile(file,
      file.statements.filter(node => !ts.isImportDeclaration(node)))] },
  }).outputText.replace('export {};', '')
  return new Function(...Object.keys(contexto), `${source}; return { ${variables} };`)(...Object.values(contexto))
}

const roles = ['tesista', 'udi', 'docente', 'secretaria', 'decanatura']
const route = { name: 'dashboard', query: {}, fullPath: '/dashboard' }
let tieneExpediente = true
const acciones = []
const auth = {
  usuario: { correo_electronico: 'persona@unsm.edu.pe' },
  get tieneExpediente() { return tieneExpediente },
  moduloTesistaDisponible: nombre => ['perfil', 'formatos'].includes(nombre) || (tieneExpediente ? nombre !== 'expedientes-nuevo' : nombre === 'expedientes-nuevo'),
  cerrarSesion: async () => acciones.push('logout'),
}
const props = { rol: 'tesista' }
const useActividadTesistaStore = () => ({ conteos: {}, iniciar() {}, detener() {}, visitar() {} })
const navigation = cargarScript('../src/components/AppNavigation.vue', {
  computed, defineProps: () => props, defineEmits: () => () => {},
  useRoute: () => route, useAuthStore: () => auth, useActividadTesistaStore,
}, 'menus, enlaces, activo')
const routerSource = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
for (const rol of roles) {
  props.rol = rol
  assert(navigation.menus[rol].length > 0)
  for (const item of navigation.menus[rol].flatMap(item => [item, ...(item.hijos ?? [])])) {
    for (const nombre of [item.ruta, ...(item.activo ?? [])].filter(Boolean)) {
      assert(routerSource.includes(`name: '${nombre}'`), `Ruta inexistente: ${nombre}`)
    }
  }
}
props.rol = 'tesista'
assert(!navigation.enlaces.value.some(item => item.ruta === 'expedientes-nuevo'))
// Use a fresh computed because these test inputs are plain objects.
tieneExpediente = false
const sinExpediente = cargarScript('../src/components/AppNavigation.vue', {
  computed, defineProps: () => props, defineEmits: () => () => {},
  useRoute: () => route, useAuthStore: () => auth, useActividadTesistaStore,
}, 'enlaces')
assert.deepEqual(sinExpediente.enlaces.value.map(item => item.ruta), ['expedientes-nuevo', 'formatos', 'perfil'])
route.name = 'expedientes-detalle'
for (const [registrar, ruta] of [['documento', 'documentos'], ['tesis-final', 'tesis-final'], [undefined, 'expedientes']]) {
  route.query = { registrar }
  assert.deepEqual(navigation.menus.tesista.filter(navigation.activo).map(item => item.ruta), [ruta])
}
props.rol = 'docente'
route.name = 'docente-asesor-tesis-detalle'
assert.deepEqual(navigation.menus.docente.filter(navigation.activo).map(item => item.etiqueta), ['Asesor'])
props.rol = 'udi'
route.name = 'udi-revision'
assert.deepEqual(navigation.menus.udi.filter(navigation.activo).map(item => item.etiqueta), ['Bandeja de Archivos'])

for (const rol of roles) {
  const shell = cargarScript('../src/layouts/AppShell.vue', {
    computed, ref, nextTick: async () => {}, watch: () => {}, onMounted: () => {}, onBeforeUnmount: () => {},
    defineProps: () => ({ rol }), useAuthStore: () => auth, useRoute: () => route, useActividadTesistaStore,
    useRouter: () => ({ replace: async destino => acciones.push(destino.name) }),
  }, 'menuAbierto, manejarTecla, cerrarMenu, cerrarSesion, cerrando, inicio, perfil, notificaciones')
  assert(routerSource.includes(`name: '${shell.inicio.value.name}'`))
  if (shell.perfil.value) assert(routerSource.includes(`name: '${shell.perfil.value}'`))
  shell.menuAbierto.value = true
  shell.manejarTecla({ key: 'Escape' })
  assert.equal(shell.menuAbierto.value, false)
  shell.menuAbierto.value = true
  shell.cerrarMenu()
  assert.equal(shell.menuAbierto.value, false)
  acciones.length = 0
  await shell.cerrarSesion()
  await shell.cerrarSesion()
  assert.deepEqual(acciones, ['logout', 'login'])
  assert.equal(shell.cerrando.value, true)
}
assert(readFileSync(new URL('../public/images/fce-unsm.png', import.meta.url)).length > 0)
for (const layout of ['AuthenticatedLayout', 'DocenteLayout', 'DecanaturaLayout', 'UdiLayout']) {
  assert.match(readFileSync(new URL(`../src/layouts/${layout}.vue`, import.meta.url), 'utf8'), /<AppShell/)
}
console.log('OK: cinco roles, rutas existentes, permisos del tesista, selección de detalles, menú móvil, cierre de sesión único y logo local.')
