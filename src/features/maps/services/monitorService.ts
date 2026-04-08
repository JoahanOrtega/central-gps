import { apiFetch } from "@/lib/api";
import type { MapUnitItem } from "../types/map.types";

/**
 * Servicio de monitor en vivo.
 * Encapsula las llamadas relacionadas con las unidades visibles en el mapa.
 */
export const monitorService = {
  /**
   * Obtiene las unidades activas con su última telemetría disponible.
   * Si se envía un texto de búsqueda, el backend filtra por número de unidad.
   */
  getUnitsLive(search = ""): Promise<MapUnitItem[]> {
    const normalizedSearch = search.trim();

    const query = normalizedSearch
      ? `/monitor/units-live?search=${encodeURIComponent(normalizedSearch)}`
      : "/monitor/units-live";

    return apiFetch<MapUnitItem[]>(query, {
      method: "GET",
    });
  },
};