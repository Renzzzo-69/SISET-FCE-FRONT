import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import api from '@/services/api'
import { cargarResumenTesista, type ResumenTesista } from '@/services/resumenTesista'
import type { Expediente } from '@/types/api'

export const useActividadTesistaStore = defineStore('actividad-tesista', () => {
  const resumen = ref<ResumenTesista | null>(null)
  const cargando = ref(false)
  const error = ref('')
  const guardando = ref(false)
  let generacion = 0
  let cuenta: number | null = null
  let alumno: number | undefined
  let expediente: number | null = null
  let moduloActual = ''
  let visitaPendiente = false
  let temporizador: ReturnType<typeof setTimeout> | undefined
  let pendiente: Promise<void> | undefined
  let listaInicial: Expediente[] | undefined
  const avisos = computed(() => resumen.value?.avisos ?? [])
  const novedades = computed(() => {
    const modulos: Record<string, string[]> = {}
    const agregar = (modulo: string, clave: string) => {
      const claves = modulos[modulo] ??= []
      if (!claves.includes(clave)) claves.push(clave)
    }
    for (const aviso of avisos.value) {
      agregar('notificaciones', aviso.id)
      const destino = aviso.destino
      if (typeof destino === 'object' && 'name' in destino && destino.name) {
        const nombre = destino.name === 'expedientes-detalle' ? 'expedientes' : String(destino.name)
        agregar(nombre, aviso.id)
      }
      if (aviso.id.startsWith('jurado-')) agregar('documentos', aviso.id)
      if (aviso.id.startsWith('historial-')) {
        const texto = aviso.titulo.toLowerCase()
        if (/jurado|terna|asesor/.test(texto)) agregar('asesor-jurados', aviso.id)
        if (/informe|conformidad|turnitin|subsanacion|propuesta/.test(texto)) agregar('documentos', aviso.id)
        if (/tesis final|informe final/.test(texto)) agregar('tesis-final', aviso.id)
      }
    }
    for (const plazo of resumen.value?.plazos ?? []) {
      if (!plazo.cierre) {
        // Los tres jurados comparten un evento de agenda por actuación y ciclo.
        const grupo = resumen.value!.plazos.filter((p) => p.codigo === plazo.codigo && p.ciclo === plazo.ciclo && p.vencimiento === plazo.vencimiento)
        const id = Math.min(...grupo.map((p) => p.id))
        agregar('agenda', `plazo-${id}-${plazo.vencimiento}-${plazo.semaforo}`)
      }
    }
    return modulos
  })
  const conteos = computed(() => Object.fromEntries(Object.entries(novedades.value).map(([modulo, claves]) => {
    const leidas = new Set((resumen.value?.lecturas ?? []).filter((l) => l.modulo === modulo).map((l) => l.clave))
    return [modulo, claves.filter((clave) => !leidas.has(clave)).length]
  })))

  async function marcar(modulo: string, claves: string[]) {
    const actual = resumen.value
    const id = actual?.detalle?.id_expediente
    if (!id || !claves.length) return
    const version = generacion
    // Se envían las claves vistas: una novedad que llegue durante el guardado sigue pendiente.
    for (let i = 0; i < claves.length; i += 500) {
      const lote = claves.slice(i, i + 500)
      await api.post(`/expedientes/${id}/lecturas-actividad`, { modulo, claves: lote }, { timeout: 20000 })
      if (version !== generacion) return
      const destino = resumen.value
      if (destino?.detalle?.id_expediente !== id) return
      for (const clave of lote) {
        if (!destino.lecturas.some((l) => l.modulo === modulo && l.clave === clave)) destino.lecturas.push({ modulo, clave })
        if (modulo === 'notificaciones') {
          const aviso = destino.avisos.find((a) => a.id === clave)
          if (aviso) aviso.leida = true
        }
      }
    }
  }
  async function leer(claves: string[]) {
    const version = generacion
    guardando.value = true
    try {
      await marcar('notificaciones', claves)
    } finally {
      if (version === generacion) guardando.value = false
    }
  }
  async function visitar(modulo: string) {
    moduloActual = modulo === 'expedientes-detalle' ? 'expedientes' : modulo
    visitaPendiente = !resumen.value
    if (moduloActual === 'notificaciones') return
    const claves = novedades.value[moduloActual] ?? []
    const vistas = new Set(resumen.value?.lecturas.filter((l) => l.modulo === moduloActual).map((l) => l.clave))
    const nuevas = claves.filter((c) => !vistas.has(c))
    const moduloVisitado = moduloActual
    try { await marcar(moduloVisitado, nuevas) } catch {
      if (moduloVisitado === moduloActual) visitaPendiente = true
    }
  }
  function programar() {
    clearTimeout(temporizador)
    if (cuenta !== null) temporizador = setTimeout(() => { void actualizar() }, 60000)
  }
  async function actualizar() {
    if (pendiente) return pendiente
    if (cuenta === null || document.hidden) { programar(); return }
    const version = generacion
    cargando.value = true
    pendiente = (async () => {
      try {
        const lista = listaInicial
        listaInicial = undefined
        const datos = await cargarResumenTesista(alumno, expediente, (parcial) => {
          if (version === generacion && !resumen.value?.detalle) resumen.value = parcial
        }, lista)
        if (version !== generacion) return
        // Una consulta iniciada antes de una lectura no debe volver a marcarla como pendiente.
        if (resumen.value?.detalle?.id_expediente === datos.detalle?.id_expediente) {
          for (const l of resumen.value?.lecturas ?? []) {
            if (!datos.lecturas.some((d) => d.modulo === l.modulo && d.clave === l.clave)) datos.lecturas.push(l)
          }
          const leidas = new Set(datos.lecturas.filter((l) => l.modulo === 'notificaciones').map((l) => l.clave))
          datos.avisos.forEach((a) => { a.leida = leidas.has(a.id) })
        }
        resumen.value = datos
        error.value = datos.errores.join(' ')
        if (visitaPendiente) await visitar(moduloActual)
      } catch {
        if (version === generacion) error.value = resumen.value
          ? 'No se pudo completar la información del panel. Puede reintentar la actualización.'
          : 'No se pudo cargar el resumen de tu expediente. Intenta nuevamente.'
      } finally {
        if (version === generacion) { cargando.value = false; pendiente = undefined; programar() }
      }
    })()
    return pendiente
  }
  function alVolver() { if (!document.hidden) void actualizar() }
  function detener() {
    generacion++
    cuenta = null
    pendiente = undefined
    listaInicial = undefined
    clearTimeout(temporizador)
    window.removeEventListener('focus', alVolver)
    window.removeEventListener('online', alVolver)
    document.removeEventListener('visibilitychange', alVolver)
    resumen.value = null
    error.value = ''
    cargando.value = false
    guardando.value = false
  }
  function iniciar(usuario: number, idAlumno: number, solicitado: number | null, iniciales?: Expediente[]) {
    if (cuenta === usuario && alumno === idAlumno && expediente === solicitado) return
    detener()
    cuenta = usuario
    alumno = idAlumno
    expediente = solicitado
    listaInicial = iniciales
    window.addEventListener('focus', alVolver)
    window.addEventListener('online', alVolver)
    document.addEventListener('visibilitychange', alVolver)
    void actualizar()
  }
  return { resumen, avisos, conteos, cargando, guardando, error, iniciar, detener, actualizar, leer, visitar }
})
