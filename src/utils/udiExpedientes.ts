import type { Expediente, ExpedienteDetalle, RevisionDocumentariaConsulta } from '@/types/api'

export function documentosSubsanadosUdi(
  detalle: Pick<ExpedienteDetalle, 'informes'> | null,
  revision: RevisionDocumentariaConsulta | null,
) {
  const informes = (detalle?.informes ?? []).filter((informe) => informe.estado === 1)
  const esTesis = informes.length > 0 && informes.every((informe) => informe.es_tesis === 1)
  const versiones = new Map<string, number>([
    ['Solicitud', 1],
    ['Proyecto de tesis', Math.max(1, ...informes.filter((informe) => !informe.es_tesis).map((informe) => informe.version))],
    ['Tesis', Math.max(1, ...informes.filter((informe) => informe.es_tesis).map((informe) => informe.version))],
  ])
  return (revision?.revision?.requisitos ?? [])
    .flatMap((requisito) => (requisito.evaluacion?.observaciones ?? []).flatMap((observacion) =>
      observacion.subsanaciones
        .filter((subsanacion) => Boolean(subsanacion.archivo_adjunto))
        .map((subsanacion) => ({ requisito, observacion, subsanacion })),
    ))
    .sort((a, b) =>
      a.subsanacion.fecha_presentacion.localeCompare(b.subsanacion.fecha_presentacion) ||
      a.subsanacion.id_subsanacion_documentaria - b.subsanacion.id_subsanacion_documentaria,
    )
    .map((item) => {
      const requisito = item.requisito.nombre.toLocaleLowerCase('es')
      const nombre = requisito.includes('solicitud') ? 'Solicitud'
        : esTesis ? 'Tesis' : 'Proyecto de tesis'
      const version = (versiones.get(nombre) ?? 1) + 1
      versiones.set(nombre, version)
      return { ...item, nombre, version }
    })
    .reverse()
}

type ExpedienteUdi =
  | Pick<Expediente, 'etapa' | 'estado_actual'>
  | Pick<ExpedienteDetalle, 'etapa_actual' | 'estado_actual'>

export function progresoRevisionUdi(expediente: ExpedienteUdi) {
  const etapa =
    'etapa_actual' in expediente ? expediente.etapa_actual?.codigo : expediente.etapa?.codigo
  const estado = expediente.estado_actual?.codigo
  const revisado =
    estado === 'derivado_decanatura' ||
    Boolean(
      etapa &&
      !['registro_expediente_digital', 'revision_requisitos_documentarios'].includes(etapa),
    )
  const completados = revisado
    ? 3
    : estado === 'conforme'
      ? 2
      : etapa === 'revision_requisitos_documentarios'
        ? 1
        : 0
  const etiqueta = revisado
    ? 'Derivado a Decanatura'
    : estado === 'conforme'
      ? 'Pendiente de derivación'
      : estado === 'pendiente_subsanacion'
        ? 'Esperando subsanación'
        : estado === 'observado'
          ? 'Con observaciones'
          : completados === 1
            ? 'Revisión en curso'
            : 'Sin iniciar revisión'

  return { revisado, completados, porcentaje: Math.round((completados / 3) * 100), etiqueta }
}
