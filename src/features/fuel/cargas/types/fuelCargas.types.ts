export interface FuelCargaItem {
  id_combustible: number;
  id_empresa: number;
  id_unidad: number;
  unidad?: string;
  fecha_carga: string;
  gasolinera?: string | null;
  grupo_unidades?: string | null;
  folio: string;
  litros: number;
  costo_litro: number;
  importe: number;
  referencia?: string | null;
  kms_gps?: number | null;
  kms_vacio?: number | null;
  porc_vacio?: number | null;
  rend_gps?: number | null;
  rend_odo?: number | null;
  rendimiento_establecido?: number | null;
  rend_establecido?: number | null; 
  rend_optimo?: number | null; 
  fecha_registro?: string;
  kms_recorridos?: number; 
  kms_odo: number; 
}

export interface CreateFuelCargaPayload {
  id_empresa: number;
  id_unidad: number;
  fecha_carga: string;
  gasolinera: string | null;
  grupo_unidades: string | null;
  folio: string;
  litros: number;
  costo_litro: number;
  importe: number;
  referencia: string | null;
  kms_odo: number | null;
  kms_vacio: number | null;
  kms_gps: number | null;
  porc_vacio: number | null;
  rend_gps: number | null;
  rend_odo: number | null;
  rend_optimo: number | null;
}

export interface UnidadCatalogo {
  id_unidad: number;
  nombre: string;
  rendimiento_establecido: number;
  odometro_fisico: number;
  grupo_unidades?: string | null;
}

export interface FuelCargaFormValues {
  fecha_carga: string;
  hora_carga: string;
  gasolinera: string;
  folio: string;
  id_unidad: number | "";
  litros: number;
  costo_litro: number;
  importe: number;
  referencia: string;
  kms_odo: number | null;
  kms_vacio: number | null;
  grupo_unidades: string | null;
  kms_gps: number | null;
  porc_vacio: number | null;
  rend_gps: number | null;
  rend_odo: number | null;
  rend_optimo: number | null;
}