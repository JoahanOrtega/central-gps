/**
 * tripDrawerStore.ts — Estado persistente del panel de Recorridos.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Problema que resuelve
 * ═══════════════════════════════════════════════════════════════════════════
 * Cuando el `TripDrawer` se cierra, React desmonta el componente y con él
 * los hooks `useTripDrawer` + `useTripMonitor`. Eso provocaba que se
 * perdiera TODO el contexto de trabajo del usuario:
 *   - La unidad seleccionada en el dropdown
 *   - El rango de tiempo elegido
 *   - La polilínea dibujada en el mapa
 *   - Los toggles de capas (flags, arrows, stops, engine)
 *   - Las fechas del rango personalizado
 *
 * Este store mueve ese estado "fuera" del ciclo de vida del componente,
 * manteniéndolo vivo durante toda la sesión del usuario en el mapa.
 *
 * Mismo patrón que `unitsDrawerStore` y `poisDrawerStore` — consistencia
 * arquitectónica entre los 3 drawers del feature de mapas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Qué vive acá (estado persistente entre cierres)
 * ═══════════════════════════════════════════════════════════════════════════
 * UX/Navegación:
 *   - selectedUnitImei: unidad elegida en el dropdown
 *   - search:           texto del buscador de unidades
 *   - mode:             estado actual del drawer (unit_select/predefined/custom/summary)
 *   - activeRangeKey:   botón de rango resaltado ("Hoy", "Ayer", etc.)
 *
 * Datos de la ruta cargada (para redibujar al reabrir):
 *   - selectedTripId:     id del trip específico si el usuario eligió uno
 *   - activeMode:         modo de ruta activo (latest, today, etc.)
 *   - currentRoutePoints: puntos de la polilínea dibujada
 *   - extendedSummary:    métricas calculadas (viajes, distancia, velocidades)
 *
 * Configuración del usuario:
 *   - customRange:        fechas del rango personalizado
 *   - displayOptions:     toggles de capas visibles en el mapa
 *
 * Tracking de sesión:
 *   - lastEmpresaId: para distinguir remount vs cambio real de empresa
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Qué NO vive acá (estado local en los hooks, se re-obtiene al montar)
 * ═══════════════════════════════════════════════════════════════════════════
 *   - units:                  lista del catálogo (re-fetch en cada mount)
 *   - unitSummary:            resumen liviano con polling cada 15s
 *   - recentTrips:            lista de trips recientes (se refresca con polling)
 *   - isLoadingUnits, isLoadingRoute, error: efímeros de red
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Leyes UX aplicadas
 * ═══════════════════════════════════════════════════════════════════════════
 *   User Control (Nielsen #3) → cerrar no pierde el análisis del usuario
 *   Consistency (Nielsen #4)  → patrón compartido con Units y Pois
 *   Recognition (Nielsen #6)  → al reabrir, reconoce su contexto previo
 *   Aesthetic-Usability       → la polilínea sigue visible, preserva foco visual
 */
import { create } from "zustand";
import type { RouteMode } from "../services/telemetryService";
import type {
    CustomRangeParams,
    RouteDisplayOptions,
    RoutePoint,
} from "../types/map.types";

/** Modo de navegación actual dentro del drawer. */
type DrawerMode = "unit_select" | "predefined" | "custom" | "summary";

/** Métricas calculadas del recorrido activo. */
interface ExtendedSummary {
    movementCount: number;
    distanceKm: number;
    movingSeconds: number;
    idleSeconds: number;
    offSeconds: number;
    speedingCount: number;
}

/**
 * Default de displayOptions. Coincide con el estado inicial que tenía
 * el hook useTripDrawer antes del refactor.
 */
const DEFAULT_DISPLAY_OPTIONS: RouteDisplayOptions = {
    flags: true,
    arrows: false,
    stops: true,
    speeding: true,
    engine: true,
    rfid: true,
    alerts: true,
    doors: true,
};

/** Default de customRange con fechas del día actual (se inicializa en el hook). */
const DEFAULT_CUSTOM_RANGE: CustomRangeParams = {
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
};

interface TripDrawerState {
    // ── UX/Navegación ────────────────────────────────────────────────────────
    selectedUnitImei: string;
    search: string;
    mode: DrawerMode;
    activeRangeKey: string | null;

    // ── Datos de ruta cargada ────────────────────────────────────────────────
    selectedTripId: string;
    activeMode: RouteMode | null;
    currentRoutePoints: RoutePoint[];
    extendedSummary: ExtendedSummary | null;

    // ── Configuración del usuario ────────────────────────────────────────────
    customRange: CustomRangeParams;
    displayOptions: RouteDisplayOptions;

    // ── Tracking de sesión ───────────────────────────────────────────────────
    lastEmpresaId: string | null;

    // ── Acciones ─────────────────────────────────────────────────────────────
    setSelectedUnitImei: (imei: string) => void;
    setSearch: (search: string) => void;
    setMode: (mode: DrawerMode) => void;
    setActiveRangeKey: (key: string | null) => void;

    setSelectedTripId: (id: string) => void;
    setActiveMode: (mode: RouteMode | null) => void;
    setCurrentRoutePoints: (points: RoutePoint[]) => void;
    setExtendedSummary: (summary: ExtendedSummary | null) => void;

    setCustomRange: (
        updater:
            | CustomRangeParams
            | ((prev: CustomRangeParams) => CustomRangeParams),
    ) => void;
    setDisplayOptions: (
        updater:
            | RouteDisplayOptions
            | ((prev: RouteDisplayOptions) => RouteDisplayOptions),
    ) => void;

    setLastEmpresaId: (id: string | null) => void;

    /** Resetea TODO el estado del drawer (al cambiar de empresa). */
    reset: () => void;

    /**
     * Resetea solo el estado relacionado con la ruta cargada.
     * Se usa al cambiar de unidad: la polilínea de la unidad anterior no
     * debe persistir cuando el usuario elige otra.
     */
    resetRouteState: () => void;
}

export const useTripDrawerStore = create<TripDrawerState>((set) => ({
    // Estado inicial
    selectedUnitImei: "",
    search: "",
    mode: "unit_select",
    activeRangeKey: null,

    selectedTripId: "",
    activeMode: null,
    currentRoutePoints: [],
    extendedSummary: null,

    customRange: DEFAULT_CUSTOM_RANGE,
    displayOptions: DEFAULT_DISPLAY_OPTIONS,

    lastEmpresaId: null,

    // Setters simples
    setSelectedUnitImei: (imei) => set({ selectedUnitImei: imei }),
    setSearch: (search) => set({ search }),
    setMode: (mode) => set({ mode }),
    setActiveRangeKey: (key) => set({ activeRangeKey: key }),

    setSelectedTripId: (id) => set({ selectedTripId: id }),
    setActiveMode: (mode) => set({ activeMode: mode }),
    setCurrentRoutePoints: (points) => set({ currentRoutePoints: points }),
    setExtendedSummary: (summary) => set({ extendedSummary: summary }),

    // Setters con soporte para updater function (patrón similar a useState)
    setCustomRange: (updater) =>
        set((state) => ({
            customRange:
                typeof updater === "function" ? updater(state.customRange) : updater,
        })),

    setDisplayOptions: (updater) =>
        set((state) => ({
            displayOptions:
                typeof updater === "function"
                    ? updater(state.displayOptions)
                    : updater,
        })),

    setLastEmpresaId: (id) => set({ lastEmpresaId: id }),

    // Resets
    reset: () =>
        set({
            selectedUnitImei: "",
            search: "",
            mode: "unit_select",
            activeRangeKey: null,
            selectedTripId: "",
            activeMode: null,
            currentRoutePoints: [],
            extendedSummary: null,
            customRange: DEFAULT_CUSTOM_RANGE,
            displayOptions: DEFAULT_DISPLAY_OPTIONS,
            // lastEmpresaId lo mantiene el hook por separado
        }),

    resetRouteState: () =>
        set({
            selectedTripId: "",
            activeMode: null,
            currentRoutePoints: [],
            extendedSummary: null,
        }),
}));