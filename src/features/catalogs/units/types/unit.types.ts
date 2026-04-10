export interface UnitItem {
  id: number
  numero: string
  marca: string
  modelo: string
  anio: string
  matricula: string
  tipo: number
  imagen: string
  imei: string
  chip: string
  id_operador: number | null
  status: number
}

export interface CreateUnitPayload {
  numero: string
  marca: string
  modelo: string
  anio: string
  no_serie: string
  imagen?: string
  fecha_asignacion_operador?: string
  id_grupo_unidades?: number | null
  temp_min?: number
  temp_max?: number
  matricula: string
  tipo: string
  odometro_inicial: number | string
  id_operador: number | null
  id_modelo_avl: number | null
  fecha_instalacion: string
  imei: string
  chip: string
  input1: string
  input2: string
  output1: string
  output2: string
  tipo_combustible: string
  capacidad_tanque: number | string
  rendimiento_establecido: number | string
  nombre_aseguradora: string
  telefono_aseguradora: string
  no_poliza_seguro: string
  vigencia_poliza_seguro: string
  vigencia_verificacion_vehicular: string
}

export interface CreateUnitResponse {
  message: string
  unit: {
    id: number
  }
}