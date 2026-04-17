// src/features/maps/hooks/useUnitsLive.ts
import { useCallback, useEffect, useMemo, useState } from "react";

import { monitorService } from "../services/monitorService";
import type { MapUnitItem } from "../types/map.types";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";

/**
 * Hook para manejar el panel de unidades en vivo.
 *
 * Responsabilidades:
 * - cargar unidades desde backend
 * - recargar automáticamente cuando cambia la empresa activa
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

  const { idEmpresa } = useEmpresaActiva();

  const loadUnits = useCallback(async (searchValue = "") => {
    try {
      setIsLoading(true);
      setError("");
      // idEmpresa es necesario para sudo_erp — pasarlo explícitamente
      const response = await monitorService.getUnitsLive(searchValue, idEmpresa);
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
    // idEmpresa como dependencia — garantiza que al cambiar empresa
    // loadUnits use el id correcto y no el del closure anterior
  }, [idEmpresa]);

  // Recargar y limpiar selección cuando cambia la empresa activa
  useEffect(() => {
    setUnits([]);
    setSelectedIds([]);
    setSearch("");
    void loadUnits();
  }, [idEmpresa, loadUnits]);

  const toggleUnit = useCallback((unit: MapUnitItem) => {
    setSelectedIds((prev) =>
      prev.includes(unit.id)
        ? prev.filter((id) => id !== unit.id)
        : [...prev, unit.id]
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const reset = useCallback(() => {
    setUnits([]);
    setSelectedIds([]);
    setSearch("");
    setError("");
  }, []);

  const selectedUnits = useMemo(
    () => units.filter((unit) => selectedIds.includes(unit.id)),
    [units, selectedIds]
  );

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