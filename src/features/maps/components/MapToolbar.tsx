import { Route, BusFront, GitBranch, TrafficCone, Eraser } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { MapLegend } from "./MapLegend";

interface MapToolbarProps {
  onToggleTraffic: () => void;
  onClearMap: () => void;
  onToggleUnitsDrawer: () => void;
  onToggleTripsDrawer: () => void;
  onToggleRoutesDrawer?: () => void;
}

// Herramientas del mapa: botones de acción rápida para el usuario. 
// Se renderizan en la barra de herramientas del mapa y permiten al usuario 
// interactuar con el mapa de manera eficiente. 
export const MapToolbar = ({
  onToggleTraffic,
  onClearMap,
  onToggleUnitsDrawer,
  onToggleTripsDrawer,
  onToggleRoutesDrawer,
}: MapToolbarProps) => {
  const herramientas: {
    label: string;
    icono: LucideIcon;
    onClick?: () => void;
  }[] = [
    { label: "Consulta de recorrido", icono: Route, onClick: onToggleTripsDrawer },
    { label: "Unidades", icono: BusFront, onClick: onToggleUnitsDrawer },
    { label: "Rutas", icono: GitBranch, onClick: onToggleRoutesDrawer },
    { label: "Ver tráfico", icono: TrafficCone, onClick: onToggleTraffic },
    { label: "Limpiar el mapa", icono: Eraser, onClick: onClearMap },
  ];

  return (
    <div className="flex flex-nowrap items-center gap-2 md:flex-wrap lg:flex-nowrap">
      {herramientas.map(
        ({ label, icono: Icono, onClick }) =>
          // Renderizamos un botón de icono para cada herramienta en la barra de herramientas del mapa.
          onClick && (
            <IconButton key={label} label={label} onClick={onClick}>
              <Icono className="h-4 w-4" />
            </IconButton>
          ),
      )}
      <MapLegend />
    </div>
  );
};
