import { useEffect, useMemo, useState } from "react";
import { monitorService } from "@/home/services/monitorService";
import { telemetryService } from "@/home/services/telemetryService";
import type {
  MapUnitItem,
  RecentTripItem,
  RoutePoint,
  TripUnitSummary,
} from "./map.types";

type RouteMode = "latest" | "today" | "yesterday" | "day_before_yesterday";

interface TripDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRouteSelected: (points: RoutePoint[]) => void;
  onRouteHidden: () => void;
}

const routeButtonClass =
  "border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50";

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
};

const formatDateTime = (value: string | null) => {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const TripDrawer = ({
  isOpen,
  onClose,
  onRouteSelected,
  onRouteHidden,
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

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.imei === selectedUnitImei) ?? null,
    [units, selectedUnitImei],
  );

  useEffect(() => {
    if (!toastMessage) return;

    const timeout = window.setTimeout(() => {
      setToastMessage("");
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const loadUnits = async (searchValue = "") => {
    try {
      setIsLoadingUnits(true);
      setError("");

      const response = await monitorService.getUnitsLive(searchValue);
      setUnits(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No fue posible cargar las unidades";

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
    onRouteHidden();
  };

  const handleUnitChange = async (imei: string) => {
    setSelectedUnitImei(imei);
    resetRouteState();

    if (!imei) return;

    try {
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

  const handleLoadRouteByMode = async (mode: RouteMode) => {
    if (!selectedUnitImei) return;

    try {
      setIsLoadingRoute(true);
      setError("");
      setSelectedTripId("");
      setActiveMode(mode);

      const points = await telemetryService.getRouteByMode(selectedUnitImei, mode);

      if (!points.length) {
        setToastMessage("No hay información para mostrar");
        onRouteHidden();
        return;
      }

      onRouteSelected(points);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No fue posible cargar el recorrido";

      setError(message);
      onRouteHidden();
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const handleLoadTripById = async (tripId: string) => {
    setSelectedTripId(tripId);
    setActiveMode(null);

    if (!selectedUnitImei || !tripId) {
      onRouteHidden();
      return;
    }

    try {
      setIsLoadingRoute(true);
      setError("");

      const points = await telemetryService.getTripById(selectedUnitImei, tripId);

      if (!points.length) {
        setToastMessage("No hay información para mostrar");
        onRouteHidden();
        return;
      }

      onRouteSelected(points);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No fue posible cargar el recorrido";

      setError(message);
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
        <div className="absolute right-6 top-6 z-30 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          {toastMessage}
        </div>
      )}

      <aside className="absolute right-4 top-4 z-20 flex h-[640px] w-[420px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 px-4 pt-4">
          <div className="flex items-center gap-8 text-sm">
            <button className="border-b-2 border-emerald-500 pb-3 font-medium text-emerald-600">
              Nuevo
            </button>
            <button className="pb-3 text-slate-400" disabled>
              Eventos
            </button>
            <button className="pb-3 text-slate-400" disabled>
              Archivados
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar unidad..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => void loadUnits(search)}
                className="w-full md:w-auto rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Buscar
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full md:w-auto rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
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
            <div className="mt-4 rounded-lg border border-slate-200 p-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Unidad</p>
                  <p className="font-semibold text-slate-700">{selectedUnit.numero}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">IMEI</p>
                  <p className="font-medium text-slate-700">{selectedUnit.imei}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Marca / Modelo</p>
                  <p className="font-medium text-slate-700">
                    {selectedUnit.marca} {selectedUnit.modelo}
                  </p>
                </div>

                <div className="col-span-3">
                  <p className="text-xs text-slate-400">Estado</p>
                  <p className="font-medium text-slate-700">
                    {unitSummary?.status ?? selectedUnit.telemetry?.status ?? "Sin información"}
                  </p>
                </div>

                <div className="col-span-3">
                  <p className="text-xs text-slate-400">Último reporte</p>
                  <p className="font-medium text-slate-700">
                    {formatDateTime(
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

                <div className="flex flex-wrap overflow-hidden rounded-md border border-slate-300">
                  <button
                    type="button"
                    className={`${routeButtonClass} ${activeMode === "latest" ? "bg-slate-100" : ""}`}
                    onClick={() => void handleLoadRouteByMode("latest")}
                  >
                    Último
                  </button>

                  <button
                    type="button"
                    className={`${routeButtonClass} ${activeMode === "today" ? "bg-slate-100" : ""}`}
                    onClick={() => void handleLoadRouteByMode("today")}
                  >
                    Hoy
                  </button>

                  <button
                    type="button"
                    className={`${routeButtonClass} ${activeMode === "yesterday" ? "bg-slate-100" : ""}`}
                    onClick={() => void handleLoadRouteByMode("yesterday")}
                  >
                    Ayer
                  </button>

                  <button
                    type="button"
                    className={`${routeButtonClass} ${activeMode === "day_before_yesterday" ? "bg-slate-100" : ""}`}
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
                  {recentTrips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.label} · {formatDuration(trip.duration_seconds)} ·{" "}
                      {trip.distance_km.toFixed(2)} km
                    </option>
                  ))}
                </select>

                <div className="mt-3 space-y-3 rounded-lg border border-slate-200 p-3">
                  {recentTrips.length === 0 && (
                    <p className="text-sm text-slate-500">
                      No hay recorridos recientes disponibles.
                    </p>
                  )}

                  {recentTrips.map((trip) => (
                    <button
                      key={trip.id}
                      type="button"
                      onClick={() => void handleLoadTripById(trip.id)}
                      className="block w-full rounded-md border border-transparent px-2 py-2 text-left hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2 text-sm">
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
                        {formatDateTime(trip.start_time)} - {formatDateTime(trip.end_time)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {isLoadingRoute && (
                <p className="mt-4 text-sm text-slate-500">Cargando recorrido...</p>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
};