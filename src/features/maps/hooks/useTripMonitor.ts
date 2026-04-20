import { useCallback, useMemo, useState } from "react";

import { monitorService } from "../services/monitorService";
import { telemetryService, type RouteMode } from "../services/telemetryService";
import type {
  MapUnitItem,
  RecentTripItem,
  RoutePoint,
  TripUnitSummary,
} from "../types/map.types";
import { notify } from "@/stores/notificationStore";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { useAutoRefresh } from "./useAutoRefresh";

// Intervalo de polling para refrescar summary + trips de la unidad
// seleccionada. 15s balancea "sensación de tiempo real" vs carga en backend.
const SELECTED_UNIT_REFRESH_MS = 15_000;

/**
 * Estado central del drawer de recorridos.
 * Este hook encapsula:
 * - carga de unidades
 * - selección de unidad
 * - carga de resumen
 * - carga de recorridos por modo
 * - carga de trips recientes
 */
export const useTripMonitor = () => {
  const [units, setUnits] = useState<MapUnitItem[]>([]);
  const [selectedUnitImei, setSelectedUnitImei] = useState("");
  const [unitSummary, setUnitSummary] = useState<TripUnitSummary | null>(null);
  const [recentTrips, setRecentTrips] = useState<RecentTripItem[]>([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [activeMode, setActiveMode] = useState<RouteMode | null>(null);

  const [currentRoutePoints, setCurrentRoutePoints] = useState<RoutePoint[]>([]);

  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [error, setError] = useState("");

  // Empresa activa — necesaria para sudo_erp que no tiene empresa fija en el JWT
  const { idEmpresa } = useEmpresaActiva();

  const selectedUnit = useMemo(
    // Guard defensivo: units siempre debería ser array (lo garantiza loadUnits
    // y el service), pero Array.isArray evita un crash si algún consumidor
    // externo muta el estado de forma inesperada.
    () =>
      Array.isArray(units)
        ? (units.find((unit) => unit.imei === selectedUnitImei) ?? null)
        : null,
    [units, selectedUnitImei],
  );

  /**
   * Filtra recorridos vacíos o insignificantes para evitar ruido visual.
   */
  const visibleTrips = useMemo(
    () =>
      recentTrips.filter(
        (trip) => trip.distance_km > 0.05 && trip.duration_seconds > 0,
      ),
    [recentTrips],
  );

  /**
   * Limpia el estado actual del recorrido seleccionado.
   */
  const resetRouteState = useCallback(() => {
    setUnitSummary(null);
    setRecentTrips([]);
    setSelectedTripId("");
    setActiveMode(null);
    setCurrentRoutePoints([]);
  }, []);

  /**
   * Carga unidades disponibles para consulta.
   * idEmpresa se pasa explícitamente para soportar sudo_erp.
   *
   * El service `monitorService.getUnitsLive` ya valida el shape y normaliza
   * respuestas legacy (array plano). Este hook solo necesita la lista
   * `units` — los conteos son responsabilidad de useUnitsLive.
   *
   * Garantía defensiva: ante cualquier error el estado `units` queda en
   * `[]`, nunca `undefined`. Esto previene `TypeError: units.find is not
   * a function` en el useMemo de `selectedUnit`.
   */
  const loadUnits = useCallback(async (searchValue = '') => {
    setIsLoadingUnits(true);
    setError('');

    try {
      const { units: freshUnits } = await monitorService.getUnitsLive(
        searchValue,
        idEmpresa,
      );
      setUnits(freshUnits);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No fue posible cargar las unidades';
      setError(message);
      notify.error(message);
      // Recuperación segura: nunca dejar units como undefined.
      setUnits([]);
    } finally {
      setIsLoadingUnits(false);
    }
  }, [idEmpresa]);

  /**
   * Selecciona una unidad y carga su resumen + trips recientes.
   */
  const selectUnit = useCallback(
    async (imei: string) => {
      setSelectedUnitImei(imei);
      resetRouteState();

      if (!imei) return;

      try {
        setError("");

        const summary = await telemetryService.getUnitSummary(imei, idEmpresa);
        setUnitSummary(summary);

        if (!summary.hasTelemetry) {
          notify.warning("No hay información para mostrar");
          return;
        }

        const trips = await telemetryService.getRecentTrips(imei, idEmpresa);
        setRecentTrips(trips);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No fue posible consultar la información de la unidad";

        setError(message);
      }
    },
    [resetRouteState, idEmpresa],
  );

  /**
   * Refresca SILENCIOSAMENTE los datos de la unidad ya seleccionada.
   *
   * Diferencias vs selectUnit:
   *   - No llama a resetRouteState(): el usuario puede estar viendo una
   *     ruta específica — no debe parpadear ni cerrarse.
   *   - No limpia selectedTripId ni currentRoutePoints.
   *   - No muestra notify.warning si no hay telemetría (sería molesto
   *     cada 15 segundos). Solo actualiza el resumen.
   *   - Solo actualiza summary + recentTrips, que son los campos que
   *     reflejan cambios en tiempo real (última posición, velocidad,
   *     estado del motor, nuevos recorridos registrados).
   *
   * Se usa desde el polling interno del hook — no se expone en el return
   * porque no tiene caso llamarla manualmente; useAutoRefresh la dispara.
   */
  const refreshSelectedUnit = useCallback(async () => {
    if (!selectedUnitImei) return;

    try {
      const summary = await telemetryService.getUnitSummary(
        selectedUnitImei,
        idEmpresa,
      );
      setUnitSummary(summary);

      if (summary.hasTelemetry) {
        const trips = await telemetryService.getRecentTrips(
          selectedUnitImei,
          idEmpresa,
        );
        setRecentTrips(trips);
      }
    } catch {
      // Silencioso: un error de red puntual en un refresh en background
      // no debe mostrar toast ni actualizar el estado de error visible.
      // El próximo tick lo vuelve a intentar.
    }
  }, [selectedUnitImei, idEmpresa]);

  // Polling de la unidad seleccionada: refresca cada 15s sin interrumpir
  // la navegación del usuario. Protegido contra solapamiento por el propio
  // useAutoRefresh (si un request tarda más que el intervalo, el siguiente
  // tick se ignora hasta que termine).
  useAutoRefresh({
    callback: refreshSelectedUnit,
    intervalMs: SELECTED_UNIT_REFRESH_MS,
    enabled: !!selectedUnitImei,
    // immediate:false → el primer dato lo trae selectUnit al seleccionar.
    // El polling arranca tras el primer intervalo.
    immediate: false,
  });

  /**
   * Carga una ruta por modo: último, hoy, ayer o antier.
   */
  const loadRouteByMode = useCallback(
    async (mode: RouteMode) => {
      if (!selectedUnitImei) return [];

      try {
        setIsLoadingRoute(true);
        setError("");
        setSelectedTripId("");
        setActiveMode(mode);

        const points = await telemetryService.getRouteByMode(
          selectedUnitImei,
          mode,
          idEmpresa,
        );

        if (!points.length) {
          setCurrentRoutePoints([]);
          notify.warning("No hay información para mostrar");
          return [];
        }

        setCurrentRoutePoints(points);
        return points;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No fue posible cargar el recorrido";

        setError(message);
        setCurrentRoutePoints([]);
        return [];
      } finally {
        setIsLoadingRoute(false);
      }
    },
    [selectedUnitImei, idEmpresa],
  );

  /**
   * Carga el detalle de un recorrido específico.
   */
  const loadTripById = useCallback(
    async (tripId: string) => {
      setSelectedTripId(tripId);
      setActiveMode(null);

      if (!selectedUnitImei || !tripId) {
        setCurrentRoutePoints([]);
        return [];
      }

      try {
        setIsLoadingRoute(true);
        setError("");

        const points = await telemetryService.getTripById(
          selectedUnitImei,
          tripId,
          idEmpresa,
        );

        if (!points.length) {
          setCurrentRoutePoints([]);
          notify.warning("No hay información para mostrar");
          return [];
        }

        setCurrentRoutePoints(points);
        return points;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No fue posible cargar el recorrido";

        setError(message);
        setCurrentRoutePoints([]);
        return [];
      } finally {
        setIsLoadingRoute(false);
      }
    },
    [selectedUnitImei, idEmpresa],
  );

  /**
   * Limpia completamente el estado del feature.
   */
  const resetAll = useCallback(() => {
    setUnits([]);
    setSelectedUnitImei("");
    setError("");
    resetRouteState();
  }, [resetRouteState]);

  return {
    units,
    selectedUnit,
    selectedUnitImei,
    unitSummary,
    recentTrips,
    visibleTrips,
    selectedTripId,
    activeMode,
    currentRoutePoints,
    isLoadingUnits,
    isLoadingRoute,
    error,

    loadUnits,
    selectUnit,
    loadRouteByMode,
    loadTripById,
    resetAll,
    setSelectedTripId,
    setActiveMode,
  };
};