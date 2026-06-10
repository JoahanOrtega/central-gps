// Días de la semana — convención: 0=domingo, 1=lunes ... 6=sábado
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Etiquetas cortas para los días
export const DIA_LABEL: Record<DiaSemana, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};

// Tipo de itinerario
// 1 = regular (días recurrentes de la semana)
// 2 = especial (fecha concreta, no recurrente)
export type TipoItinerario = 1 | 2;

// ── Parada con hora de abordaje ───────────────────────────────────────────────

export interface ParadaItinerario {
  id_parada: number;
  hora_abordaje: string | null;  // "HH:MM"
  segundos_recorrido_continuo: number | null;
  segundos_recorrido_mixto: number | null;
  // Campos solo de UI — no se envían al backend, vienen del detalle
  // de la ruta (al crear) o del GET del itinerario (al editar)
  nombre?: string;
  numero?: number;
  latitud?: number;
  longitud?: number;
}

// ── Itinerario completo (para crear / editar) ─────────────────────────────────

export interface Itinerario {
  id_itinerario?: number;
  id_ruta: number;
  id_logistica_ruta: number;
  turno: string;
  tipo: TipoItinerario;
  dias: DiaSemana[];
  hora_inicio: string | null;  // "HH:MM"
  hora_fin: string | null;  // "HH:MM"
  minutos_tolerancia_inicio: number;
  minutos_tolerancia_fin: number;
  minutos_tolerancia_anticipacion: number;
  total_paradas: number;
  fecha_inicio: string | null;  // "YYYY-MM-DD"
  token?: string;
  status?: number;
  paradas: ParadaItinerario[];
  // Contexto de la ruta — el GET de detalle los incluye (solo lectura)
  nombre_ruta?: string;
  clave_ruta?: string;
  tipo_logistica?: 1 | 2;
  trace_color?: string;
  direccion_inicio?: string;
  direccion_fin?: string;
}

// ── Item en el listado agrupado por ruta ──────────────────────────────────────

export interface ItinerarioItem {
  id_itinerario: number;
  id_ruta: number;
  id_logistica_ruta: number;
  turno: string;
  tipo: TipoItinerario;
  dias: DiaSemana[];
  hora_inicio: string | null;
  hora_fin: string | null;
  minutos_tolerancia_inicio: number;
  minutos_tolerancia_fin: number;
  minutos_tolerancia_anticipacion: number;
  total_paradas: number;
  fecha_inicio: string | null;
  duracion_segundos: number | null;
  status: number;
  // De la logística
  tipo_logistica: 1 | 2;
  trace_color: string;
  direccion_inicio: string;
  direccion_fin: string;
  // De la ruta (solo en detalle)
  clave_ruta?: string;
  nombre_ruta?: string;
}

// ── Grupo de itinerarios por ruta (respuesta del endpoint agrupado) ───────────

export interface ItinerarioGrupoRuta {
  id_ruta: number;
  clave_ruta: string;
  nombre_ruta: string;
  tipo_ruta: number;
  cliente: string | null;
  itinerarios: ItinerarioItem[];
}

// ── Respuesta paginada ────────────────────────────────────────────────────────

export interface ItinerariosPaginados {
  data: (ItinerarioItem & { nombre_ruta: string; clave_ruta: string })[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

// ── Payload de creación / edición ─────────────────────────────────────────────
// Solo los campos que el backend acepta — los campos de UI se excluyen
// al construir el payload (ver buildParadasPayload en los modales).

export interface ParadaPayload {
  id_parada: number;
  hora_abordaje: string | null;
  segundos_recorrido_continuo: number | null;
  segundos_recorrido_mixto: number | null;
}

export interface CreateItinerarioPayload {
  id_ruta: number;
  id_logistica_ruta: number;
  turno: string;
  tipo: TipoItinerario;
  dias: DiaSemana[];
  hora_inicio: string | null;
  hora_fin: string | null;
  minutos_tolerancia_inicio: number;
  minutos_tolerancia_fin: number;
  minutos_tolerancia_anticipacion: number;
  fecha_inicio: string | null;
  paradas: ParadaPayload[];
}

// Errores de validación por campo
export type ItinerarioFieldErrors = Partial<
  Record<keyof CreateItinerarioPayload, string[]>
>;