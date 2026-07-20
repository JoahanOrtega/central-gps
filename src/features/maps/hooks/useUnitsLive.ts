import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { monitorService } from "../services/monitorService";
import type { MapUnitItem, UnitsLiveCounts } from "../types/map.types";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { useAutoRefresh } from "./useAutoRefresh";
import { useUnitsDrawerStore } from "../stores/unitsDrawerStore";

// Conteos vacíos por defecto
const EMPTY_COUNTS: UnitsLiveCounts = {
  total: 0,
  engine_on: 0,
  engine_off: 0,
  engine_unknown: 0,
};

// Configuración del polling
const DEFAULT_REFRESH_INTERVAL_MS = 15_000;

interface UseUnitsLiveOptions {
  autoRefresh?: boolean;
  intervalMs?: number;
}

// Hook que encapsula la lógica de polling y estado de las unidades en vivo.
export const useUnitsLive = (options: UseUnitsLiveOptions = {}) => {
  const {
    autoRefresh = true,
    intervalMs = DEFAULT_REFRESH_INTERVAL_MS,
  } = options;

  // Estado local: datos del backend (volátiles, polling los refresca).
  const [units, setUnits] = useState<MapUnitItem[]>([]);
  const [counts, setCounts] = useState<UnitsLiveCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isLoadingRef = useRef(false);

  // Estado persistente desde el store (suscripciones granulares).
  const selectedIds = useUnitsDrawerStore((state) => state.selectedIds);
  const search = useUnitsDrawerStore((state) => state.search);
  const toggleUnitInStore = useUnitsDrawerStore((state) => state.toggleUnit);
  const setSearchInStore = useUnitsDrawerStore((state) => state.setSearch);
  const clearSelectionInStore = useUnitsDrawerStore((state) => state.clearSelection);

  const { idEmpresa } = useEmpresaActiva();

  // Ref del search para que el polling siempre use el valor actual.
  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const loadUnits = useCallback(async (searchValue = "") => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    setError("");

    try {
      const { units: freshUnits, counts: freshCounts } =
        await monitorService.getUnitsLive(searchValue, idEmpresa);

      setUnits(freshUnits);
      setCounts(freshCounts);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No fue posible cargar las unidades";
      setError(message);
      setUnits([]);
      setCounts(EMPTY_COUNTS);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [idEmpresa]);

  // Efecto que carga las unidades al montar y cuando cambia la empresa activa.
  useEffect(() => {
    // Guard: si la empresa activa cambia, reseteamos el store y los datos locales.
    const { lastEmpresaId, reset, setLastEmpresaId } =
      useUnitsDrawerStore.getState();

    // Guard: si la empresa activa cambia, reseteamos el store y los datos locales.
    const currentEmpresaId: string | null =
      idEmpresa !== null && idEmpresa !== undefined ? String(idEmpresa) : null;

    if (lastEmpresaId !== currentEmpresaId) {
      // Si la empresa activa cambió, reseteamos el store y los datos locales.
      if (lastEmpresaId !== null) {
        reset();
      }
      setLastEmpresaId(currentEmpresaId);
      setUnits([]);
      setCounts(EMPTY_COUNTS);
    }

    // Guard: si no hay empresa activa, no hacemos nada más.
    if (currentEmpresaId === null) {
      setIsLoading(false);
      return;
    }

    // Carga inicial de unidades.
    void loadUnits();
  }, [idEmpresa, loadUnits]);

  // Polling automático
  useAutoRefresh({
    callback: () => loadUnits(searchRef.current),
    intervalMs,
    enabled: autoRefresh && !!idEmpresa,
    immediate: false,
  });

  // Handlers que proxean al store 
  // Mantienen la API pública del hook estable — UnitsDrawer.tsx no cambia.
  const toggleUnit = useCallback((unit: MapUnitItem) => {
    toggleUnitInStore(unit.id);
  }, [toggleUnitInStore]);

  const setSearch = useCallback((value: string) => {
    setSearchInStore(value);
  }, [setSearchInStore]);

  const clearSelection = useCallback(() => {
    clearSelectionInStore();
  }, [clearSelectionInStore]);

  const reset = useCallback(() => {
    setUnits([]);
    setCounts(EMPTY_COUNTS);
    setError("");
    useUnitsDrawerStore.getState().reset();
  }, []);

  const selectedUnits = useMemo(
    () => units.filter((unit) => selectedIds.includes(unit.id)),
    [units, selectedIds],
  );

  return {
    units,
    counts,
    selectedIds,
    selectedUnits,
    search,
    isLoading,
    error,
    // esperandoEmpresa indica si el hook está a la espera de que se resuelva la empresa activa.
    esperandoEmpresa: idEmpresa === null || idEmpresa === undefined,
    setSearch,
    loadUnits,
    toggleUnit,
    clearSelection,
    reset,
  };
};
