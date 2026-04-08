import { useCallback, useRef, useState } from "react";
import { MapPinned } from "lucide-react";

import { MapToolbar } from "./MapToolbar";
import { MapCanvas, type MapCanvasHandle } from "./MapCanvas";
import { PoisDrawer } from "./drawers/PoisDrawer";
import { UnitsDrawer } from "./drawers/UnitsDrawer";
import { TripDrawer } from "./drawers/TripDrawer";

import type { MapPoiItem, MapUnitItem, RoutePoint } from "../types/map.types";

type ActiveDrawer = "pois" | "units" | "trips" | null;

/**
 * Contenedor principal del feature de mapas.
 * Este componente coordina:
 * - toolbar
 * - canvas
 * - drawers laterales
 *
 * No contiene lógica de renderizado del mapa.
 * Solo conecta eventos entre paneles y canvas.
 */
export const MapsView = () => {
  const mapCanvasRef = useRef<MapCanvasHandle | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);

  /** Cierra todos los paneles laterales. */
  const closeAllDrawers = useCallback(() => {
    setActiveDrawer(null);
  }, []);

  /** Alterna el drawer seleccionado y garantiza que solo uno esté abierto. */
  const toggleDrawer = useCallback((drawer: Exclude<ActiveDrawer, null>) => {
    setActiveDrawer((currentDrawer) =>
      currentDrawer === drawer ? null : drawer,
    );
  }, []);

  /** Muestra POIs en el mapa según la selección actual. */
  const handlePoisSelectionChange = useCallback((pois: MapPoiItem[]) => {
    if (pois.length === 0) {
      mapCanvasRef.current?.hidePois();
      return;
    }

    mapCanvasRef.current?.showPois(pois);
  }, []);

  /** Oculta POIs del mapa cuando el panel se cierra o la selección se vacía. */
  const handlePoisHidden = useCallback(() => {
    mapCanvasRef.current?.hidePois();
  }, []);

  /** Enfoca un POI específico. */
  const handleSelectPoi = useCallback((poi: MapPoiItem) => {
    mapCanvasRef.current?.focusPoi(poi);
  }, []);

  /** Muestra unidades seleccionadas en el mapa. */
  const handleUnitsSelectionChange = useCallback((units: MapUnitItem[]) => {
    if (units.length === 0) {
      mapCanvasRef.current?.hideUnits();
      return;
    }

    mapCanvasRef.current?.showUnits(units);
  }, []);

  /** Oculta unidades del mapa cuando el panel se cierra o la selección se vacía. */
  const handleUnitsHidden = useCallback(() => {
    mapCanvasRef.current?.hideUnits();
  }, []);

  /** Enfoca una unidad específica. */
  const handleSelectUnit = useCallback((unit: MapUnitItem) => {
    mapCanvasRef.current?.focusUnit(unit);
  }, []);

  /** Dibuja el recorrido seleccionado en el mapa. */
  const handleRouteSelected = useCallback((points: RoutePoint[]) => {
    if (points.length === 0) {
      mapCanvasRef.current?.hideUnitRoute();
      return;
    }

    mapCanvasRef.current?.showUnitRoute(points);
  }, []);

  /** Oculta el recorrido actual. */
  const handleRouteHidden = useCallback(() => {
    mapCanvasRef.current?.hideUnitRoute();
  }, []);

  /** Muestra u oculta la polilínea principal del recorrido. */
  const handleRouteVisibilityChange = useCallback((visible: boolean) => {
    mapCanvasRef.current?.setRouteVisible(visible);
  }, []);

  /** Muestra u oculta los markers de inicio y fin. */
  const handleStartEndVisibilityChange = useCallback((visible: boolean) => {
    mapCanvasRef.current?.setRouteStartEndVisible(visible);
  }, []);

  /** Muestra u oculta las flechas por registro del recorrido. */
  const handleDirectionVisibilityChange = useCallback((visible: boolean) => {
    mapCanvasRef.current?.setRouteDirectionVisible(visible);
  }, []);

  return (
    <main className="h-full overflow-hidden bg-[#f5f6f8] p-3 md:p-6">
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* Encabezado del módulo */}
        <div className="flex flex-col gap-3 border-b border-slate-200 px-3 py-3 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <MapPinned className="h-5 w-5 text-slate-500" />
            <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">
              Mapa
            </h1>
          </div>

          <MapToolbar
            onSearchAddress={(address) =>
              void mapCanvasRef.current?.searchAddress(address)
            }
            onToggleTraffic={() => mapCanvasRef.current?.toggleTraffic()}
            onClearMap={() => mapCanvasRef.current?.clearMap()}
            onFocusMap={() => mapCanvasRef.current?.focusMexico()}
            onFullscreen={() => mapCanvasRef.current?.toggleFullscreen()}
            onTogglePoisDrawer={() => toggleDrawer("pois")}
            onToggleUnitsDrawer={() => toggleDrawer("units")}
            onToggleTripsDrawer={() => toggleDrawer("trips")}
          />
        </div>

        {/* Área del mapa y paneles laterales */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <MapCanvas ref={mapCanvasRef} />

          <PoisDrawer
            isOpen={activeDrawer === "pois"}
            onClose={closeAllDrawers}
            onSelectPoi={handleSelectPoi}
            onPoisSelectionChange={handlePoisSelectionChange}
            onPoisHidden={handlePoisHidden}
          />

          <UnitsDrawer
            isOpen={activeDrawer === "units"}
            onClose={closeAllDrawers}
            onSelectUnit={handleSelectUnit}
            onUnitsSelectionChange={handleUnitsSelectionChange}
            onUnitsHidden={handleUnitsHidden}
          />

          <TripDrawer
            isOpen={activeDrawer === "trips"}
            onClose={closeAllDrawers}
            onRouteSelected={handleRouteSelected}
            onRouteHidden={handleRouteHidden}
            onRouteVisibilityChange={handleRouteVisibilityChange}
            onStartEndVisibilityChange={handleStartEndVisibilityChange}
            onDirectionVisibilityChange={handleDirectionVisibilityChange}
          />
        </div>
      </section>
    </main>
  );
};