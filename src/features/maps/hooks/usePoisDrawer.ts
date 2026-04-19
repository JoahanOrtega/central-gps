import { useCallback, useEffect, useMemo, useState } from "react";

import type { MapPoiItem } from "../types/map.types";
import { poiService } from "@/features/catalogs/pois/poiService";
import { toMapPoiItem } from "../adapters/poi.adapter";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";

/**
 * Hook para manejar el panel de puntos de interés.
 *
 * Responsabilidades:
 * - cargar catálogo de POIs
 * - recargar automáticamente cuando cambia la empresa activa
 * - filtrar por texto
 * - controlar selección múltiple
 */
export const usePoisDrawer = () => {
  const [pois, setPois] = useState<MapPoiItem[]>([]);
  const [selectedPoiIds, setSelectedPoiIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { idEmpresa } = useEmpresaActiva();

  const loadPois = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      // idEmpresa es necesario para que el backend filtre por empresa.
      // Sin él, sudo_erp no tiene empresa en el JWT y la petición falla.
      const data = await poiService.getPois("", idEmpresa);
      setPois(data.map(toMapPoiItem));
      setSelectedPoiIds([]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible cargar los puntos de interés";
      setError(message);
    } finally {
      setIsLoading(false);
    }
    // idEmpresa como dependencia — garantiza que al cambiar empresa
    // loadPois use el id correcto y no el del closure anterior
  }, [idEmpresa]);

  // Recargar y limpiar selección cuando cambia la empresa activa
  useEffect(() => {
    setPois([]);
    setSelectedPoiIds([]);
    setSearch("");
    void loadPois();
  }, [idEmpresa, loadPois]);

  const togglePoi = useCallback((poi: MapPoiItem) => {
    setSelectedPoiIds((prev) =>
      prev.includes(poi.id_poi)
        ? prev.filter((id) => id !== poi.id_poi)
        : [...prev, poi.id_poi]
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedPoiIds([]), []);

  const reset = useCallback(() => {
    setPois([]);
    setSelectedPoiIds([]);
    setSearch("");
    setError("");
  }, []);

  const filteredPois = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pois;
    return pois.filter(
      (poi) =>
        poi.nombre.toLowerCase().includes(q) ||
        poi.direccion.toLowerCase().includes(q)
    );
  }, [pois, search]);

  const selectedPois = useMemo(
    () => pois.filter((poi) => selectedPoiIds.includes(poi.id_poi)),
    [pois, selectedPoiIds]
  );

  return {
    pois,
    filteredPois,
    selectedPois,
    selectedPoiIds,
    search,
    isLoading,
    error,
    setSearch,
    loadPois,
    togglePoi,
    clearSelection,
    reset,
  };
};