import type { CreateUnitPayload } from "../types/unit.types"

export const defaultNewUnitForm: CreateUnitPayload = {
  numero: "",
  marca: "",
  modelo: "",
  anio: "",
  no_serie: "",
  imagen: "",
  fecha_asignacion_operador: "",
  id_grupo_unidades: [],
  temp_min: -10,
  temp_max: 5,
  matricula: "",
  tipo: "",
  odometro_inicial: "",
  id_operador: null,
  id_modelo_avl: null,
  fecha_instalacion: new Date().toISOString().slice(0, 10),
  imei: "",
  chip: "",
  input1: "0",
  input2: "0",
  output1: "0",
  output2: "0",
  tipo_combustible: "",
  capacidad_tanque: "",
  rendimiento_establecido: "",
  nombre_aseguradora: "",
  telefono_aseguradora: "",
  no_poliza_seguro: "",
  vigencia_poliza_seguro: "",
  vigencia_verificacion_vehicular: "",
}

export const inputClass =
  "h-11 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400"