import { useCallback, useRef, useState } from "react";
import { MapPinned } from "lucide-react";
import { MapToolbar } from "./MapToolbar";
import { MapCanvas, type MapCanvasHandle } from "./MapCanvas";
import { PoisDrawer } from "./PoisDrawer";
import type { MapPoiItem } from "./map.types";

export const MapsView = () => {
  const mapCanvasRef = useRef<MapCanvasHandle | null>(null);
  const [isPoisDrawerOpen, setIsPoisDrawerOpen] = useState(false);

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
            onTogglePoisDrawer={() =>
              setIsPoisDrawerOpen((previousState) => !previousState)
            }
          />
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <MapCanvas ref={mapCanvasRef} />

          <PoisDrawer
            isOpen={isPoisDrawerOpen}
            onClose={() => setIsPoisDrawerOpen(false)}
            onSelectPoi={handleSelectPoi}
            onPoisSelectionChange={handlePoisSelectionChange}
            onPoisHidden={handlePoisHidden}
          />
        </div>
      </section>
    </main>
  );
};
