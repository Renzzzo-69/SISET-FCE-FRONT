import api from '@/services/api'
import type { PlazoTramite } from '@/services/plazos'

export interface AgendaTesista {
  expedientes: { id: number; codigo: string }[]
  expediente: {
    id: number
    codigo: string
    etapa: string | null
    etapa_codigo: string | null
    estado: string | null
  } | null
  plazos: (PlazoTramite & { ciclo: string })[]
  actualizado_en: string
}
export async function consultarAgenda(expediente: number | null, signal?: AbortSignal) {
  const { data } = await api.get<AgendaTesista>('/agenda-academica', {
    params: expediente ? { expediente } : undefined,
    signal,
    timeout: 20000,
  })
  return data
}
export function fechaLima(fecha: Date) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha)
}
export function eventosAgenda(plazos: AgendaTesista['plazos']) {
  const grupos = new Map<string, AgendaTesista['plazos']>()
  for (const p of plazos.filter((p) => !p.cierre)) {
    const clave = p.codigo + ':' + p.ciclo + ':' + p.vencimiento
    const grupo = grupos.get(clave) ?? []
    grupo.push(p)
    grupos.set(clave, grupo)
  }
  const responsables: Record<string, string> = {
    tesista: 'Tesista',
    jurado: 'Jurados',
    presidente: 'Presidente del jurado',
    decanatura: 'Decanatura',
  }
  return [...grupos.entries()]
    .map(([id, grupo]) => {
      const p = grupo[0]!
      return {
        id,
        titulo: p.nombre,
        fecha: fechaLima(new Date(p.vencimiento)),
        vencimiento: p.vencimiento,
        tipo:
          p.responsable === 'jurado'
            ? 'Evaluación'
            : p.codigo === 'FIN-09'
              ? 'Hito final'
              : 'Trámite',
        esPersonal: p.responsable === 'tesista',
        responsable: responsables[p.responsable] ?? p.responsable,
        participantes: grupo.map((p) => p.docente).filter((nombre): nombre is string => !!nombre),
        restantes: p.restantes,
        duracion: p.duracion,
        tipoDias: p.tipo_dias,
        estado:
          p.semaforo === 'rojo'
            ? 'Vencido'
            : p.semaforo === 'amarillo'
              ? 'Próximo a vencer'
              : 'Dentro del plazo',
        tono:
          p.semaforo === 'rojo'
            ? 'critical'
            : p.semaforo === 'amarillo'
              ? 'warning'
              : p.responsable === 'tesista'
                ? 'personal'
                : 'evaluation',
        vencido: p.semaforo === 'rojo',
      }
    })
    .sort(
      (a, b) =>
        a.fecha.localeCompare(b.fecha) ||
        Number(b.esPersonal) - Number(a.esPersonal) ||
        a.titulo.localeCompare(b.titulo),
    )
}
