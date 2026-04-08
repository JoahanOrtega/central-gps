import { useCallback, useMemo, useState } from "react";

import { monitorService } from "../services/monitorService";
import type { MapUnitItem } from "../types/map.types";

/**
 * Hook para manejar el panel de unidades en vivo.
 *
 * Responsabilidades:
 * - cargar unidades desde backend
 * - mantener búsqueda local
 * - controlar selección múltiple
 * - exponer lista seleccionada
 */
export const useUnitsLive = () => {
  const [units, setUnits] = useState<MapUnitItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Carga unidades desde el backend.
   * Permite búsqueda opcional por número o texto asociado.
   */
  const loadUnits = useCallback(async (searchValue = "") => {
    try {
      setIsLoading(true);
      setError("");

      const response = await monitorService.getUnitsLive(searchValue);
      setUnits(response);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible cargar las unidades";

      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Cambia el estado de selección de una unidad.
   */
  const toggleUnit = useCallback((unit: MapUnitItem) => {
    setSelectedIds((previousState) =>
      previousState.includes(unit.id)
        ? previousState.filter((id) => id !== unit.id)
        : [...previousState, unit.id],
    );
  }, []);

  /**
   * Limpia la selección actual.
   */
  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  /**
   * Limpia completamente el estado del hook.
   */
  const reset = useCallback(() => {
    setUnits([]);
    setSelectedIds([]);
    setSearch("");
    setError("");
  }, []);

  /**
   * Unidades actualmente seleccionadas.
   */
  const selectedUnits = useMemo(() => {
    return units.filter((unit) => selectedIds.includes(unit.id));
  }, [units, selectedIds]);

  return {
    units,
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