export type TipoDestino = "grupo" | "persona";

export interface Destino {
  id_destino_whatsapp: number;
  id_empresa: number;
  nombre: string;
  tipo: TipoDestino;
  chatid: string | null;
  telefono: string | null;
  status: number;          // 1 activo, 0 inactivo
  total_participantes?: number; // grupos
}

// Alta de destino.
export interface CrearDestinoPayload {
  id_empresa: number;
  tipo: TipoDestino;
  nombre: string;
  telefono?: string;        // persona
  participantes?: string[]; // grupo
}

// Edición: nombre siempre; teléfono solo si es persona.
export interface EditarDestinoPayload {
  id_empresa: number;
  nombre: string;
  telefono?: string;
}