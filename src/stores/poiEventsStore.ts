/**
 * Responsabilidad:
 *   Almacenar los eventos recibidos por SSE durante la sesión activa,
 *   mantener un contador de no leídos y exponer acciones para marcarlos
 *   como leídos.
 */

import { create } from "zustand";

// ── Tipos ─────────────────────────────────────────────────────────────────────

/**
 * Tipos de evento del Sistema B (generados por el backend evaluador).
 * Espejo de los valores del backend (t_eventos.evento).
 *
 * Separación Sistema A vs Sistema B:
 *   3/4   = Velocidad global (sin POI — id_poi null)
 *   10/11 = Entrada/Salida de geocerca
 *   12/13 = Permanencia excedida/insuficiente
 *   14/15 = Velocidad en POI inicio/fin
 *   19    = Paso por geocerca (trayectoria cruza sin entrar)
 *
 * Los eventos del Sistema A (33/34 ignición, 42 pánico, etc.) vienen
 * directamente de t_data.tipo_alerta y no pasan por este store.
 */
export type TipoEventoPoi =
    | 3   // Inicio exceso de velocidad global
    | 4   // Fin exceso de velocidad global
    | 10  // Entró al POI
    | 11  // Salió del POI
    | 12  // Permanencia máxima excedida
    | 13  // Permanencia mínima no cumplida
    | 14  // Exceso de velocidad en POI inicio
    | 15  // Exceso de velocidad en POI fin
    | 19; // Paso por geocerca

export interface PoiEvent {
    /** ID único generado en el cliente al recibir el evento. */
    clientId: string;
    tipo_evento: TipoEventoPoi;
    id_empresa: number;
    id_unidad: number;
    numero_unidad: string;
    // id_poi y nombre_poi son null para eventos globales (ev. 3 y 4)
    // que no están asociados a ningún POI específico.
    id_poi: number | null;
    nombre_poi: string | null;
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

    // ── Acciones ──────────────────────────────────────────────────────────────
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