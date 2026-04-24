import { useCallback, useEffect } from "react";
import { useTripMonitor } from "./useTripMonitor";
import { telemetryService } from "../services/telemetryService";
import { notify } from "@/stores/notificationStore";
import type {
    RoutePoint,
    PredefinedRange,
    CustomRangeParams,
    RouteDisplayOptions,
} from "../types/map.types";
import { haversineKm } from "../lib/map-geometry";
import { formatDurationHms, todayLocalString } from "@/lib/date-time";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { useTripDrawerStore } from "../stores/tripDrawerStore";

type DrawerMode = "unit_select" | "predefined" | "custom" | "summary";

interface UseTripDrawerOptions {
    onClose: () => void;
    onRouteSelected: (points: RoutePoint[]) => void;
    onRouteHidden: () => void;
    onRouteVisibilityChange: (visible: boolean) => void;
    onStartEndVisibilityChange: (visible: boolean) => void;
    onDirectionVisibilityChange: (visible: boolean) => void;
}

/**
 * Hook de alto nivel para el TripDrawer.
 *
 * Responsabilidades:
 *   - Coordinar useTripMonitor (datos) con la UI del drawer.
 *   - Calcular métricas extendidas al cargar una ruta.
 *   - Sincronizar displayOptions con el mapa (via callbacks del padre).
 *   - Cerrar el drawer SIN borrar el trabajo del usuario.
 *
 * Estado persistente en `tripDrawerStore`:
 *   - mode, search, customRange, displayOptions, extendedSummary
 *   - Los datos de useTripMonitor también viven en el store (selectedUnitImei,
 *     currentRoutePoints, etc.).
 *
 * Al cerrar el drawer:
 *   - La polilínea NO se borra (preserva análisis del usuario)
 *   - displayOptions NO se resetean
 *   - Al reabrir: el useEffect de mount redispara onRouteSelected con los
 *     puntos persistidos para redibujar la polilínea si hiciera falta.
 */
export const useTripDrawer = ({
    onClose,
    onRouteSelected,
    onRouteHidden,
    onRouteVisibilityChange,
    onStartEndVisibilityChange,
    onDirectionVisibilityChange,
}: UseTripDrawerOptions) => {
    const tripMonitor = useTripMonitor();
    const { idEmpresa } = useEmpresaActiva();

    // Estado UI desde el store (suscripciones granulares).
    const mode = useTripDrawerStore((s) => s.mode);
    const search = useTripDrawerStore((s) => s.search);
    const customRange = useTripDrawerStore((s) => s.customRange);
    const displayOptions = useTripDrawerStore((s) => s.displayOptions);
    const extendedSummary = useTripDrawerStore((s) => s.extendedSummary);
    const activeRangeKey = useTripDrawerStore((s) => s.activeRangeKey);

    const setModeInStore = useTripDrawerStore((s) => s.setMode);
    const setSearchInStore = useTripDrawerStore((s) => s.setSearch);
    const setCustomRangeInStore = useTripDrawerStore((s) => s.setCustomRange);
    const setDisplayOptionsInStore = useTripDrawerStore(
        (s) => s.setDisplayOptions,
    );
    const setExtendedSummaryInStore = useTripDrawerStore(
        (s) => s.setExtendedSummary,
    );
    const setActiveRangeKeyInStore = useTripDrawerStore(
        (s) => s.setActiveRangeKey,
    );

    // ── Inicialización de fechas default ───────────────────────────────────────
    // Solo setea fechas si el store tiene los campos vacíos (primer uso).
    // Si el usuario ya tenía fechas elegidas, no las pisa.
    useEffect(() => {
        if (!customRange.startDate && !customRange.endDate) {
            const today = todayLocalString();
            setCustomRangeInStore((prev) => ({
                ...prev,
                startDate: today,
                endDate: today,
            }));
        }
        // Deps vacías: solo corre una vez al mount — no queremos que re-inicialice
        // al cambiar customRange (causaría loop).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Detectar cambio real de empresa ────────────────────────────────────────
    // Mismo patrón que en useUnitsLive/usePoisDrawer:
    //   - Primer mount / remount → carga datos, NO resetea
    //   - Cambio real de empresa → reset total del store + carga
    useEffect(() => {
        const { lastEmpresaId, reset, setLastEmpresaId } =
            useTripDrawerStore.getState();

        const currentEmpresaId: string | null =
            idEmpresa !== null && idEmpresa !== undefined ? String(idEmpresa) : null;

        if (lastEmpresaId !== currentEmpresaId) {
            // Solo resetear si ya había empresa previa.
            if (lastEmpresaId !== null) {
                reset();
                // También reset de datos del monitor (units cacheadas de empresa previa).
                tripMonitor.resetAll();
            }
            setLastEmpresaId(currentEmpresaId);
        }

        // Siempre recargar unidades al reaccionar a idEmpresa.
        tripMonitor.loadUnits();
        // No dependemos de tripMonitor.loadUnits en deps — cambia cada render
        // porque useTripMonitor no lo memoiza contra idEmpresa estable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idEmpresa]);

    // ── Re-seleccionar unidad al montar si había una persistida ────────────────
    // Si el store tiene un selectedUnitImei (el usuario había elegido unidad
    // antes de cerrar), lo volvemos a seleccionar para que useTripMonitor
    // cargue el summary y trips recientes actualizados.
    useEffect(() => {
        if (tripMonitor.selectedUnitImei && tripMonitor.units.length > 0) {
            // Solo si el summary está vacío — evita refetch innecesarios en
            // cada render del tripMonitor.
            if (!tripMonitor.unitSummary) {
                void tripMonitor.selectUnit(tripMonitor.selectedUnitImei);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripMonitor.units.length, tripMonitor.selectedUnitImei]);

    // ── Redibujar polilínea persistida al montar ───────────────────────────────
    // Si había una ruta cargada antes de cerrar el drawer, la polilínea
    // sigue en el mapa (no la borramos en handleClose). Pero por si el
    // MapCanvas la limpió por alguna razón (ej: cambio de ruta React),
    // la redibujamos con los puntos persistidos.
    useEffect(() => {
        if (tripMonitor.currentRoutePoints.length > 0) {
            onRouteSelected(tripMonitor.currentRoutePoints);
        }
        // Solo al mount inicial. Los cambios posteriores los maneja
        // applyRouteToMap cuando el usuario carga otra ruta.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Sincronizar visibilidad de capas con el mapa ───────────────────────────
    // Estos useEffect propagan cambios de displayOptions al mapa.
    useEffect(() => {
        onRouteVisibilityChange(displayOptions.flags || displayOptions.arrows);
    }, [displayOptions.flags, displayOptions.arrows, onRouteVisibilityChange]);

    useEffect(() => {
        onStartEndVisibilityChange(displayOptions.flags);
    }, [displayOptions.flags, onStartEndVisibilityChange]);

    useEffect(() => {
        onDirectionVisibilityChange(displayOptions.arrows);
    }, [displayOptions.arrows, onDirectionVisibilityChange]);

    /**
     * Aplica una ruta recién cargada al mapa y calcula el resumen extendido.
     */
    const applyRouteToMap = useCallback(
        (points: RoutePoint[]) => {
            if (!points.length) {
                onRouteHidden();
                setExtendedSummaryInStore(null);
                return;
            }
            onRouteSelected(points);
            setModeInStore("summary");

            // Calcular resumen extendido con métricas útiles.
            let movementCount = 0;
            let distanceKm = 0;
            let movingSeconds = 0;
            let idleSeconds = 0;
            let offSeconds = 0;
            let speedingCount = 0;

            const SPEEDING_THRESHOLD = 80; // km/h

            for (let i = 1; i < points.length; i++) {
                const prev = points[i - 1];
                const curr = points[i];

                const deltaSeconds = Math.max(
                    0,
                    (new Date(curr.fecha_hora_gps).getTime() -
                        new Date(prev.fecha_hora_gps).getTime()) /
                    1000,
                );

                const speed = prev.velocidad ?? 0;
                const engineState = prev.engine_state;

                if (prev.latitud && prev.longitud && curr.latitud && curr.longitud) {
                    distanceKm += haversineKm(
                        prev.latitud,
                        prev.longitud,
                        curr.latitud,
                        curr.longitud,
                    );
                }

                if (speed > SPEEDING_THRESHOLD) {
                    speedingCount++;
                }

                if (engineState === "off") {
                    offSeconds += deltaSeconds;
                } else if (engineState === "on") {
                    if (speed >= 1) {
                        movingSeconds += deltaSeconds;
                        movementCount++;
                    } else {
                        idleSeconds += deltaSeconds;
                    }
                }
            }

            setExtendedSummaryInStore({
                movementCount,
                distanceKm: Number(distanceKm.toFixed(2)),
                movingSeconds,
                idleSeconds,
                offSeconds,
                speedingCount,
            });
        },
        [onRouteSelected, onRouteHidden, setExtendedSummaryInStore, setModeInStore],
    );

    /** Maneja selección de unidad desde el dropdown. */
    const handleUnitChange = async (imei: string) => {
        // Solo ocultar ruta si la unidad cambió realmente.
        // Si es la misma, el selectUnit internamente preserva la ruta.
        if (imei !== tripMonitor.selectedUnitImei) {
            onRouteHidden();
            setExtendedSummaryInStore(null);
            setActiveRangeKeyInStore(null);
        }
        await tripMonitor.selectUnit(imei);
        if (imei) {
            setModeInStore("predefined");
        } else {
            setModeInStore("unit_select");
        }
    };

    /** Carga una ruta por modo predefinido. */
    const handleLoadPredefinedRoute = async (range: PredefinedRange) => {
        if (!tripMonitor.selectedUnitImei) return;

        try {
            let points: RoutePoint[] = [];

            switch (range) {
                case "current":
                case "latest":
                    points = await tripMonitor.loadRouteByMode("latest");
                    break;
                case "today":
                    points = await tripMonitor.loadRouteByMode("today");
                    break;
                case "yesterday":
                    points = await tripMonitor.loadRouteByMode("yesterday");
                    break;
                case "day_before_yesterday":
                    points = await tripMonitor.loadRouteByMode("day_before_yesterday");
                    break;
                default:
                    points = await telemetryService.getRouteByCustomRange(
                        tripMonitor.selectedUnitImei,
                        { startDate: "", endDate: "" },
                    );
                    notify.info("Rango por tiempo no implementado aún");
                    return;
            }

            applyRouteToMap(points);
        } catch {
            notify.error("No se pudo cargar el recorrido");
        }
    };

    /** Carga una ruta por rango personalizado. */
    const handleLoadCustomRange = async () => {
        if (!tripMonitor.selectedUnitImei) return;

        try {
            const points = await telemetryService.getRouteByCustomRange(
                tripMonitor.selectedUnitImei,
                customRange,
            );
            applyRouteToMap(points);
        } catch {
            notify.error("No se pudo cargar el recorrido en el rango especificado");
        }
    };

    /**
     * Cierra el panel SIN borrar la polilínea del mapa ni el estado UX.
     *
     * Diferencia clave vs la versión anterior:
     *   - Antes: onRouteHidden() + onClose() → borraba la polilínea
     *   - Ahora: onClose() → solo oculta el panel
     *
     * La polilínea queda visible en el mapa. El estado del drawer (unidad,
     * rango, toggles) persiste en el store. Al reabrir, el usuario ve
     * todo como lo dejó.
     *
     * Para limpiar explícitamente, hay que cambiar de empresa o reset manual.
     */
    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    // Proxy al store para que el componente pueda setear estado directamente.
    const setMode = useCallback(
        (mode: DrawerMode) => setModeInStore(mode),
        [setModeInStore],
    );
    const setSearch = useCallback(
        (value: string) => setSearchInStore(value),
        [setSearchInStore],
    );
    const setCustomRange = useCallback(
        (
            updater:
                | CustomRangeParams
                | ((prev: CustomRangeParams) => CustomRangeParams),
        ) => setCustomRangeInStore(updater),
        [setCustomRangeInStore],
    );
    const setDisplayOptions = useCallback(
        (
            updater:
                | RouteDisplayOptions
                | ((prev: RouteDisplayOptions) => RouteDisplayOptions),
        ) => setDisplayOptionsInStore(updater),
        [setDisplayOptionsInStore],
    );
    const setActiveRangeKey = useCallback(
        (key: string | null) => setActiveRangeKeyInStore(key),
        [setActiveRangeKeyInStore],
    );

    const formatDuration = formatDurationHms;

    return {
        // Datos del monitor
        units: tripMonitor.units,
        selectedUnit: tripMonitor.selectedUnit,
        selectedUnitImei: tripMonitor.selectedUnitImei,
        unitSummary: tripMonitor.unitSummary,
        visibleTrips: tripMonitor.visibleTrips,
        selectedTripId: tripMonitor.selectedTripId,
        activeMode: tripMonitor.activeMode,
        currentRoutePoints: tripMonitor.currentRoutePoints,
        isLoadingUnits: tripMonitor.isLoadingUnits,
        isLoadingRoute: tripMonitor.isLoadingRoute,
        error: tripMonitor.error,

        // Estado UI (desde el store)
        mode,
        setMode,
        search,
        setSearch,
        customRange,
        setCustomRange,
        displayOptions,
        setDisplayOptions,
        extendedSummary,
        activeRangeKey,
        setActiveRangeKey,
        formatDuration,

        // Acciones
        loadUnits: tripMonitor.loadUnits,
        handleUnitChange,
        handleLoadPredefinedRoute,
        handleLoadCustomRange,
        handleLoadTripById: tripMonitor.loadTripById,
        handleClose,
    };
};