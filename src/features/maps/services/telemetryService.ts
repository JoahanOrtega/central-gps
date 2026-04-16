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

/**
 * Servicio de telemetría.
 * Centraliza las consultas de recorridos y resumen de unidad.
 */
export const telemetryService = {
  /**
   * Obtiene el resumen de una unidad a partir de su IMEI.
   */
  getUnitSummary(imei: string): Promise<TripUnitSummary> {
    return apiFetch<TripUnitSummary>(
      `/monitor/unit-summary/${encodeURIComponent(imei)}`,
      { method: "GET" },
    );
  },

  /**
   * Obtiene el recorrido por modo:
   * - latest
   * - today
   * - yesterday
   * - day_before_yesterday
   */
  getRouteByMode(imei: string, mode: RouteMode): Promise<RoutePoint[]> {
    return apiFetch<RoutePoint[]>(
      `/telemetry/route/${encodeURIComponent(imei)}?mode=${encodeURIComponent(mode)}`,
      { method: "GET" },
    );
  },

  /**
   * Obtiene la lista de recorridos recientes de una unidad.
   */
  getRecentTrips(imei: string): Promise<RecentTripItem[]> {
    return apiFetch<RecentTripItem[]>(
      `/telemetry/recent-trips/${encodeURIComponent(imei)}`,
      { method: "GET" },
    );
  },

  /**
   * Obtiene el detalle completo de un recorrido específico.
   */
  getTripById(imei: string, tripId: string): Promise<RoutePoint[]> {
    return apiFetch<RoutePoint[]>(
      `/telemetry/trip/${encodeURIComponent(imei)}/${encodeURIComponent(tripId)}`,
      { method: "GET" },
    );
  },

  /**
   * Obtiene recorrido por rango personalizado.
   */
  getRouteByCustomRange(
    imei: string,
    params: CustomRangeParams
  ): Promise<RoutePoint[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('start_date', params.startDate);
    if (params.startTime) queryParams.append('start_time', params.startTime);
    queryParams.append('end_date', params.endDate);
    if (params.endTime) queryParams.append('end_time', params.endTime);

    return apiFetch<RoutePoint[]>(
      `/telemetry/route-custom/${encodeURIComponent(imei)}?${queryParams.toString()}`,
      { method: 'GET' }
    );
  },

  /**
   * Archiva un recorrido (guardar para consulta posterior).
   */
  archiveTrip(imei: string, tripData: { start: string; end: string; label?: string }): Promise<{ success: boolean }> {
    return apiFetch('/telemetry/archive-trip', {
      method: 'POST',
      body: { imei, ...tripData },
    });
  },
};