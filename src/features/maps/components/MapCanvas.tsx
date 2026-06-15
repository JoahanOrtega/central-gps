import { forwardRef, useImperativeHandle, useState, useCallback } from "react";
import { Play } from "lucide-react";
import type { MapPoiItem, MapUnitItem, RoutePoint } from "../types/map.types";

import { useMapInit } from "../hooks/useMapInit";
import { useMapPois } from "../hooks/useMapPois";
import { useMapUnits } from "../hooks/useMapUnits";
import { useMapRoute } from "../hooks/useMapRoute";
import { RoutePlayback } from "./RoutePlayback";

// ── API imperativa expuesta al componente padre (MapsView) ────
// Permite que MapsView controle el mapa sin acceder a su estado
// interno — patrón forwardRef + useImperativeHandle.
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
  setRouteVisible: (visible: boolean) => void;
  setRouteStartEndVisible: (visible: boolean) => void;
  setRouteDirectionVisible: (visible: boolean) => void;
  // Controla una capa individual (stops, speed, engine, doors, rfid, alerts, arrows, flags)
  setLayerVisible: (layer: string, visible: boolean) => void;
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
 *   - RoutePlayback → reproducción animada del recorrido (capa aparte)
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
    focusUserLocation,
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
    setLayerVisible,
  } = useMapRoute({ mapRef, infoWindowRef });

  // ── Estado del modo playback ──────────────────────────────────
  // Guardamos los puntos del recorrido activo aquí para alimentar al
  // componente RoutePlayback. Se llenan cuando se muestra un recorrido
  // y se limpian al ocultarlo. El playback es una capa independiente:
  // no toca los markers/polylines que dibuja useMapRoute.
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [playbackActive, setPlaybackActive] = useState(false);

  // Wrapper de showUnitRoute: además de dibujar la ruta, captura los
  // puntos para el playback y resetea cualquier reproducción previa.
  const handleShowRoute = useCallback(
    (points: RoutePoint[], unitLabel?: string) => {
      setRoutePoints(points);
      setPlaybackActive(false); // recorrido nuevo → cerrar playback anterior
      showUnitRoute(points, unitLabel);
    },
    [showUnitRoute],
  );

  // Wrapper de hideUnitRoute: limpia el playback antes de ocultar la ruta.
  const handleHideRoute = useCallback(() => {
    setPlaybackActive(false);
    setRoutePoints([]);
    hideUnitRoute();
  }, [hideUnitRoute]);

  // ── API imperativa hacia MapsView ─────────────────────────────
  useImperativeHandle(ref, () => ({
    focusMexico,
    focusUserLocation,
    toggleTraffic,
    searchAddress,
    toggleFullscreen,

    // Limpiar todos los elementos activos del mapa
    clearMap: () => {
      hidePois();
      hideUnits();
      handleHideRoute();
    },

    focusPoi,
    showPois,
    hidePois,

    focusUnit,
    showUnits,
    hideUnits,

    showUnitRoute: handleShowRoute,
    hideUnitRoute: handleHideRoute,
    setRouteVisible,
    setRouteStartEndVisible,
    setRouteDirectionVisible,
    setLayerVisible: (layer: string, visible: boolean) =>
      setLayerVisible(layer as keyof import('../types/map.types').RouteDisplayOptions, visible),
  }));

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
      <div className="absolute right-4 top-2 z-[1] flex flex-col gap-3">
        {/* Botón de playback solo visible cuando hay un recorrido cargado. */}
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

      {/* Modo playback: capa independiente sobre el mapa.
          Se monta/desmonta con playbackActive; al desmontarse limpia
          su propio marcador y trail sin tocar el recorrido estático. */}
      {playbackActive && (
        <RoutePlayback
          map={mapRef.current}
          points={routePoints}
          onClose={() => setPlaybackActive(false)}
        />
      )}
    </div>
  );
});

MapCanvas.displayName = "MapCanvas";