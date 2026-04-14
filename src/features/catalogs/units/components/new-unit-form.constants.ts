import type { CreateUnitPayload } from "../types/unit.types"

export const defaultNewUnitForm: CreateUnitPayload = {
  numero: "",
  marca: "",
  tipo: "",
  odometro_inicial: "",
  fecha_instalacion: "",
  imei: "",
  chip: "",
  modelo: "",
  anio: "",
  no_serie: null,
  matricula: "",
  id_operador: null,
  fecha_asignacion_operador: null,
  id_grupo_unidades: [],
  id_modelo_avl: null,
  input1: "0",
  input2: "0",
  output1: "0",
  output2: "0",
  tipo_combustible: null,
  capacidad_tanque: null,
  rendimiento_establecido: null,
  nombre_aseguradora: null,
  telefono_aseguradora: null,
  no_poliza_seguro: null,
  vigencia_poliza_seguro: null,
  vigencia_verificacion_vehicular: null,
  imagen: null,
};

export const inputClass =
  "h-11 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400"