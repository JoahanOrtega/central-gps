import { Route, BusFront, GitBranch, TrafficCone, Eraser } from "lucide-react";
import { MapLegend } from "./MapLegend";

const toolbarButtonClass =
  "flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700";

interface MapToolbarProps {
  onToggleTraffic: () => void;
  onClearMap: () => void;
  onToggleUnitsDrawer: () => void;
  onToggleTripsDrawer: () => void;
}

// Barra superior del módulo de mapas. 
export const MapToolbar = ({
  onToggleTraffic,
  onClearMap,
  onToggleUnitsDrawer,
  onToggleTripsDrawer,
}: MapToolbarProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
      <button
        type="button"
        className={toolbarButtonClass}
        title="Consulta de recorrido"
        onClick={onToggleTripsDrawer}
      >
        <Route className="h-4 w-4" />
      </button>

      <button
        type="button"
        className={toolbarButtonClass}
        title="Unidades"
        onClick={onToggleUnitsDrawer}
      >
        <BusFront className="h-4 w-4" />
      </button>

      <button type="button" className={toolbarButtonClass} title="Rutas">
        <GitBranch className="h-4 w-4" />
      </button>

      <button
        type="button"
        className={toolbarButtonClass}
        title="Ver tráfico"
        onClick={onToggleTraffic}
      >
        <TrafficCone className="h-4 w-4" />
      </button>

      <button
        type="button"
        className={toolbarButtonClass}
        title="Limpiar el mapa"
        onClick={onClearMap}
      >
        <Eraser className="h-4 w-4" />
      </button>

      <MapLegend />
    </div>
  );
};