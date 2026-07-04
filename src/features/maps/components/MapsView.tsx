import { useCallback, useEffect, useRef, useState } from "react";
import { MapPinned } from "lucide-react";

import { MapToolbar } from "./MapToolbar";
import { MapCanvas, type MapCanvasHandle } from "./MapCanvas";
import { UnitsDrawer } from "./drawers/UnitsDrawer";
import { TripDrawer } from "./drawers/TripDrawer";
import { UnitTokenModal } from "@/features/catalogs/units/components/UnitTokenModal";
import { useTripDrawerStore } from "../stores/tripDrawerStore";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { usePermiso } from "@/hooks/usePermiso";

import type { MapUnitItem, RoutePoint, RouteDisplayOptions } from "../types/map.types";
import { useUnitsLive } from "../hooks/useUnitsLive";
import { RoutesDrawer } from "./drawers/RoutesDrawer";

type ActiveDrawer = "units" | "trips" | "routes" | null;

// Contenedor del módulo de mapas: coordina toolbar, canvas y drawers. Mantiene
// un solo drawer abierto a la vez y delega las acciones del mapa al canvas vía ref.
export const MapsView = () => {
  const mapCanvasRef = useRef<MapCanvasHandle | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);
  // Unidad cuyo token se está viendo (modal independiente).
  const [tokenUnit, setTokenUnit] = useState<MapUnitItem | null>(null);
  const { idEmpresa } = useEmpresaActiva();
  const setSelectedUnitImei = useTripDrawerStore((s) => s.setSelectedUnitImei);
  const puedeEditarUnidad = usePermiso("unidades.editar");
  const unitsLive = useUnitsLive();
  const [focusedUnitId, setFocusedUnitId] = useState<number | null>(null);

  // Al cambiar de empresa, cerrar drawers y limpiar el mapa. Cada drawer
  // recarga sus datos al reabrirse.
  useEffect(() => {
    setActiveDrawer(null);
    mapCanvasRef.current?.clearMap();
  }, [idEmpresa]);

  const closeAllDrawers = useCallback(() => setActiveDrawer(null), []);

  const toggleDrawer = useCallback((drawer: Exclude<ActiveDrawer, null>) => {
    setActiveDrawer((current) => (current === drawer ? null : drawer));
  }, []);

  const handleUnitsSelectionChange = useCallback((units: MapUnitItem[]) => {
    if (units.length === 0) { mapCanvasRef.current?.hideUnits(); return; }
    mapCanvasRef.current?.showUnits(units);
  }, []);

  const handleUnitsHidden = useCallback(() => {
    mapCanvasRef.current?.hideUnits();
  }, []);

  const handleSelectUnit = useCallback((unit: MapUnitItem) => {
    setFocusedUnitId(unit.id);
    mapCanvasRef.current?.focusUnit(unit);
  }, []);

  useEffect(() => {
    unitsLive.selectedUnits.forEach((unit) => {
      mapCanvasRef.current?.updateUnit(unit);
    });

    const focusedUnit = unitsLive.units.find(
      (unit) => unit.id === focusedUnitId,
    );

    if (focusedUnit) {
      mapCanvasRef.current?.updateUnit(focusedUnit);
    }
  }, [unitsLive.units, unitsLive.selectedUnits, focusedUnitId]);

  // Abre el modal de token de la unidad (independiente de los drawers).
  const handleShowToken = useCallback((unit: MapUnitItem) => {
    setTokenUnit(unit);
  }, []);

  // Abre el recorrido de la unidad: setea su imei en el store del trip y abre
  // el TripDrawer, que al montar carga el recorrido de esa unidad solo.
  const handleShowTrip = useCallback((unit: MapUnitItem) => {
    setSelectedUnitImei(unit.imei);
    setActiveDrawer("trips");
  }, [setSelectedUnitImei]);

  const handleRouteSelected = useCallback((points: RoutePoint[]) => {
    if (points.length === 0) { mapCanvasRef.current?.hideUnitRoute(); return; }
    mapCanvasRef.current?.showUnitRoute(points);
  }, []);

  const handleRouteHidden = useCallback(() => mapCanvasRef.current?.hideUnitRoute(), []);

  const handleRouteVisibilityChange = useCallback((v: boolean) => mapCanvasRef.current?.setRouteVisible(v), []);

  const handleStartEndVisibilityChange = useCallback((v: boolean) => mapCanvasRef.current?.setRouteStartEndVisible(v), []);

  const handleDirectionVisibilityChange = useCallback((v: boolean) => mapCanvasRef.current?.setRouteDirectionVisible(v), []);

  const handleLayerVisibilityChange = useCallback(
    (layer: keyof RouteDisplayOptions, visible: boolean) =>
      mapCanvasRef.current?.setLayerVisible(layer, visible),
    [],
  );

  return (
    <main className="h-full overflow-hidden bg-[#f5f6f8] p-3 md:p-6">
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-3 py-3 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <MapPinned className="h-5 w-5 text-slate-500" />
            <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">Mapa</h1>
          </div>
          <MapToolbar
            onToggleTraffic={() => mapCanvasRef.current?.toggleTraffic()}
            onClearMap={() => mapCanvasRef.current?.clearMap()}
            onToggleUnitsDrawer={() => toggleDrawer("units")}
            onToggleTripsDrawer={() => toggleDrawer("trips")}
            onToggleRoutesDrawer={() => toggleDrawer("routes")}
          />
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <MapCanvas ref={mapCanvasRef} />

          {activeDrawer === "units" && (
            <UnitsDrawer
              unitsLive={unitsLive}
              onClose={closeAllDrawers}
              onSelectUnit={handleSelectUnit}
              onUnitsSelectionChange={handleUnitsSelectionChange}
              onUnitsHidden={handleUnitsHidden}
              onShowToken={handleShowToken}
              onShowTrip={handleShowTrip}
            />
          )}

          {activeDrawer === "trips" && (
            <TripDrawer
              onClose={closeAllDrawers}
              onRouteSelected={handleRouteSelected}
              onRouteHidden={handleRouteHidden}
              onRouteVisibilityChange={handleRouteVisibilityChange}
              onStartEndVisibilityChange={handleStartEndVisibilityChange}
              onDirectionVisibilityChange={handleDirectionVisibilityChange}
              onLayerChange={handleLayerVisibilityChange}
            />
          )}

          {activeDrawer === "routes" && (
            <RoutesDrawer onClose={closeAllDrawers} />
          )}

        </div>
      </section>

      <UnitTokenModal
        idUnidad={tokenUnit?.id ?? null}
        numero={tokenUnit?.numero}
        marca={tokenUnit?.marca}
        modelo={tokenUnit?.modelo}
        idEmpresa={idEmpresa}
        canEdit={puedeEditarUnidad}
        onClose={() => setTokenUnit(null)}
      />
    </main>
  );
};