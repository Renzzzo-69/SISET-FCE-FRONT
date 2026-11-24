export interface CambioIntegrante {
  id: number
  id_expediente: number
  cod_expediente: number
  tipo: 'asesor' | 'jurado'
  origen: 'oficio' | 'externo'
  id_saliente: number
  id_entrante: number
  cargo: string | null
  numero_resolucion: string
  fecha_emision: string
  fecha_ejecucion: string | null
  saliente: string
  entrante: string
  archivo: { ruta: string; formato: 'pdf' }
}
