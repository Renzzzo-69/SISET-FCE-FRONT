import api from '@/services/api'

export interface PlazoTramite {
  id: number
  codigo: string
  ciclo?: string
  nombre: string
  responsable: string
  id_docente: number | null
  docente?: string | null
  inicio: string
  vencimiento: string
  duracion: number
  tipo_dias: 'habiles' | 'calendario'
  restantes: number
  semaforo: 'verde' | 'amarillo' | 'rojo' | 'cerrado'
  cierre: string | null
  fuera_de_plazo: boolean
  resultado: string | null
  constancia: string | null
  puede_completar: boolean
  fecha_alerta?: string | null
}
export async function consultarPlazos(id: number) {
  const { data } = await api.get<{
    data: PlazoTramite[]
    alertas: { id_plazo: number; nivel: string; fecha: string }[]
  }>(`/expedientes/${id}/plazos`, { timeout: 20000 })
  return data.data.map((p) => ({
    ...p,
    fecha_alerta:
      data.alertas.find((a) => a.id_plazo === p.id && a.nivel === p.semaforo)?.fecha ?? null,
  }))
}
export function fechaPlazo(fecha: string) {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(fecha))
}
export function textoPlazo(p: PlazoTramite) {
  if (p.resultado === 'cancelado') return 'Plazo cerrado con el expediente'
  if (p.cierre) return p.fuera_de_plazo ? 'Cumplido fuera de plazo' : 'Actuación cerrada'
  if (p.semaforo === 'rojo') return 'Plazo vencido'
  return `${p.restantes} ${p.tipo_dias === 'habiles' ? 'días hábiles' : 'días calendario'} restantes`
}
