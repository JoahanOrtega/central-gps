/**
 * stores/poiEventsStore.ts — Estado global de eventos de geocerca
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Responsabilidad:
 *   Almacenar los eventos POI recibidos por SSE durante la sesión activa,
 *   mantener un contador de no leídos y exponer acciones para marcarlos
 *   como leídos.
 *
 * Por qué Zustand y no Context:
 *   Los eventos llegan desde el hook usePoiEvents (que vive fuera del árbol
 *   de componentes que los consume). Zustand permite escribir al store desde
 *   cualquier lugar sin providers ni prop drilling.
 *
 * Heurísticas UX aplicadas:
 *   - Nielsen #1 (Visibilidad del estado): el badge con conteo informa al
 *     usuario que hay eventos nuevos sin interrumpirlo (no modal bloqueante).
 *   - Nielsen #3 (Control del usuario): el usuario decide cuándo revisar los
 *     eventos — no se fuerza ninguna acción.
 *   - Hick's Law: el panel muestra máximo MAX_EVENTOS_HISTORIAL para no
 *     abrumar con información. Las más recientes reemplazan a las antiguas.
 */

import { create } from "zustand";

// ── Tipos ─────────────────────────────────────────────────────────────────────

/**
 * Tipos de evento de geocerca.
 * Espejo de los valores del backend (t_eventos_poi.tipo_evento).
 */
export type TipoEventoPoi =
    | 10  // Entró al POI
    | 11  // Salió del POI
    | 12  // Permanencia máxima excedida
    | 13  // Permanencia mínima no cumplida
    | 14  // Exceso de velocidad inicio
    | 15; // Exceso de velocidad fin

export interface PoiEvent {
    /** ID único generado en el cliente al recibir el evento. */
    clientId: string;
    tipo_evento: TipoEventoPoi;
    id_empresa: number;
    id_unidad: number;
    numero_unidad: string;
    id_poi: number;
    nombre_poi: string;
    latitud: string | null;
    longitud: string | null;
    velocidad: string | null;
    detalles: Record<string, unknown> | null;
    fecha_hora_evento: string;
    /** Timestamp local de cuándo llegó al cliente (para ordenar). */
    recibido_en: number;
    /** Si el usuario ya lo vio en el panel. */
    leido: boolean;
}

interface PoiEventsState {
    /** Lista de eventos (más reciente primero). */
    eventos: PoiEvent[];
    /** Número de eventos no leídos. */
    noLeidos: number;
    /** Estado de la conexión SSE. */
    conectado: boolean;

    // ── Acciones ───────────────────────────────────────────────────────────────
    agregarEvento: (raw: Omit<PoiEvent, "clientId" | "recibido_en" | "leido">) => void;
    marcarTodosLeidos: () => void;
    limpiarEventos: () => void;
    setConectado: (value: boolean) => void;
}

// Máximo de eventos en memoria — Hick's Law: no saturar al usuario.
const MAX_EVENTOS_HISTORIAL = 50;

// ── Store ─────────────────────────────────────────────────────────────────────

export const usePoiEventsStore = create<PoiEventsState>((set) => ({
    eventos: [],
    noLeidos: 0,
    conectado: false,

    /**
     * Agrega un nuevo evento al inicio de la lista.
     * Si se supera MAX_EVENTOS_HISTORIAL, elimina el más antiguo.
     * Incrementa el contador de no leídos.
     */
    agregarEvento: (raw) => {
        const nuevoEvento: PoiEvent = {
            ...raw,
            clientId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            recibido_en: Date.now(),
            leido: false,
        };

        set((state) => {
            const nuevosEventos = [nuevoEvento, ...state.eventos].slice(
                0,
                MAX_EVENTOS_HISTORIAL,
            );
            return {
                eventos: nuevosEventos,
                noLeidos: state.noLeidos + 1,
            };
        });
    },

    /**
     * Marca todos los eventos como leídos y resetea el contador.
     * Se llama cuando el usuario abre el panel de notificaciones.
     */
    marcarTodosLeidos: () =>
        set((state) => ({
            eventos: state.eventos.map((e) => ({ ...e, leido: true })),
            noLeidos: 0,
        })),

    /**
     * Limpia todos los eventos de memoria.
     * Se llama al cerrar sesión para no mostrar eventos de otra empresa.
     */
    limpiarEventos: () =>
        set({ eventos: [], noLeidos: 0 }),

    setConectado: (value) => set({ conectado: value }),
}));