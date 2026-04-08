import { useCallback, useMemo, useState } from "react";

import type { MapPoiItem } from "../types/map.types";
import { poiService } from "@/features/catalogs/pois/poiService";
import { toMapPoiItem } from "../adapters/poi.adapter";

/**
 * Hook para manejar el panel de puntos de interés.
 *
 * Responsabilidades:
 * - cargar catálogo de POIs
 * - filtrar por texto
 * - controlar selección múltiple
 */
export const usePoisDrawer = () => {
  const [pois, setPois] = useState<MapPoiItem[]>([]);
  const [selectedPoiIds, setSelectedPoiIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Carga catálogo de POIs desde el backend.
   */
  const loadPois = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const data = await poiService.getPois();
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
  }, []);

  /**
   * Alterna el estado de selección de un POI.
   */
  const togglePoi = useCallback((poi: MapPoiItem) => {
    setSelectedPoiIds((previousState) => {
      if (previousState.includes(poi.id_poi)) {
        return previousState.filter((id) => id !== poi.id_poi);
      }

      return [...previousState, poi.id_poi];
    });
  }, []);

  /**
   * Limpia la selección actual.
   */
  const clearSelection = useCallback(() => {
    setSelectedPoiIds([]);
  }, []);

  /**
   * Limpia el estado completo del hook.
   */
  const reset = useCallback(() => {
    setPois([]);
    setSelectedPoiIds([]);
    setSearch("");
    setError("");
  }, []);

  /**
   * Lista filtrada por nombre o dirección.
   */
  const filteredPois = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return pois;

    return pois.filter((poi) => {
      const name = poi.nombre.toLowerCase();
      const address = poi.direccion.toLowerCase();

      return (
        name.includes(normalizedSearch) ||
        address.includes(normalizedSearch)
      );
    });
  }, [pois, search]);

  /**
   * POIs actualmente seleccionados.
   */
  const selectedPois = useMemo(() => {
    return pois.filter((poi) => selectedPoiIds.includes(poi.id_poi));
  }, [pois, selectedPoiIds]);

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