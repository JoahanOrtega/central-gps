import { ChevronRight, MapPin, Search, X } from "lucide-react";
import { useEffect } from "react";

import type { MapPoiItem } from "../../types/map.types";
import { usePoisDrawer } from "../../hooks/usePoisDrawer";
import { DrawerSkeletonList } from "@/components/shared/SkeletonCard";

interface PoisDrawerProps {
  onClose: () => void;
  onSelectPoi: (poi: MapPoiItem) => void;
  onPoisSelectionChange: (pois: MapPoiItem[]) => void;
  onPoisHidden: () => void;
}

/**
 * Drawer lateral de puntos de interés.
 * La lógica de carga, filtrado y selección vive en usePoisDrawer.
 */
export const PoisDrawer = ({
  onClose,
  onSelectPoi,
  onPoisSelectionChange,
  onPoisHidden,
}: PoisDrawerProps) => {
  const {
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
  } = usePoisDrawer();

  /**
   * Al abrir, carga POIs. Al cerrar, limpia selección.
   */
  useEffect(() => {

    clearSelection();
    onPoisHidden();
    void loadPois();
    return;

  }, [clearSelection, loadPois, onPoisHidden]);

  /**
   * Sincroniza la selección actual con el mapa.
   */
  useEffect(() => {
    onPoisSelectionChange(selectedPois);
  }, [selectedPois, onPoisSelectionChange]);

  /**
   * Cambia el estado de selección de un POI.
   * Si se acaba de seleccionar, además lo enfoca en el mapa.
   */
  const handleTogglePoi = (poi: MapPoiItem) => {
    const isSelected = selectedPoiIds.includes(poi.id_poi);

    togglePoi(poi);

    if (!isSelected) {
      onSelectPoi(poi);
    }
  };

  /**
   * Solo enfoca un POI si ya estaba seleccionado.
   */
  const handleRowClick = (poi: MapPoiItem) => {
    if (!selectedPoiIds.includes(poi.id_poi)) return;
    onSelectPoi(poi);
  };

  /**
   * Cierra el panel y limpia su estado local.
   */
  const handleClose = () => {
    clearSelection();
    onPoisHidden();
    reset();
    onClose();
  };

  return (
    <aside
      className={`absolute right-0 top-0 z-20 h-full w-full max-w-[92vw] sm:max-w-[380px] md:max-w-[420px] border-l border-slate-200 bg-white shadow-xl transition-transform duration-300 "translate-x-0"
        }`}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-slate-300 bg-white px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Puntos de interés..."
              className="h-10 w-full text-sm outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
            title="Cerrar panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && <DrawerSkeletonList count={8} />}

          {error && (
            <div className="px-4 py-6">
              <p className="text-sm text-rose-500">{error}</p>
              <button
                type="button"
                onClick={() => loadPois()}
                className="mt-3 text-sm text-sky-600 hover:underline"
              >
                Reintentar
              </button>
            </div>
          )}

          {!isLoading && !error && filteredPois.length === 0 && (
            <div className="px-4 py-6 text-sm text-slate-500">
              No hay puntos de interés para mostrar.
            </div>
          )}

          {!isLoading &&
            !error &&
            filteredPois.map((poi) => {
              const isChecked = selectedPoiIds.includes(poi.id_poi);

              return (
                <div
                  key={poi.id_poi}
                  className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 hover:bg-slate-50"
                >
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePoi(poi)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRowClick(poi)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500">
                      <MapPin className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">
                        {poi.nombre || "Sin nombre"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {poi.direccion || "Sin dirección"}
                      </p>
                    </div>
                  </button>

                  <div className="pt-1 text-slate-300">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </aside>
  );
};