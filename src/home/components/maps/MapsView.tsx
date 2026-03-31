import { useCallback, useRef, useState } from "react";
import { MapPinned } from "lucide-react";
import { MapToolbar } from "./MapToolbar";
import { MapCanvas, type MapCanvasHandle } from "./MapCanvas";
import { PoisDrawer } from "./PoisDrawer";
import { UnitsDrawer } from "./UnitsDrawer";
import { TripDrawer } from "./TripDrawer";
import type { MapPoiItem, MapUnitItem, RoutePoint } from "./map.types";

type ActiveDrawer = "pois" | "units" | "trips" | null;

export const MapsView = () => {
  const mapCanvasRef = useRef<MapCanvasHandle | null>(null);

  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);

  const toggleDrawer = (drawer: Exclude<ActiveDrawer, null>) => {
    setActiveDrawer((currentDrawer) =>
      currentDrawer === drawer ? null : drawer,
    );
  };

  const closeAllDrawers = () => {
    setActiveDrawer(null);
  };

  const handlePoisSelectionChange = useCallback((pois: MapPoiItem[]) => {
    if (pois.length === 0) {
      mapCanvasRef.current?.hidePois();
      return;
    }

    mapCanvasRef.current?.showPois(pois);
  }, []);

  const handlePoisHidden = useCallback(() => {
    mapCanvasRef.current?.hidePois();
  }, []);

  const handleSelectPoi = useCallback((poi: MapPoiItem) => {
    mapCanvasRef.current?.focusPoi(poi);
  }, []);

  const handleUnitsSelectionChange = useCallback((units: MapUnitItem[]) => {
    if (units.length === 0) {
      mapCanvasRef.current?.hideUnits();
      return;
    }

    mapCanvasRef.current?.showUnits(units);
  }, []);

  const handleUnitsHidden = useCallback(() => {
    mapCanvasRef.current?.hideUnits();
  }, []);

  const handleSelectUnit = useCallback((unit: MapUnitItem) => {
    mapCanvasRef.current?.focusUnit(unit);
  }, []);

  const handleRouteSelected = useCallback((points: RoutePoint[]) => {
    if (points.length === 0) {
      mapCanvasRef.current?.hideUnitRoute();
      return;
    }

    mapCanvasRef.current?.showUnitRoute(points);
  }, []);

  const handleRouteHidden = useCallback(() => {
    mapCanvasRef.current?.hideUnitRoute();
  }, []);

  return (
    <main className="h-full overflow-hidden bg-[#f5f6f8] p-3 md:p-6">
      <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
            onToggleTripDrawer={() => toggleDrawer("trips")}
            activeDrawer={activeDrawer}
          />
        </div>

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
          />
        </div>
      </section>
    </main>
  );
};