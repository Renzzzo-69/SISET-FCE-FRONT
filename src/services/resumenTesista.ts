import type { RouteLocationRaw } from 'vue-router'
import api from '@/services/api'
import { consultarPlazos, fechaPlazo, textoPlazo, type PlazoTramite } from '@/services/plazos'
import type {
  Expediente,
  ExpedienteDetalle,
  ExpedienteDetalleResponse,
  RevisionDocumentariaConsulta,
  RevisionDocumentariaResponse,
  RevisionJuradoTesista,
  JuradoObservaciones,
} from '@/types/api'

export interface AvisoTesista {
  id: string
  titulo: string
  texto: string
  fecha: string | null
  categoria: 'Observaciones' | 'Resoluciones' | 'Sistema'
  etiqueta: string
  tono: 'warning' | 'success' | 'system'
  icono: string
  destino: RouteLocationRaw
  leida: boolean
}
interface Resolucion {
  id_resolucion: number
  numero_resolucion: string
  fecha_emision: string | null
  estado: string
}
interface FormatoPublicado {
  id: number
  nombre: string
  version: string
  actualizado_en: string | null
}
export interface ResumenTesista {
  expediente?: Expediente
  lecturas: { modulo: string; clave: string }[]
  plazos: PlazoTramite[]
  expedientes: Expediente[]
  detalle: ExpedienteDetalle | null
  revision: RevisionDocumentariaConsulta | null
  revisionesJurados: RevisionJuradoTesista[]
  avisos: AvisoTesista[]
  errores: string[]
  observaciones: number | null
  pendientes: number | null
}
export const pasosTesista = [
  'Registro del expediente',
  'Revisión documentaria UDI',
  'Conformidad UDI',
  'Designación de jurados',
  'Revisión del proyecto',
  'Aprobación del proyecto',
  'Registro de informe final',
  'Revisión de tesis final',
  'Aprobación de tesis final',
  'Cierre y archivo',
]
export function pasoTesista(etapa: string | undefined, estado: string | undefined) {
  if (etapa === 'revision_requisitos_documentarios')
    return ['conforme', 'derivado_decanatura'].includes(estado ?? '') ? 3 : 2
  return (
    (
      {
        registro_expediente_digital: 1,
        aprobacion_designacion_jurados: 4,
        revision_jurados_proyecto: 5,
        aprobacion_proyecto: 6,
        fase_tesis_informe_final: 7,
        revision_jurados_tesis_final: 8,
        aprobacion_informe_final: 9,
        cierre_archivo: 10,
      } as Record<string, number>
    )[etapa ?? ''] ?? 0
  )
}
export function fechaAviso(valor: string | null) {
  if (!valor) return 'Fecha no disponible'
  const fecha = new Date(valor.length === 10 ? `${valor}T12:00:00-05:00` : valor)
  return Number.isNaN(fecha.getTime()) ? 'Fecha no disponible' : fecha.toLocaleDateString('es-PE', { timeZone: 'America/Lima' })
}
export async function cargarResumenTesista(
  alumnoId: number | undefined,
  solicitado?: number | null,
  alCargarDetalle?: (resumen: ResumenTesista) => void,
  listaInicial?: Expediente[],
): Promise<ResumenTesista> {
  const lista = listaInicial ?? (await api.get<Expediente[]>('/expedientes', { timeout: 20000 })).data
  const expedientes = lista
    .filter(
      (item) =>
        alumnoId != null &&
        (Number(item.id_tesista) === alumnoId || Number(item.id_co_tesista) === alumnoId),
    )
    .sort((a, b) => b.id_expediente - a.id_expediente)
  const elegido =
    expedientes.find((item) => item.id_expediente === solicitado) ??
    expedientes.find((item) => item.estado === 1) ??
    expedientes[0]
  const resumen: ResumenTesista = {
    lecturas: [],
    plazos: [],
    expedientes,
    detalle: null,
    revision: null,
    revisionesJurados: [],
    avisos: [],
    errores: [],
    observaciones: null,
    pendientes: null,
  }
  if (!elegido) {
    resumen.observaciones = resumen.pendientes = 0
    return resumen
  }
  resumen.expediente = elegido
  alCargarDetalle?.({ ...resumen })
  const id = elegido.id_expediente
  const { data } = await api.get<ExpedienteDetalleResponse>(`/expedientes/${id}`, { timeout: 60000 })
  if (!data.data) throw new Error('No se pudo obtener el detalle del expediente.')
  resumen.detalle = data.data
  alCargarDetalle?.({ ...resumen })
  const etapa = resumen.detalle.etapa_actual?.codigo ?? ''
  const esTesis = [
    'revision_jurados_tesis_final',
    'aprobacion_informe_final',
    'cierre_archivo',
  ].includes(etapa)
  const consultaObservaciones = {
    name: 'observaciones',
    query: { expediente: id, etapa: esTesis ? 'tesis' : 'proyecto' },
  }
  // Evita agotar el tiempo de espera en la cola del servidor PHP local, que atiende una petición a la vez.
  let ultimaConsulta: Promise<unknown> = Promise.resolve()
  function consultar<T>(consulta: () => Promise<T>): Promise<T> {
    const siguiente = ultimaConsulta.then(consulta)
    ultimaConsulta = siguiente.catch(() => {})
    return siguiente
  }
  const [revision, resoluciones, jurados, plazos, lecturas, formatos] = await Promise.allSettled([
    consultar(() => api.get<RevisionDocumentariaResponse>(`/expedientes/${id}/revision-documentaria`, { timeout: 20000 })),
    consultar(() => api.get<{ data: Resolucion[] }>('/resoluciones', {
      params: { id_expediente: id, destinatario: 1 },
      timeout: 20000,
    })),
    consultar(() => api.get<{ data: RevisionJuradoTesista[]; jurados: JuradoObservaciones[] }>(
      `/expedientes/${id}/revisiones-jurados`,
      {
        params: { etapa: esTesis ? 'tesis' : 'proyecto' },
        timeout: 20000,
      },
    )),
    consultar(() => consultarPlazos(id)),
    consultar(() => api.get<{ data: ResumenTesista['lecturas'] }>(`/expedientes/${id}/lecturas-actividad`, { timeout: 20000 })),
    consultar(() => api.get<{ formatos: FormatoPublicado[] }>('/formatos-oficiales', { timeout: 20000 })),
  ])
  if (lecturas.status === 'rejected') throw new Error('No se pudo consultar el estado de lectura.')
  resumen.lecturas = lecturas.value.data.data
  resumen.observaciones = resumen.pendientes = 0
  if (plazos.status === 'fulfilled') resumen.plazos = plazos.value
  else resumen.errores.push('No se pudieron consultar los plazos del trámite.')
  if (revision.status === 'fulfilled') resumen.revision = revision.value.data.data
  else resumen.errores.push('No se pudieron consultar las observaciones de UDI.')
  if (jurados.status === 'fulfilled') resumen.revisionesJurados = jurados.value.data.data
  else resumen.errores.push('No se pudieron consultar las revisiones de jurados.')
  const observacionesUdi =
    resumen.revision?.revision?.requisitos.flatMap(
      (item) => item.evaluacion?.observaciones ?? [],
    ) ?? []
  const ultimasJurados = new Map<number, RevisionJuradoTesista>()
  const juradosVigentes = new Set(
    jurados.status === 'fulfilled' ? jurados.value.data.jurados.map((item) => item.id_docente) : [],
  )
  for (const item of resumen.revisionesJurados) {
    if (item.vigente === false || !juradosVigentes.has(item.id_docente)) continue
    const anterior = ultimasJurados.get(item.id_docente)
    if (
      !anterior ||
      item.numero_ronda > anterior.numero_ronda ||
      (item.numero_ronda === anterior.numero_ronda && item.id_revision > anterior.id_revision)
    )
      ultimasJurados.set(item.id_docente, item)
  }
  const pendientesJurados = [...ultimasJurados.values()].filter(
    (item) => item.veredicto.toLowerCase() === 'observado',
  ).length
  if (etapa === 'revision_requisitos_documentarios') {
    resumen.observaciones =
      revision.status === 'rejected'
        ? null
        : observacionesUdi.filter((item) => item.estado !== 'cerrada').length
    resumen.pendientes =
      revision.status === 'rejected'
        ? null
        : observacionesUdi.filter(
            (item) => item.estado === 'pendiente' && Boolean(item.es_subsanable),
          ).length
  } else if (etapa === 'revision_jurados_proyecto' || etapa === 'revision_jurados_tesis_final') {
    resumen.observaciones = resumen.pendientes =
      jurados.status === 'rejected' ? null : pendientesJurados
  }
  const avisos: AvisoTesista[] = resumen.detalle.historial
    .filter((item) => !item.accion_realizada.includes('resolucion'))
    .map((item) => ({
      id: `historial-${item.id_historial}`,
      titulo: item.accion_realizada
        .replaceAll('_', ' ')
        .replace(/:\d+$/, '')
        .replace(/^./, (letra) => letra.toUpperCase()),
      texto: `${item.etapa_nueva?.nombre ?? 'Expediente'} · ${item.estado_nuevo?.nombre ?? 'Estado actualizado'}`,
      fecha: item.fecha_cambio,
      categoria: 'Sistema',
      etiqueta: 'Trámite',
      tono: 'system',
      icono: 'history',
      destino: { name: 'expedientes-detalle', params: { id }, hash: '#historial' },
      leida: false,
    }))
  for (const item of observacionesUdi)
    avisos.push({
      id: `observacion-${item.id_observacion_documentaria}-${item.estado}`,
      titulo:
        item.estado === 'cerrada'
          ? 'Observación UDI resuelta'
          : item.estado === 'en_subsanacion'
            ? 'Subsanación en revisión'
            : 'Observación de UDI',
      texto: item.detalle,
      fecha: item.fecha_emision,
      categoria: 'Observaciones',
      etiqueta: 'Observación',
      tono: item.estado === 'cerrada' ? 'success' : 'warning',
      icono: 'rate_review',
      destino: { name: 'observaciones', query: { expediente: id, etapa: 'proyecto' } },
      leida: false,
    })
  for (const item of resumen.revisionesJurados)
    avisos.push({
      id: `jurado-${item.id_revision}`,
      titulo: `Revisión de jurado · ${item.docente}`,
      texto: `${item.veredicto}${item.comentarios ? `: ${item.comentarios}` : ''}`,
      fecha: item.fecha_revision,
      categoria: 'Observaciones',
      etiqueta: 'Jurado',
      tono: item.veredicto.toLowerCase() === 'aprobado' ? 'success' : 'warning',
      icono: 'rate_review',
      destino: consultaObservaciones,
      leida: false,
    })
  if (resoluciones.status === 'fulfilled') {
    for (const item of resoluciones.value.data.data)
      avisos.push({
        id: `resolucion-${item.id_resolucion}-${item.estado}`,
        titulo: `Resolución ${item.numero_resolucion}`,
        texto: `Resolución incorporada al expediente ${elegido.cod_expediente}. Estado: ${item.estado}.`,
        fecha: item.fecha_emision,
        categoria: 'Resoluciones',
        etiqueta: 'Resolución',
        tono: 'success',
        icono: 'task',
        destino: { name: 'documentos', query: { expediente: id } },
        leida: false,
      })
  } else resumen.errores.push('No se pudieron consultar las resoluciones.')
  for (const p of resumen.plazos.filter(
    (p) => !p.cierre && ['amarillo', 'rojo'].includes(p.semaforo),
  ))
    avisos.push({
      id: `plazo-${p.id}-${p.semaforo}`,
      titulo: `${p.semaforo === 'rojo' ? 'Plazo vencido' : 'Próximo vencimiento'} · ${p.nombre}`,
      texto: `${textoPlazo(p)}. Responsable: ${p.responsable}. Vencimiento: ${fechaPlazo(p.vencimiento)}.`,
      fecha: p.fecha_alerta ?? null,
      categoria: 'Sistema',
      etiqueta: p.semaforo === 'rojo' ? 'Vencido' : 'Plazo',
      tono: 'warning',
      icono: 'timer',
      destino: { name: 'expedientes-detalle', params: { id }, hash: '#plazos' },
      leida: false,
    })
  if (formatos.status === 'fulfilled') {
    for (const formato of formatos.value.data.formatos) avisos.push({
      id: `formato-${formato.id}-${formato.actualizado_en ?? 'publicado'}`,
      titulo: `Formato oficial disponible · ${formato.nombre}`,
      texto: `Decanatura publicó la versión ${formato.version}. Puedes descargarla en Word.`,
      fecha: formato.actualizado_en,
      categoria: 'Sistema', etiqueta: 'Formato', tono: 'system', icono: 'description',
      destino: { name: 'formatos' }, leida: false,
    })
  } else resumen.errores.push('No se pudieron consultar las novedades de formatos oficiales.')
  resumen.avisos = avisos.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))
  const leidas = new Set(resumen.lecturas.filter((l) => l.modulo === 'notificaciones').map((l) => l.clave))
  resumen.avisos.forEach((a) => { a.leida = leidas.has(a.id) })
  return resumen
}
