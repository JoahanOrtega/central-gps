// src/features/maps/hooks/useUnitsLive.ts
import { useCallback, useEffect, useMemo, useState } from "react";

import { monitorService } from "../services/monitorService";
import type { MapUnitItem, UnitsLiveCounts } from "../types/map.types";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";

// ── Conteos vacíos por defecto ────────────────────────────────────────────────
// Se usan cuando aún no ha llegado la primera respuesta del backend o cuando
// hay un error — así los consumidores (ej: badge del UnitsDrawer) nunca
// reciben undefined en `counts`.
const EMPTY_COUNTS: UnitsLiveCounts = {
  total: 0,
  engine_on: 0,
  engine_off: 0,
  engine_unknown: 0,
};

/**
 * Hook para manejar el panel de unidades en vivo.
 *
 * Responsabilidades (clean code: una sola razón para cambiar):
 *   - Cargar unidades desde backend vía monitorService (que ya valida el shape).
 *   - Recargar automáticamente cuando cambia la empresa activa.
 *   - Mantener estado de búsqueda, selección y carga.
 *   - Exponer conteos agregados pre-calculados por el backend.
 *
 * NOTA sobre la validación del shape:
 *   La garantía de que `units` es un array y `counts` tiene los 4 campos
 *   numéricos la da monitorService.normalizeUnitsLive. Este hook asume
 *   que la promesa resuelta trae datos válidos. Si falla la promesa
 *   (network error, 5xx, shape irreconocible), el catch garantiza que
 *   el estado se reinicie a valores seguros (arrays vacíos / ceros).
 */
export const useUnitsLive = () => {
  const [units, setUnits] = useState<MapUnitItem[]>([]);
  const [counts, setCounts] = useState<UnitsLiveCounts>(EMPTY_COUNTS);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { idEmpresa } = useEmpresaActiva();

  const loadUnits = useCallback(async (searchValue = "") => {
    setIsLoading(true);
    setError("");

    try {
      // El service ya validó el shape y normalizó el fallback legacy.
      // Aquí podemos desestructurar con confianza.
      const { units: freshUnits, counts: freshCounts } =
        await monitorService.getUnitsLive(searchValue, idEmpresa);

      setUnits(freshUnits);
      setCounts(freshCounts);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No fue posible cargar las unidades";
      setError(message);
      // Recuperación segura: nunca dejar `units` como undefined.
      setUnits([]);
      setCounts(EMPTY_COUNTS);
    } finally {
      setIsLoading(false);
    }
    // idEmpresa como dependencia — garantiza que al cambiar empresa,
    // loadUnits use el id correcto y no el del closure anterior.
  }, [idEmpresa]);

  // Recargar y limpiar selección cuando cambia la empresa activa
  useEffect(() => {
    setUnits([]);
    setCounts(EMPTY_COUNTS);
    setSelectedIds([]);
    setSearch("");
    void loadUnits();
  }, [idEmpresa, loadUnits]);

  const toggleUnit = useCallback((unit: MapUnitItem) => {
    setSelectedIds((prev) =>
      prev.includes(unit.id)
        ? prev.filter((id) => id !== unit.id)
        : [...prev, unit.id],
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const reset = useCallback(() => {
    setUnits([]);
    setCounts(EMPTY_COUNTS);
    setSelectedIds([]);
    setSearch("");
    setError("");
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