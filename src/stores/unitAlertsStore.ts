/**
 * unitAlertsStore.ts — Alertas de estado crítico de unidades (SSE).
 *
 * Alimentado por usePoiEvents cuando llega un evento `unit_state_event`
 * del backend (unit_state_worker → Redis → /events/stream).
 *
 * Tipos de evento:
 *   20 → Apagado prolongado (más de 4 h con motor apagado)
 *   21 → Sin transmisión del equipo GPS (más de 6 min sin reportar)
 *
 * Se mantiene separado de poiEventsStore (Single Responsibility):
 * las alertas de estado tienen ciclo de vida y consumidores propios,
 * y mezclarlas contaminaría el contador de "no leídos" de geocercas.
 */
import { create } from "zustand";

// ── Tipos ─────────────────────────────────────────────────────────────────────
export type TipoAlertaEstado = 20 | 21;

export interface UnitStateAlert {
    /** ID único generado en el cliente para keys de React y descartes. */
    clientId: string;
    tipo_evento: TipoAlertaEstado;
    id_empresa: number;
    id_unidad: number;
    numero_unidad: string;
    descripcion: string;
    fecha_hora_evento: string;
    latitud: number | null;
    longitud: number | null;
    /** Timestamp local de recepción (para ordenar). */
    recibido_en: number;
}

// Máximo de alertas retenidas en memoria — las más viejas se descartan.
const MAX_ALERTAS = 50;

interface UnitAlertsState {
    /** Alertas ordenadas DESC (la más reciente primero). */
    alertas: UnitStateAlert[];

    /** Agrega una alerta recibida por SSE. */
    agregarAlerta: (
        raw: Omit<UnitStateAlert, "clientId" | "recibido_en">,
    ) => void;

    /** Limpia todas las alertas. */
    limpiarAlertas: () => void;
}

export const useUnitAlertsStore = create<UnitAlertsState>((set) => ({
    alertas: [],

    agregarAlerta: (raw) =>
        set((state) => ({
            alertas: [
                {
                    ...raw,
                    clientId: `${raw.id_unidad}-${raw.tipo_evento}-${Date.now()}`,
                    recibido_en: Date.now(),
                },
                ...state.alertas,
            ].slice(0, MAX_ALERTAS),
        })),

    limpiarAlertas: () => set({ alertas: [] }),
}));