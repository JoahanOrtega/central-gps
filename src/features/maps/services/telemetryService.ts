import { apiFetch } from "@/lib/api";
import type {
  CustomRangeParams,
  RecentTripItem,
  RoutePoint,
  TripUnitSummary,
} from "../types/map.types";

export type RouteMode =
  | "latest"
  | "today"
  | "yesterday"
  | "day_before_yesterday";

// ── Helper para construir query params con idEmpresa ──────────
// Centraliza el patrón repetido en todos los métodos del service.
const buildParams = (
  base: Record<string, string>,
  idEmpresa?: number | null,
): string => {
  const params = new URLSearchParams(base);
  if (idEmpresa) params.set("id_empresa", String(idEmpresa));
  return params.toString() ? `?${params.toString()}` : "";
};

/**
 * Servicio de telemetría.
 * Centraliza las consultas de recorridos y resumen de unidad.
 * idEmpresa es requerido para sudo_erp — su JWT tiene id_empresa=null.
 */
export const telemetryService = {
  /**
   * Obtiene el resumen de una unidad a partir de su IMEI.
   */
  getUnitSummary(imei: string, idEmpresa?: number | null): Promise<TripUnitSummary> {
    const qs = buildParams({}, idEmpresa);
    return apiFetch<TripUnitSummary>(
      `/monitor/unit-summary/${encodeURIComponent(imei)}${qs}`,
      { method: "GET" },
    );
  },

  /**
   * Obtiene el recorrido por modo:
   * - latest, today, yesterday, day_before_yesterday
   */
  getRouteByMode(imei: string, mode: RouteMode, idEmpresa?: number | null): Promise<RoutePoint[]> {
    const qs = buildParams({ mode }, idEmpresa);
    return apiFetch<RoutePoint[]>(
      `/telemetry/route/${encodeURIComponent(imei)}${qs}`,
      { method: "GET" },
    );
  },

  /**
   * Obtiene la lista de recorridos recientes de una unidad.
   */
  getRecentTrips(imei: string, idEmpresa?: number | null): Promise<RecentTripItem[]> {
    const qs = buildParams({}, idEmpresa);
    return apiFetch<RecentTripItem[]>(
      `/telemetry/recent-trips/${encodeURIComponent(imei)}${qs}`,
      { method: "GET" },
    );
  },

  /**
   * Obtiene el detalle completo de un recorrido específico.
   */
  getTripById(imei: string, tripId: string, idEmpresa?: number | null): Promise<RoutePoint[]> {
    const qs = buildParams({}, idEmpresa);
    return apiFetch<RoutePoint[]>(
      `/telemetry/trip/${encodeURIComponent(imei)}/${encodeURIComponent(tripId)}${qs}`,
      { method: "GET" },
    );
  },

  /**
   * Obtiene el recorrido en un rango de fechas personalizado.
   */
  getRouteByCustomRange(
    imei: string,
    params: CustomRangeParams,
    idEmpresa?: number | null,
  ): Promise<RoutePoint[]> {
    const urlParams = new URLSearchParams({
      start_date: params.startDate,
      end_date: params.endDate,
    });
    if (params.startTime) urlParams.set("start_time", params.startTime);
    if (params.endTime) urlParams.set("end_time", params.endTime);
    if (idEmpresa) urlParams.set("id_empresa", String(idEmpresa));

    return apiFetch<RoutePoint[]>(
      `/telemetry/route-custom/${encodeURIComponent(imei)}?${urlParams.toString()}`,
      { method: "GET" },
    );
  },
};