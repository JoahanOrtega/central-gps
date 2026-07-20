import { forwardRef, useImperativeHandle, useState, useCallback } from "react";
import { Play } from "lucide-react";
import type { MapPoiItem, MapUnitItem, RoutePoint } from "../types/map.types";
import type { Route as CatalogRoute } from "@/features/operation/routes/types/route.types";

import { useMapInit } from "../hooks/useMapInit";
import { useMapPois } from "../hooks/useMapPois";
import { useMapUnits } from "../hooks/useMapUnits";
import { useMapRoute } from "../hooks/useMapRoute";
import { useMapCatalogRoutes } from "../hooks/useMapCatalogRoutes";
import { RoutePlayback } from "./RoutePlayback";
import { UnitBottomSheet } from "./UnitBottomSheet";

// API imperativa que MapsView usa para controlar el mapa sin tocar su estado
// interno (patrón forwardRef + useImperativeHandle).
export interface MapCanvasHandle {
  focusMexico: () => void;
  focusUserLocation: () => void;
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
  showCatalogRoute: (route: CatalogRoute) => void;
  hideCatalogRoute: (idRuta: number) => void;
  clearCatalogRoutes: () => void;
  setRouteVisible: (visible: boolean) => void;
  setRouteStartEndVisible: (visible: boolean) => void;
  setRouteDirectionVisible: (visible: boolean) => void;
  // Controla una capa individual (stops, speed, engine, doors, rfid, alerts, arrows, flags).
  setLayerVisible: (layer: string, visible: boolean) => void;
  updateUnit: (unit: MapUnitItem) => void;
}

/**
 * Componente coordinador del mapa de Google Maps.
 *
 * Su única responsabilidad es montar los hooks especializados y exponer su API
 * imperativa al padre. Toda la lógica de negocio vive en los hooks:
 *   useMapInit    → inicialización, tráfico, búsqueda, fullscreen
 *   useMapPois    → markers y geometrías de Puntos de Interés
 *   useMapUnits   → markers de unidades en monitoreo
 *   useMapRoute   → polyline, flechas y markers de recorridos
 *   RoutePlayback → reproducción animada del recorrido (capa aparte)
 */
export const MapCanvas = forwardRef<MapCanvasHandle>((_, ref) => {
  // mapRef e infoWindowRef se comparten con los demás hooks para que todos
  // operen sobre la misma instancia del mapa.
  const {
    containerRef,
    mapRef,
    infoWindowRef,
    focusMexico,
    focusUserLocation,
    toggleTraffic,
    searchAddress,
    toggleFullscreen,
  } = useMapInit();

  const { focusPoi, showPois, hidePois } = useMapPois({
    mapRef,
    infoWindowRef,
  });

  // Unidad mostrada en el bottom sheet móvil (null = cerrado). En desktop
  // el detalle sigue siendo el InfoWindow anclado al marcador.
  const [unidadSheet, setUnidadSheet] = useState<MapUnitItem | null>(null);

  const { focusUnit, showUnits, hideUnits, updateUnit } = useMapUnits({
    mapRef,
    infoWindowRef,
    onSelectUnitMobile: setUnidadSheet,
  });

  const {
    showUnitRoute,
    hideUnitRoute,
    setRouteVisible,
    setRouteStartEndVisible,
    setRouteDirectionVisible,
    setLayerVisible,
  } = useMapRoute({ mapRef, infoWindowRef });

  const {
    showCatalogRoute,
    hideCatalogRoute,
    clearCatalogRoutes,
  } = useMapCatalogRoutes({ mapRef });

  // Puntos del recorrido activo, para alimentar a RoutePlayback. El playback es
  // una capa independiente: no toca los markers/polylines de useMapRoute.
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [playbackActive, setPlaybackActive] = useState(false);

  // Además de dibujar la ruta, captura sus puntos y resetea el playback previo.
  const handleShowRoute = useCallback(
    (points: RoutePoint[], unitLabel?: string) => {
      setRoutePoints(points);
      setPlaybackActive(false); // recorrido nuevo cierra el playback anterior
      showUnitRoute(points, unitLabel);
    },
    [showUnitRoute],
  );

  // Limpia el playback antes de ocultar la ruta.
  const handleHideRoute = useCallback(() => {
    setPlaybackActive(false);
    setRoutePoints([]);
    hideUnitRoute();
  }, [hideUnitRoute]);

  useImperativeHandle(ref, () => ({
    focusMexico,
    focusUserLocation,
    toggleTraffic,
    searchAddress,
    toggleFullscreen,

    clearMap: () => {
      hidePois();
      hideUnits();
      handleHideRoute();
      clearCatalogRoutes();
    },

    focusPoi,
    showPois,
    hidePois,

    focusUnit,
    showUnits,
    hideUnits,
    updateUnit,

    showUnitRoute: handleShowRoute,
    hideUnitRoute: handleHideRoute,
    showCatalogRoute,
    hideCatalogRoute,
    clearCatalogRoutes,
    setRouteVisible,
    setRouteStartEndVisible,
    setRouteDirectionVisible,
    setLayerVisible: (layer: string, visible: boolean) =>
      setLayerVisible(layer as keyof import('../types/map.types').RouteDisplayOptions, visible),
  }));

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
      <div className="absolute right-4 top-2 z-[1] flex flex-col gap-3">
        {/* El botón de playback solo aparece cuando hay un recorrido cargado. */}
        {routePoints.length >= 2 && (
          <button
            type="button"
            className={`flex h-10 w-10 items-center justify-center rounded border shadow-sm ${playbackActive
              ? "border-blue-500 bg-blue-600 text-white"
              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            title="Reproducir recorrido"
            onClick={() => setPlaybackActive((v) => !v)}
          >
            <Play className="h-4 w-4" />
          </button>
        )}
        {/* El botón de pantalla completa se retiró con el layout full-bleed */}
      </div>

      <div ref={containerRef} className="h-full w-full" />

      {/* Modo playback: capa independiente que se monta/desmonta con
          playbackActive y limpia su marcador y trail sin tocar el recorrido. */}
      {playbackActive && (
        <RoutePlayback
          map={mapRef.current}
          points={routePoints}
          onClose={() => setPlaybackActive(false)}
        />
      )}

      {/* Detalle de unidad en móvil — el propio componente se oculta en
          md+ (className md:hidden), donde manda el InfoWindow clásico. */}
      <UnitBottomSheet
        unit={unidadSheet}
        onClose={() => setUnidadSheet(null)}
      />
    </div>
  );
});

MapCanvas.displayName = "MapCanvas";