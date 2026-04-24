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
import { useTripDrawerStore } from "../stores/tripDrawerStore";

// Intervalo de polling para refrescar summary + trips de la unidad
// seleccionada. 15s balancea "sensación de tiempo real" vs carga en backend.
const SELECTED_UNIT_REFRESH_MS = 15_000;

/**
 * Estado central del drawer de recorridos — nivel de datos.
 *
 * Responsabilidades:
 *   - Carga de unidades desde backend
 *   - Selección de unidad (lleva a carga de summary + trips recientes)
 *   - Carga de recorridos por modo (today, yesterday, latest, etc.)
 *   - Carga de trips específicos por ID
 *   - Polling de la unidad seleccionada cada 15s
 *
 * Estado persistente en `tripDrawerStore`:
 *   - `selectedUnitImei`:     unidad elegida (sobrevive al desmontaje)
 *   - `selectedTripId`:       trip específico cargado
 *   - `activeMode`:           modo de ruta activo
 *   - `currentRoutePoints`:   polilínea dibujada (para redibujar al reabrir)
 *
 * Estado local (se re-fetchea al montar):
 *   - `units`:        catálogo de unidades disponibles
 *   - `unitSummary`:  resumen liviano (con polling)
 *   - `recentTrips`:  trips recientes (con polling)
 */
export const useTripMonitor = () => {
  // Estado local: datos del backend (volátiles).
  const [units, setUnits] = useState<MapUnitItem[]>([]);
  const [unitSummary, setUnitSummary] = useState<TripUnitSummary | null>(null);
  const [recentTrips, setRecentTrips] = useState<RecentTripItem[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [error, setError] = useState("");

  // Estado persistente desde el store (suscripciones granulares para
  // que cambiar un slice no re-renderice hooks que leen otros slices).
  const selectedUnitImei = useTripDrawerStore((s) => s.selectedUnitImei);
  const selectedTripId = useTripDrawerStore((s) => s.selectedTripId);
  const activeMode = useTripDrawerStore((s) => s.activeMode);
  const currentRoutePoints = useTripDrawerStore((s) => s.currentRoutePoints);

  const setSelectedUnitImeiInStore = useTripDrawerStore(
    (s) => s.setSelectedUnitImei,
  );
  const setSelectedTripIdInStore = useTripDrawerStore(
    (s) => s.setSelectedTripId,
  );
  const setActiveModeInStore = useTripDrawerStore((s) => s.setActiveMode);
  const setCurrentRoutePointsInStore = useTripDrawerStore(
    (s) => s.setCurrentRoutePoints,
  );
  const resetRouteStateInStore = useTripDrawerStore((s) => s.resetRouteState);

  const { idEmpresa } = useEmpresaActiva();

  /**
   * Unidad completa seleccionada — derivada del catálogo + imei persistido.
   * Array.isArray es guard defensivo: units siempre debería ser array
   * (lo garantiza loadUnits y el service), pero previene crashes si
   * un consumidor externo muta el estado de forma inesperada.
   */
  const selectedUnit = useMemo(
    () =>
      Array.isArray(units)
        ? (units.find((unit) => unit.imei === selectedUnitImei) ?? null)
        : null,
    [units, selectedUnitImei],
  );

  /** Filtra recorridos insignificantes para evitar ruido visual. */
  const visibleTrips = useMemo(
    () =>
      recentTrips.filter(
        (trip) => trip.distance_km > 0.05 && trip.duration_seconds > 0,
      ),
    [recentTrips],
  );

  /**
   * Limpia el estado del recorrido actual.
   * Usado al cambiar de unidad: la polilínea/trip de la unidad anterior
   * no debe persistir cuando el usuario elige otra.
   */
  const resetRouteState = useCallback(() => {
    setUnitSummary(null);
    setRecentTrips([]);
    resetRouteStateInStore();
  }, [resetRouteStateInStore]);

  /**
   * Carga unidades disponibles.
   * idEmpresa se pasa explícitamente para soportar sudo_erp.
   * Garantía defensiva: ante error, units queda en `[]` (nunca undefined).
   */
  const loadUnits = useCallback(
    async (searchValue = "") => {
      setIsLoadingUnits(true);
      setError("");

      try {
        const { units: freshUnits } = await monitorService.getUnitsLive(
          searchValue,
          idEmpresa,
        );
        setUnits(freshUnits);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No fue posible cargar las unidades";
        setError(message);
        notify.error(message);
        setUnits([]);
      } finally {
        setIsLoadingUnits(false);
      }
    },
    [idEmpresa],
  );

  /**
   * Selecciona una unidad y carga su resumen + trips recientes.
   * Si el imei coincide con el ya persistido en el store, NO limpia la
   * ruta previa (caso típico: el usuario remonteó el drawer, no eligió
   * una unidad distinta). Así la polilínea y el resumen se preservan.
   */
  const selectUnit = useCallback(
    async (imei: string) => {
      // Si es la MISMA unidad que ya teníamos seleccionada, no reseteamos
      // la ruta. Esto permite que al remontar el drawer con unidad
      // persistida, el trip activo no se borre.
      const isSameUnit = imei === selectedUnitImei && imei !== "";

      setSelectedUnitImeiInStore(imei);

      if (!isSameUnit) {
        resetRouteState();
      }

      if (!imei) return;

      try {
        setError("");

        const summary = await telemetryService.getUnitSummary(imei, idEmpresa);
        setUnitSummary(summary);

        if (!summary.hasTelemetry) {
          if (!isSameUnit) {
            notify.warning("No hay información para mostrar");
          }
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
    [
      resetRouteState,
      idEmpresa,
      selectedUnitImei,
      setSelectedUnitImeiInStore,
    ],
  );

  /**
   * Refresca silenciosamente los datos de la unidad ya seleccionada.
   * No resetea estado visible (ruta, trip) — solo summary y recentTrips.
   * No muestra errores visuales (sería molesto cada 15s).
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
      // Silencioso: error puntual en background no debe alarmar al usuario.
    }
  }, [selectedUnitImei, idEmpresa]);

  useAutoRefresh({
    callback: refreshSelectedUnit,
    intervalMs: SELECTED_UNIT_REFRESH_MS,
    enabled: !!selectedUnitImei,
    immediate: false,
  });

  /** Carga una ruta por modo predefinido (today, yesterday, latest, etc.). */
  const loadRouteByMode = useCallback(
    async (mode: RouteMode) => {
      if (!selectedUnitImei) return [];

      try {
        setIsLoadingRoute(true);
        setError("");
        setSelectedTripIdInStore("");
        setActiveModeInStore(mode);

        const points = await telemetryService.getRouteByMode(
          selectedUnitImei,
          mode,
          idEmpresa,
        );

        if (!points.length) {
          setCurrentRoutePointsInStore([]);
          notify.warning("No hay información para mostrar");
          return [];
        }

        setCurrentRoutePointsInStore(points);
        return points;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No fue posible cargar el recorrido";

        setError(message);
        setCurrentRoutePointsInStore([]);
        return [];
      } finally {
        setIsLoadingRoute(false);
      }
    },
    [
      selectedUnitImei,
      idEmpresa,
      setSelectedTripIdInStore,
      setActiveModeInStore,
      setCurrentRoutePointsInStore,
    ],
  );

  /** Carga el detalle de un recorrido específico por ID. */
  const loadTripById = useCallback(
    async (tripId: string) => {
      setSelectedTripIdInStore(tripId);
      setActiveModeInStore(null);

      if (!selectedUnitImei || !tripId) {
        setCurrentRoutePointsInStore([]);
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
          setCurrentRoutePointsInStore([]);
          notify.warning("No hay información para mostrar");
          return [];
        }

        setCurrentRoutePointsInStore(points);
        return points;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No fue posible cargar el recorrido";

        setError(message);
        setCurrentRoutePointsInStore([]);
        return [];
      } finally {
        setIsLoadingRoute(false);
      }
    },
    [
      selectedUnitImei,
      idEmpresa,
      setSelectedTripIdInStore,
      setActiveModeInStore,
      setCurrentRoutePointsInStore,
    ],
  );

  /** Limpia completamente el estado del feature. */
  const resetAll = useCallback(() => {
    setUnits([]);
    setUnitSummary(null);
    setRecentTrips([]);
    setError("");
    useTripDrawerStore.getState().reset();
  }, []);

  // Wrappers que proxean al store manteniendo la API pública del hook.
  const setSelectedTripId = useCallback(
    (id: string) => setSelectedTripIdInStore(id),
    [setSelectedTripIdInStore],
  );
  const setActiveMode = useCallback(
    (mode: RouteMode | null) => setActiveModeInStore(mode),
    [setActiveModeInStore],
  );

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