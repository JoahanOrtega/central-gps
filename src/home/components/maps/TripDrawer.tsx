import { useEffect, useMemo, useState } from "react";
//import { Flag, Route, ArrowRight, Search, X } from "lucide-react";

import { monitorService } from "@/home/services/monitorService";
import { telemetryService } from "@/home/services/telemetryService";
import type {
  MapUnitItem,
  RecentTripItem,
  RoutePoint,
  TripUnitSummary,
} from "./map.types";
import { formatAppDateTime } from "@/lib/date-time";

type RouteMode = "latest" | "today" | "yesterday" | "day_before_yesterday";

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

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const getRouteSummary = (points: RoutePoint[]) => {
  if (!points.length) {
    return {
      movementCount: 0,
      distanceKm: 0,
      movingSeconds: 0,
      stopSeconds: 0,
      offSeconds: 0,
    };
  }

  let movementCount = 0;
  let distanceKm = 0;
  let movingSeconds = 0;
  let stopSeconds = 0;
  let offSeconds = 0;

  const STATUS_OFF = "000000000";
  const STATUS_ON = "100000000";

  const haversineKm = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    const previousDate = new Date(previous.fecha_hora_gps);
    const currentDate = new Date(current.fecha_hora_gps);
    const deltaSeconds = Math.max(
      0,
      Math.floor((currentDate.getTime() - previousDate.getTime()) / 1000),
    );

    const previousSpeed = previous.velocidad ?? 0;
    const previousStatus = (previous.status || "").trim();

    if (
      previous.latitud != null &&
      previous.longitud != null &&
      current.latitud != null &&
      current.longitud != null
    ) {
      distanceKm += haversineKm(
        previous.latitud,
        previous.longitud,
        current.latitud,
        current.longitud,
      );
    }

    if (previousStatus === STATUS_OFF) {
      offSeconds += deltaSeconds;
      continue;
    }

    if (previousStatus === STATUS_ON && previousSpeed >= 1) {
      movingSeconds += deltaSeconds;
      movementCount += 1;
      continue;
    }

    stopSeconds += deltaSeconds;
  }

  return {
    movementCount,
    distanceKm: Number(distanceKm.toFixed(2)),
    movingSeconds,
    stopSeconds,
    offSeconds,
  };
};

export const TripDrawer = ({
  isOpen,
  onClose,
  onRouteSelected,
  onRouteHidden,
  onRouteVisibilityChange,
  onStartEndVisibilityChange,
  onDirectionVisibilityChange,
}: TripDrawerProps) => {
  const [units, setUnits] = useState<MapUnitItem[]>([]);
  const [selectedUnitImei, setSelectedUnitImei] = useState("");
  const [unitSummary, setUnitSummary] = useState<TripUnitSummary | null>(null);
  const [recentTrips, setRecentTrips] = useState<RecentTripItem[]>([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [search, setSearch] = useState("");
  const [activeMode, setActiveMode] = useState<RouteMode | null>(null);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const [showRouteLine, setShowRouteLine] = useState(true);
  const [showStartEndFlags, setShowStartEndFlags] = useState(true);
  const [showDirectionArrows, setShowDirectionArrows] = useState(false);

  const [currentRoutePoints, setCurrentRoutePoints] = useState<RoutePoint[]>([]);

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.imei === selectedUnitImei) ?? null,
    [units, selectedUnitImei],
  );

  const visibleTrips = useMemo(
    () =>
      recentTrips.filter(
        (trip) => trip.distance_km > 0.05 && trip.duration_seconds > 0,
      ),
    [recentTrips],
  );

  const routeSummary = useMemo(
    () => getRouteSummary(currentRoutePoints),
    [currentRoutePoints],
  );

  useEffect(() => {
    if (!toastMessage) return;

    const timeout = window.setTimeout(() => {
      setToastMessage("");
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    onRouteVisibilityChange(showRouteLine);
  }, [showRouteLine, onRouteVisibilityChange]);

  useEffect(() => {
    onStartEndVisibilityChange(showStartEndFlags);
  }, [showStartEndFlags, onStartEndVisibilityChange]);

  useEffect(() => {
    onDirectionVisibilityChange(showDirectionArrows);
  }, [showDirectionArrows, onDirectionVisibilityChange]);

  const loadUnits = async (searchValue = "") => {
    try {
      setIsLoadingUnits(true);
      setError("");

      const response = await monitorService.getUnitsLive(searchValue);
      setUnits(response);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible cargar las unidades";

      setError(message);
    } finally {
      setIsLoadingUnits(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void loadUnits();
  }, [isOpen]);

  const resetRouteState = () => {
    setUnitSummary(null);
    setRecentTrips([]);
    setSelectedTripId("");
    setActiveMode(null);
    setCurrentRoutePoints([]);
    setShowRouteLine(true);
    setShowStartEndFlags(true);
    setShowDirectionArrows(false);
    onRouteHidden();
  };

  const handleUnitChange = async (imei: string) => {
    setSelectedUnitImei(imei);
    resetRouteState();

    if (!imei) return;

    try {
      setError("");

      const summary = await telemetryService.getUnitSummary(imei);
      setUnitSummary(summary);

      if (!summary.hasTelemetry) {
        setToastMessage("No hay información para mostrar");
        return;
      }

      const trips = await telemetryService.getRecentTrips(imei);
      setRecentTrips(trips);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible consultar la información de la unidad";

      setError(message);
    }
  };

  const handleApplyRoute = (points: RoutePoint[]) => {
    setCurrentRoutePoints(points);
    onRouteSelected(points);
    onRouteVisibilityChange(showRouteLine);
    onStartEndVisibilityChange(showStartEndFlags);
    onDirectionVisibilityChange(showDirectionArrows);
  };

  const handleLoadRouteByMode = async (mode: RouteMode) => {
    if (!selectedUnitImei) return;

    try {
      setIsLoadingRoute(true);
      setError("");
      setSelectedTripId("");
      setActiveMode(mode);

      const points = await telemetryService.getRouteByMode(selectedUnitImei, mode);

      if (!points.length) {
        setCurrentRoutePoints([]);
        setToastMessage("No hay información para mostrar");
        onRouteHidden();
        return;
      }

      handleApplyRoute(points);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible cargar el recorrido";

      setError(message);
      setCurrentRoutePoints([]);
      onRouteHidden();
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const handleLoadTripById = async (tripId: string) => {
    setSelectedTripId(tripId);
    setActiveMode(null);

    if (!selectedUnitImei || !tripId) {
      setCurrentRoutePoints([]);
      onRouteHidden();
      return;
    }

    try {
      setIsLoadingRoute(true);
      setError("");

      const points = await telemetryService.getTripById(selectedUnitImei, tripId);

      if (!points.length) {
        setCurrentRoutePoints([]);
        setToastMessage("No hay información para mostrar");
        onRouteHidden();
        return;
      }

      handleApplyRoute(points);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible cargar el recorrido";

      setError(message);
      setCurrentRoutePoints([]);
      onRouteHidden();
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const handleClose = () => {
    setSelectedUnitImei("");
    setUnits([]);
    setSearch("");
    setError("");
    setToastMessage("");
    resetRouteState();
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

          {selectedUnit && (
            <div className="mt-4 rounded-lg border border-slate-200 p-3 md:p-4">
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-400">Unidad</p>
                  <p className="font-semibold text-slate-700">{selectedUnit.numero}</p>
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
                    {unitSummary?.status ??
                      selectedUnit.telemetry?.status ??
                      "Sin información"}
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
                    onClick={() => void handleLoadRouteByMode("day_before_yesterday")}
                  >
                    Antier
                  </button>
                </div>
              </div>

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