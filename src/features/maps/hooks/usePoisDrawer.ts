import { useCallback, useEffect, useMemo, useState } from "react";

import type { MapPoiItem } from "../types/map.types";
import { poiService } from "@/features/catalogs/pois/poiService";
import { toMapPoiItem } from "../adapters/poi.adapter";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { usePoisDrawerStore } from "../stores/poisDrawerStore";

/**
 * Hook para manejar el panel de puntos de interés.
 *
 * Responsabilidades:
 *   - Cargar catálogo de POIs desde backend.
 *   - Detectar cambios REALES de empresa activa y resetear estado.
 *   - Filtrar por texto.
 *   - Controlar selección múltiple.
 *
 * Estado persistente en `poisDrawerStore`:
 *   - `selectedPoiIds`, `search`, `lastEmpresaId` viven en el store Zustand.
 *   - Razón: deben sobrevivir al desmontaje del componente PoisDrawer.
 *     Sin esto, al cerrar+reabrir el panel la selección se perdía.
 *
 * Distinción crítica — mount inicial vs cambio real de empresa:
 *   El useEffect de `idEmpresa` se dispara en 3 escenarios:
 *     1. Mount inicial (primer abrir del drawer)        → cargar datos
 *     2. Remount (cerrar + reabrir drawer)              → cargar datos, NO resetear
 *     3. Cambio real de empresa (dropdown del header)   → resetear TODO + cargar
 *
 *   Comparando `idEmpresa` con `store.lastEmpresaId` distinguimos los 3 casos.
 *   `lastEmpresaId` sobrevive al desmontaje (vive en el store), así que al
 *   remount el valor sigue ahí y detectamos que no es un cambio real.
 */
export const usePoisDrawer = () => {
  // Estado local: datos del backend (se re-obtienen en cada mount).
  const [pois, setPois] = useState<MapPoiItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Estado persistente desde el store (suscripciones granulares).
  const selectedPoiIds = usePoisDrawerStore((state) => state.selectedPoiIds);
  const search = usePoisDrawerStore((state) => state.search);
  const togglePoiInStore = usePoisDrawerStore((state) => state.togglePoi);
  const setSearchInStore = usePoisDrawerStore((state) => state.setSearch);
  const clearSelectionInStore = usePoisDrawerStore((state) => state.clearSelection);

  const { idEmpresa } = useEmpresaActiva();

  const loadPois = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      // idEmpresa es necesario para que el backend filtre por empresa.
      // Sin él, sudo_erp no tiene empresa en el JWT y la petición falla.
      const data = await poiService.getPois("", idEmpresa);
      setPois(data.map(toMapPoiItem));
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
    // loadPois use el id correcto y no el del closure anterior.
  }, [idEmpresa]);

  // ── Reacción a idEmpresa ───────────────────────────────────────────────────
  // Distingue cambio REAL de empresa vs mount/remount del componente.
  useEffect(() => {
    const { lastEmpresaId, reset, setLastEmpresaId } =
      usePoisDrawerStore.getState();

    // Normalizamos a string|null para comparación consistente.
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
      setPois([]);
    }

    // Siempre cargar datos frescos al reaccionar a idEmpresa.
    // Esto cubre: primer mount, remount, y cambio de empresa.
    void loadPois();
  }, [idEmpresa, loadPois]);

  // ── Handlers que proxean al store ──────────────────────────────────────────
  // Mantienen la API pública del hook estable — PoisDrawer.tsx no cambia.
  const togglePoi = useCallback((poi: MapPoiItem) => {
    togglePoiInStore(poi.id_poi);
  }, [togglePoiInStore]);

  const setSearch = useCallback((value: string) => {
    setSearchInStore(value);
  }, [setSearchInStore]);

  const clearSelection = useCallback(() => {
    clearSelectionInStore();
  }, [clearSelectionInStore]);

  const reset = useCallback(() => {
    setPois([]);
    setError("");
    usePoisDrawerStore.getState().reset();
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