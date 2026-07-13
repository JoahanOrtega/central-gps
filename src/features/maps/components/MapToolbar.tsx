import { Route, BusFront, GitBranch, TrafficCone, Eraser } from "lucide-react";
import { MapLegend } from "./MapLegend";

const toolbarButtonClass =
  "flex h-9 w-9 md:h-10 md:w-10 flex-none items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700";

interface MapToolbarProps {
  onToggleTraffic: () => void;
  onClearMap: () => void;
  onToggleUnitsDrawer: () => void;
  onToggleTripsDrawer: () => void;
  onToggleRoutesDrawer?: () => void;
}

// Barra de herramientas del módulo de mapas.
export const MapToolbar = ({
  onToggleTraffic,
  onClearMap,
  onToggleUnitsDrawer,
  onToggleTripsDrawer,
  onToggleRoutesDrawer,
}: MapToolbarProps) => {
  return (
    <div className="flex flex-nowrap items-center gap-2 md:flex-wrap lg:flex-nowrap">
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
      <button
        type="button"
        className={toolbarButtonClass}
        title="Rutas"
        onClick={onToggleRoutesDrawer}
      >
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