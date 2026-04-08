import { useEffect, useMemo, useState } from "react";

import type { RoutePoint } from "../../types/map.types";
import { formatAppDateTime } from "@/lib/date-time";
import { getTelemetryStatusLabel } from "../../lib/telemetry-status"; 
import { formatDuration, getRouteSummary } from "../../lib/route-summary"; 
import { useTripMonitor } from "../../hooks/useTripMonitor";
import type { RouteMode } from "../../services/telemetryService";


interface TripDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRouteSelected: (points: RoutePoint[]) => void;
  onRouteHidden: () => void;
  onRouteVisibilityChange: (visible: boolean) => void;
  onStartEndVisibilityChange: (visible: boolean) => void;
  onDirectionVisibilityChange: (visible: boolean) => void;
}

const routeButtonClass =
  "border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50";

/**
 * Drawer lateral para consultar recorridos históricos de una unidad.
 *
 * Este componente:
 * - permite buscar unidades
 * - seleccionar una unidad por IMEI
 * - ver resumen de la unidad
 * - cargar rutas por modo (último, hoy, ayer, antier)
 * - cargar trips recientes
 * - controlar overlays visuales del mapa
 */
export const TripDrawer = ({
  isOpen,
  onClose,
  onRouteSelected,
  onRouteHidden,
  onRouteVisibilityChange,
  onStartEndVisibilityChange,
  onDirectionVisibilityChange,
}: TripDrawerProps) => {
  const {
    units,
    selectedUnit,
    selectedUnitImei,
    unitSummary,
    visibleTrips,
    selectedTripId,
    activeMode,
    currentRoutePoints,
    isLoadingUnits,
    isLoadingRoute,
    error,
    toastMessage,
    loadUnits,
    selectUnit,
    loadRouteByMode,
    loadTripById,
    clearToast,
    resetAll,
  } = useTripMonitor();

  const [search, setSearch] = useState("");

  const [showRouteLine, setShowRouteLine] = useState(true);
  const [showStartEndFlags, setShowStartEndFlags] = useState(true);
  const [showDirectionArrows, setShowDirectionArrows] = useState(false);

  const routeSummary = useMemo(
    () => getRouteSummary(currentRoutePoints),
    [currentRoutePoints],
  );

  /**
   * Oculta el toast automáticamente después de unos segundos.
   */
  useEffect(() => {
    if (!toastMessage) return;

    const timeout = window.setTimeout(() => {
      clearToast();
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [toastMessage, clearToast]);

  /**
   * Sincroniza la visibilidad de la polilínea con el mapa.
   */
  useEffect(() => {
    onRouteVisibilityChange(showRouteLine);
  }, [showRouteLine, onRouteVisibilityChange]);

  /**
   * Sincroniza la visibilidad de inicio/fin con el mapa.
   */
  useEffect(() => {
    onStartEndVisibilityChange(showStartEndFlags);
  }, [showStartEndFlags, onStartEndVisibilityChange]);

  /**
   * Sincroniza la visibilidad de flechas del recorrido con el mapa.
   */
  useEffect(() => {
    onDirectionVisibilityChange(showDirectionArrows);
  }, [showDirectionArrows, onDirectionVisibilityChange]);

  /**
   * Carga las unidades disponibles al abrir el drawer.
   */
  useEffect(() => {
    if (!isOpen) return;
    void loadUnits();
  }, [isOpen, loadUnits]);

  /**
   * Aplica la ruta recibida al mapa y sincroniza overlays visuales.
   */
  const applyRouteToMap = (points: RoutePoint[]) => {
    if (!points.length) {
      onRouteHidden();
      return;
    }

    onRouteSelected(points);
    onRouteVisibilityChange(showRouteLine);
    onStartEndVisibilityChange(showStartEndFlags);
    onDirectionVisibilityChange(showDirectionArrows);
  };

  /**
   * Selecciona unidad y prepara el drawer para mostrar sus recorridos.
   */
  const handleUnitChange = async (imei: string) => {
    onRouteHidden();
    await selectUnit(imei);
  };

  /**
   * Carga una ruta por modo predefinido.
   */
  const handleLoadRouteByMode = async (mode: RouteMode) => {
    const points = await loadRouteByMode(mode);

    if (!points.length) {
      onRouteHidden();
      return;
    }

    applyRouteToMap(points);
  };

  /**
   * Carga un recorrido puntual desde la lista de trips recientes.
   */
  const handleLoadTripById = async (tripId: string) => {
    const points = await loadTripById(tripId);

    if (!points.length) {
      onRouteHidden();
      return;
    }

    applyRouteToMap(points);
  };

  /**
   * Cierra el drawer y limpia completamente el estado local del feature.
   */
  const handleClose = () => {
    setSearch("");
    setShowRouteLine(true);
    setShowStartEndFlags(true);
    setShowDirectionArrows(false);
    onRouteHidden();
    resetAll();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {toastMessage && (
        <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg md:left-auto md:right-6 md:top-6 md:translate-x-0">
          {toastMessage}
        </div>
      )}

      <aside className="absolute inset-x-2 top-2 bottom-2 z-20 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:w-[420px]">
        {/* Tabs superiores */}
        <div className="border-b border-slate-200 px-3 pt-3 md:px-4 md:pt-4">
          <div className="flex items-center gap-4 overflow-x-auto text-sm md:gap-8">
            <button className="whitespace-nowrap border-b-2 border-emerald-500 pb-3 font-medium text-emerald-600">
              Nuevo
            </button>
            <button className="whitespace-nowrap pb-3 text-slate-400" disabled>
              Eventos
            </button>
            <button className="whitespace-nowrap pb-3 text-slate-400" disabled>
              Archivados
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 md:p-4">
          {/* Búsqueda y selección de unidad */}
          <div className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar unidad..."
                className="w-full flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
              />

              <button
                type="button"
                onClick={() => void loadUnits(search)}
                className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 md:w-auto"
              >
                Buscar
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 md:w-auto"
              >
                Cerrar
              </button>
            </div>

            <select
              value={selectedUnitImei}
              onChange={(event) => void handleUnitChange(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
            >
              <option value="">--seleccione una unidad--</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.imei}>
                  [{unit.numero}] {unit.marca} {unit.modelo}
                </option>
              ))}
            </select>

            {isLoadingUnits && (
              <p className="text-sm text-slate-500">Cargando unidades...</p>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          {/* Resumen de unidad seleccionada */}
          {selectedUnit && (
            <div className="mt-4 rounded-lg border border-slate-200 p-3 md:p-4">
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-400">Unidad</p>
                  <p className="font-semibold text-slate-700">
                    {selectedUnit.numero}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">IMEI</p>
                  <p className="break-all font-medium text-slate-700">
                    {selectedUnit.imei}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Marca / Modelo</p>
                  <p className="font-medium text-slate-700">
                    {selectedUnit.marca} {selectedUnit.modelo}
                  </p>
                </div>

                <div className="sm:col-span-2 md:col-span-3">
                  <p className="text-xs text-slate-400">Estado</p>
                  <p className="font-medium text-slate-700">
                    {getTelemetryStatusLabel(
                      selectedUnit.telemetry?.status,
                      selectedUnit.telemetry?.velocidad,
                    )}
                  </p>
                </div>

                <div className="sm:col-span-2 md:col-span-3">
                  <p className="text-xs text-slate-400">Último reporte</p>
                  <p className="font-medium text-slate-700">
                    {formatAppDateTime(
                      unitSummary?.last_report ??
                        selectedUnit.telemetry?.fecha_hora_gps ??
                        null,
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedUnitImei && (
            <>
              {/* Modos de recorrido */}
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-slate-700">
                  Mostrar recorrido previo:
                </p>

                <div className="grid grid-cols-2 overflow-hidden rounded-md border border-slate-300 md:flex md:flex-wrap">
                  <button
                    type="button"
                    className={`${routeButtonClass} ${
                      activeMode === "latest" ? "bg-slate-100" : ""
                    }`}
                    onClick={() => void handleLoadRouteByMode("latest")}
                  >
                    Último
                  </button>

                  <button
                    type="button"
                    className={`${routeButtonClass} ${
                      activeMode === "today" ? "bg-slate-100" : ""
                    }`}
                    onClick={() => void handleLoadRouteByMode("today")}
                  >
                    Hoy
                  </button>

                  <button
                    type="button"
                    className={`${routeButtonClass} ${
                      activeMode === "yesterday" ? "bg-slate-100" : ""
                    }`}
                    onClick={() => void handleLoadRouteByMode("yesterday")}
                  >
                    Ayer
                  </button>

                  <button
                    type="button"
                    className={`${routeButtonClass} ${
                      activeMode === "day_before_yesterday" ? "bg-slate-100" : ""
                    }`}
                    onClick={() =>
                      void handleLoadRouteByMode("day_before_yesterday")
                    }
                  >
                    Antier
                  </button>
                </div>
              </div>

              {/* Lista de trips recientes */}
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-slate-700">
                  Últimos recorridos:
                </p>

                <select
                  value={selectedTripId}
                  onChange={(event) => void handleLoadTripById(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
                >
                  <option value="">--seleccione un recorrido--</option>
                  {visibleTrips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.label} · {formatDuration(trip.duration_seconds)} ·{" "}
                      {trip.distance_km.toFixed(2)} km
                    </option>
                  ))}
                </select>

                <div className="mt-3 space-y-3 rounded-lg border border-slate-200 p-3">
                  {visibleTrips.length === 0 && (
                    <p className="text-sm text-slate-500">
                      No hay recorridos recientes disponibles.
                    </p>
                  )}

                  {visibleTrips.map((trip) => (
                    <button
                      key={trip.id}
                      type="button"
                      onClick={() => void handleLoadTripById(trip.id)}
                      className="block w-full rounded-md border border-transparent px-2 py-2 text-left hover:bg-slate-50"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
                          {trip.label}
                        </span>
                        <span className="text-slate-600">
                          {formatDuration(trip.duration_seconds)}
                        </span>
                        <span className="text-slate-600">
                          {trip.distance_km.toFixed(2)} km
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatAppDateTime(trip.start_time)} -{" "}
                        {formatAppDateTime(trip.end_time)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumen del recorrido actual */}
              {currentRoutePoints.length > 0 && (
                <div className="mt-4 rounded-lg border border-slate-200 p-3 md:p-4">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Resumen de recorrido
                  </h3>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Movimientos</p>
                      <p className="text-lg font-semibold text-sky-500">
                        {routeSummary.movementCount}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Kilómetros</p>
                      <p className="text-lg font-semibold text-cyan-500">
                        {routeSummary.distanceKm.toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">En movimiento</p>
                      <p className="text-lg font-semibold text-emerald-500">
                        {formatDuration(routeSummary.movingSeconds)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">En stop</p>
                      <p className="text-lg font-semibold text-amber-500">
                        {formatDuration(routeSummary.stopSeconds)}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <p className="text-xs text-slate-400">Apagada</p>
                      <p className="text-lg font-semibold text-slate-600">
                        {formatDuration(routeSummary.offSeconds)}
                      </p>
                    </div>
                  </div>

                  {/* Controles visuales del recorrido */}
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      Ver en el mapa
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={showRouteLine}
                          onChange={(event) => setShowRouteLine(event.target.checked)}
                          className="h-4 w-4"
                        />
                        <span>Ruta</span>
                      </label>

                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={showStartEndFlags}
                          onChange={(event) =>
                            setShowStartEndFlags(event.target.checked)
                          }
                          className="h-4 w-4"
                        />
                        <span>Inicio / Fin</span>
                      </label>

                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={showDirectionArrows}
                          onChange={(event) =>
                            setShowDirectionArrows(event.target.checked)
                          }
                          className="h-4 w-4"
                        />
                        <span>Dirección</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {isLoadingRoute && (
                <p className="mt-4 text-sm text-slate-500">
                  Cargando recorrido...
                </p>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
};