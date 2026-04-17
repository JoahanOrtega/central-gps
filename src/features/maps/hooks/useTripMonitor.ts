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
    () => units.find((unit) => unit.imei === selectedUnitImei) ?? null,
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
   */
  const loadUnits = useCallback(async (searchValue = '') => {
    try {
      setIsLoadingUnits(true);
      setError('');
      const response = await monitorService.getUnitsLive(searchValue, idEmpresa);
      setUnits(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible cargar las unidades';
      setError(message);
      notify.error(message);
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

        const summary = await telemetryService.getUnitSummary(imei);
        setUnitSummary(summary);

        if (!summary.hasTelemetry) {
          notify.warning("No hay información para mostrar");
          return;
        }

        const trips = await telemetryService.getRecentTrips(imei);
        setRecentTrips(trips);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No fue posible consultar la información de la unidad";

        setError(message);
      }
    },
    [resetRouteState],
  );

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
    [selectedUnitImei],
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
    [selectedUnitImei],
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