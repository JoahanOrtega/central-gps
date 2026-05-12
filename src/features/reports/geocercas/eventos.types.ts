// features/reports/geocercas/eventos.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tipos para el historial de eventos de geocerca y velocidad global.
//
// Separación Sistema A vs Sistema B:
//   Sistema B — eventos generados por el backend (este módulo):
//     3/4   Velocidad global (sin POI asociado, id_poi puede ser null)
//     10/11 Entrada/Salida de geocerca
//     12/13 Permanencia excedida/insuficiente
//     14/15 Velocidad en POI inicio/fin
//     19    Paso por geocerca (trayectoria cruza sin entrar)
//
//   Sistema A — eventos del hardware Suntech (NO en este módulo):
//     33/34 Ignición ON/OFF  |  42 Pánico  |  41 Desconexión

// Un evento retornado por GET /eventos
export interface EventoGeocerca {
    id_evento: number;
    id_empresa: number;
    id_unidad: number;
    // id_poi puede ser null para eventos globales (ev. 3 y 4)
    id_poi: number | null;
    tipo_evento: TipoEventoGeocerca;
    fecha_hora_gmt: string;             // ISO 8601 con offset -06:00
    payload: string | null;
    numero_unidad: string;
    marca_unidad: string | null;
    // nombre_poi puede ser null para eventos sin POI (ev. 3 y 4)
    nombre_poi: string | null;
    descripcion: string;
}

// Todos los tipos de evento que genera el Sistema B.
// 3/4 = velocidad global  |  10-15 = geocerca  |  19 = paso
export type TipoEventoGeocerca = 3 | 4 | 10 | 11 | 12 | 13 | 14 | 15 | 19;

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
    desde?: string;         // ISO 8601
    hasta?: string;         // ISO 8601
    id_unidad?: number | null;
    id_poi?: number | null;
    tipos_evento?: number[];
    pagina?: number;
    limite?: number;
}

// Configuración visual por tipo de evento
export interface TipoEventoConfig {
    label: string;
    color: string;     // clase Tailwind de texto
    bg: string;     // clase Tailwind de fondo
    dot: string;     // clase Tailwind del punto de color
    // Grupo visual para separar geocerca vs velocidad global en el filtro
    grupo: "geocerca" | "velocidad";
}

// Mapa completo de configuración visual.
// Heurística Hick's Law: colores semánticos consistentes —
//   Verde/gris = movimiento (entrar/salir/paso)
//   Ámbar/naranja = tiempo (permanencia)
//   Rojo/azul = velocidad (exceso/normalización)
//   Púrpura = velocidad global (diferente al rojo de POI para distinguir contexto)
export const TIPOS_EVENTO_CONFIG: Record<TipoEventoGeocerca, TipoEventoConfig> = {
    // ── Velocidad global (sin POI) ────────────────────────────────────────────
    3: { label: "Exceso de velocidad", color: "text-purple-700", bg: "bg-purple-50", dot: "bg-purple-500", grupo: "velocidad" },
    4: { label: "Velocidad normalizada", color: "text-violet-700", bg: "bg-violet-50", dot: "bg-violet-400", grupo: "velocidad" },

    // ── Geocerca — movimiento ─────────────────────────────────────────────────
    10: { label: "Entró al POI", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500", grupo: "geocerca" },
    11: { label: "Salió del POI", color: "text-slate-600", bg: "bg-slate-100", dot: "bg-slate-400", grupo: "geocerca" },
    19: { label: "Paso por geocerca", color: "text-cyan-700", bg: "bg-cyan-50", dot: "bg-cyan-500", grupo: "geocerca" },

    // ── Geocerca — permanencia ────────────────────────────────────────────────
    12: { label: "Permanencia excedida", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500", grupo: "geocerca" },
    13: { label: "Permanencia insufic.", color: "text-orange-700", bg: "bg-orange-50", dot: "bg-orange-500", grupo: "geocerca" },

    // ── Geocerca — velocidad en POI ───────────────────────────────────────────
    14: { label: "Exceso vel. en POI", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500", grupo: "geocerca" },
    15: { label: "Vel. normalizada POI", color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500", grupo: "geocerca" },
};

// Grupos para el panel de filtros — separa visualmente velocidad global de geocerca
export const GRUPOS_EVENTO: Record<"geocerca" | "velocidad", string> = {
    geocerca: "Geocerca",
    velocidad: "Velocidad global",
};