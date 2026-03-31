import { apiFetch } from "@/lib/api";
import type {
  MapUnitItem,
  RecentTripItem,
  RoutePoint,
  TripUnitSummary,
} from "../components/maps/map.types";

export const telemetryService = {
  getUnitsLive(search = "") {
    const query = search.trim()
      ? `/monitor/units-live?search=${encodeURIComponent(search.trim())}`
      : "/monitor/units-live";

    return apiFetch<MapUnitItem[]>(query, {
      method: "GET",
    });
  },

  getUnitSummary(imei: string) {
    return apiFetch<TripUnitSummary>(`/monitor/unit-summary/${imei}`, {
      method: "GET",
    });
  },

  getRouteByMode(
    imei: string,
    mode: "latest" | "today" | "yesterday" | "day_before_yesterday",
  ) {
    return apiFetch<RoutePoint[]>(`/telemetry/route/${imei}?mode=${mode}`, {
      method: "GET",
    });
  },

  getRecentTrips(imei: string) {
    return apiFetch<RecentTripItem[]>(`/telemetry/recent-trips/${imei}`, {
      method: "GET",
    });
  },

  getTripById(imei: string, tripId: string) {
    return apiFetch<RoutePoint[]>(`/telemetry/trip/${imei}/${tripId}`, {
      method: "GET",
    });
  },
};