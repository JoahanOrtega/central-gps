// src/features/maps/hooks/useUnitsLive.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { monitorService } from "../services/monitorService";
import type { MapUnitItem, UnitsLiveCounts } from "../types/map.types";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { useAutoRefresh } from "./useAutoRefresh";
import { useUnitsDrawerStore } from "../stores/unitsDrawerStore";

// ── Conteos vacíos por defecto ────────────────────────────────────────────────
const EMPTY_COUNTS: UnitsLiveCounts = {
  total: 0,
  engine_on: 0,
  engine_off: 0,
  engine_unknown: 0,
};

// ── Configuración del polling ────────────────────────────────────────────────
const DEFAULT_REFRESH_INTERVAL_MS = 15_000;

interface UseUnitsLiveOptions {
  autoRefresh?: boolean;
  intervalMs?: number;
}

/**
 * Hook para manejar el panel de unidades en vivo.
 *
 * Responsabilidades:
 *   - Cargar unidades desde backend vía monitorService.
 *   - Detectar cambios REALES de empresa activa y resetear estado.
 *   - Polling automático cada N segundos.
 *   - Mantener estado de carga y conteos.
 *
 * Estado persistente en `unitsDrawerStore`:
 *   - `selectedIds`, `search`, `lastEmpresaId` viven en el store.
 *   - Razón: deben sobrevivir al desmontaje del componente UnitsDrawer.
 *
 * Distinción crítica — mount inicial vs cambio real de empresa:
 *   El useEffect de `idEmpresa` se dispara en 3 escenarios:
 *     1. Mount inicial (primer abrir del drawer)          → cargar datos
 *     2. Remount (cerrar + reabrir drawer)                → cargar datos, NO resetear
 *     3. Cambio real de empresa (dropdown del header)     → resetear TODO + cargar
 *
 *   Comparando `idEmpresa` con `store.lastEmpresaId` distinguimos los 3 casos.
 *   `lastEmpresaId` sobrevive al desmontaje (está en el store), así que al
 *   remount el valor sigue ahí y detectamos que no es un cambio real.
 */
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
      setIsLoading(false);
    }
  }, [idEmpresa]);

  // ── Reacción a idEmpresa ───────────────────────────────────────────────────
  // Distingue cambio REAL de empresa vs mount/remount del componente.
  useEffect(() => {
    // Acceso imperativo al store para comparar sin suscripción.
    // Usamos getState() porque solo necesitamos leer el valor actual,
    // no re-renderizar cuando cambia.
    const { lastEmpresaId, reset, setLastEmpresaId } =
      useUnitsDrawerStore.getState();

    // Normalizamos a string|null para comparación consistente.
    // (idEmpresa puede venir como number, undefined o null según tu hook).
    const currentEmpresaId: string | null =
      idEmpresa !== null && idEmpresa !== undefined ? String(idEmpresa) : null;

    if (lastEmpresaId !== currentEmpresaId) {
      // Cambio REAL de empresa (o primer mount absoluto de la sesión).
      // Solo reseteamos si ya había una empresa previa — evitamos resetear
      // en el primer mount absoluto (donde lastEmpresaId es null por inicio
      // del store, pero no porque el usuario cambió de empresa).
      if (lastEmpresaId !== null) {
        reset();
      }
      setLastEmpresaId(currentEmpresaId);
      setUnits([]);
      setCounts(EMPTY_COUNTS);
    }

    // Siempre cargar datos frescos al reaccionar a idEmpresa.
    // Esto cubre: primer mount, remount, y cambio de empresa.
    void loadUnits();
    // loadUnits depende de idEmpresa, así que cuando cambie idEmpresa,
    // loadUnits también cambiará de referencia y dispara el efecto.
  }, [idEmpresa, loadUnits]);

  // ── Polling automático ─────────────────────────────────────────────────────
  useAutoRefresh({
    callback: () => loadUnits(searchRef.current),
    intervalMs,
    enabled: autoRefresh && !!idEmpresa,
    immediate: false,
  });

  // ── Handlers que proxean al store ──────────────────────────────────────────
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
    setSearch,
    loadUnits,
    toggleUnit,
    clearSelection,
    reset,
  };
};