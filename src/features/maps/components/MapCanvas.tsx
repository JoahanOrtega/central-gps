import { forwardRef, useImperativeHandle } from "react";
import type { MapPoiItem, MapUnitItem, RoutePoint } from "../types/map.types";

import { useMapInit } from "../hooks/useMapInit";
import { useMapPois } from "../hooks/useMapPois";
import { useMapUnits } from "../hooks/useMapUnits";
import { useMapRoute } from "../hooks/useMapRoute";

// ── API imperativa expuesta al componente padre (MapsView) ────
// Permite que MapsView controle el mapa sin acceder a su estado
// interno — patrón forwardRef + useImperativeHandle.
export interface MapCanvasHandle {
  focusMexico: () => void;
  toggleTraffic: () => void;
  clearMap: () => void;
  searchAddress: (address: string) => Promise<void>;
  toggleFullscreen: () => void;

  focusPoi: (poi: MapPoiItem) => void;
  showPois: (pois: MapPoiItem[]) => void;
  hidePois: () => void;

  focusUnit: (unit: MapUnitItem) => void;
  showUnits: (units: MapUnitItem[]) => void;
  hideUnits: () => void;

  showUnitRoute: (points: RoutePoint[], unitLabel?: string) => void;
  hideUnitRoute: () => void;
  setRouteVisible: (visible: boolean) => void;
  setRouteStartEndVisible: (visible: boolean) => void;
  setRouteDirectionVisible: (visible: boolean) => void;
}

/**
 * Componente coordinador del mapa de Google Maps.
 *
 * Responsabilidad única: montar los hooks especializados y exponer
 * su API imperativa al componente padre mediante useImperativeHandle.
 *
 * Toda la lógica de negocio vive en los hooks:
 *   - useMapInit    → inicialización, tráfico, búsqueda, fullscreen
 *   - useMapPois    → markers y geometrías de Puntos de Interés
 *   - useMapUnits   → markers de unidades en monitoreo
 *   - useMapRoute   → polyline, flechas y markers de recorridos
 */
export const MapCanvas = forwardRef<MapCanvasHandle>((_, ref) => {

  // ── Inicialización del mapa ───────────────────────────────────
  // mapRef e infoWindowRef son compartidos con los demás hooks
  // para que todos operen sobre la misma instancia del mapa.
  const {
    containerRef,
    mapRef,
    infoWindowRef,
    focusMexico,
    toggleTraffic,
    searchAddress,
    toggleFullscreen,
  } = useMapInit();

  // ── Puntos de Interés ─────────────────────────────────────────
  const { focusPoi, showPois, hidePois } = useMapPois({
    mapRef,
    infoWindowRef,
  });

  // ── Unidades en monitoreo ─────────────────────────────────────
  const { focusUnit, showUnits, hideUnits } = useMapUnits({
    mapRef,
    infoWindowRef,
  });

  // ── Recorridos de telemetría ──────────────────────────────────
  const {
    showUnitRoute,
    hideUnitRoute,
    setRouteVisible,
    setRouteStartEndVisible,
    setRouteDirectionVisible,
  } = useMapRoute({ mapRef, infoWindowRef });

  // ── API imperativa hacia MapsView ─────────────────────────────
  useImperativeHandle(ref, () => ({
    focusMexico,
    toggleTraffic,
    searchAddress,
    toggleFullscreen,

    // Limpiar todos los elementos activos del mapa
    clearMap: () => {
      hidePois();
      hideUnits();
      hideUnitRoute();
    },

    focusPoi,
    showPois,
    hidePois,

    focusUnit,
    showUnits,
    hideUnits,

    showUnitRoute,
    hideUnitRoute,
    setRouteVisible,
    setRouteStartEndVisible,
    setRouteDirectionVisible,
  }));

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
      <div className="absolute right-4 top-2 z-[1] flex flex-col gap-3">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          title="Pantalla completa"
          onClick={toggleFullscreen}
        >
          ⛶
        </button>
      </div>

      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
});

MapCanvas.displayName = "MapCanvas";