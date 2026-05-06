// features/reports/geocercas/eventos.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tipos para el historial de eventos de geocerca.

// Un evento de geocerca retornado por GET /eventos
export interface EventoGeocerca {
    id_evento: number;
    id_empresa: number;
    id_unidad: number;
    id_poi: number;
    tipo_evento: TipoEventoGeocerca;
    fecha_hora_gmt: string;   // ISO 8601
    payload: string | null;
    numero_unidad: string;
    marca_unidad: string | null;
    nombre_poi: string;
    descripcion: string;
}

// Tipos de evento de geocerca
export type TipoEventoGeocerca = 10 | 11 | 12 | 13 | 14 | 15;

// Respuesta paginada del endpoint GET /eventos
export interface EventosResponse {
    eventos: EventoGeocerca[];
    total: number;
    pagina: number;
    limite: number;
    total_paginas: number;
    tiene_mas: boolean;
}

// Filtros para la query
export interface EventosFiltros {
    desde?: string;   // ISO 8601
    hasta?: string;   // ISO 8601
    id_unidad?: number | null;
    id_poi?: number | null;
    tipos_evento?: number[];
    pagina?: number;
    limite?: number;
}

// Configuracion visual por tipo de evento
export interface TipoEventoConfig {
    label: string;
    color: string;   // clase Tailwind de texto
    bg: string;   // clase Tailwind de fondo
    dot: string;   // clase Tailwind del punto de color
}

export const TIPOS_EVENTO_CONFIG: Record<TipoEventoGeocerca, TipoEventoConfig> = {
    10: { label: "Entro al POI", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
    11: { label: "Salio del POI", color: "text-slate-600", bg: "bg-slate-100", dot: "bg-slate-400" },
    12: { label: "Permanencia excedida", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
    13: { label: "Permanencia insuficiente", color: "text-orange-700", bg: "bg-orange-50", dot: "bg-orange-500" },
    14: { label: "Exceso de velocidad", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" },
    15: { label: "Velocidad normalizada", color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" },
};