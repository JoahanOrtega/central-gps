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
  // Obligatorios
  numero: string;
  marca: string;
  tipo: string;
  odometro_inicial: number | string;
  fecha_instalacion: string;
  imei: string;
  chip: string;

  // Opcionales
  modelo?: string;
  anio?: string;
  no_serie?: string | null;
  matricula?: string;
  id_operador?: number | null;
  fecha_asignacion_operador?: string | null;
  id_grupo_unidades?: number[];
  id_modelo_avl?: number | null;
  input1?: string;
  input2?: string;
  output1?: string;
  output2?: string;
  tipo_combustible?: string | null;
  capacidad_tanque?: number | string | null;
  rendimiento_establecido?: number | string | null;
  nombre_aseguradora?: string | null;
  telefono_aseguradora?: string | null;
  no_poliza_seguro?: string | null;
  vigencia_poliza_seguro?: string | null;
  vigencia_verificacion_vehicular?: string | null;
  imagen?: string | null;
}

export interface CreateUnitResponse {
  message: string
  unit: {
    id: number
  }
}