import { apiFetch } from "@/lib/api";
import type { MapUnitItem } from "../types/map.types";

/**
 * Servicio de monitor en vivo.
 * Encapsula las llamadas relacionadas con las unidades visibles en el mapa.
 */
export const monitorService = {
  /**
   * Obtiene las unidades activas con su última telemetría disponible.
   *
   * idEmpresa es necesario para sudo_erp, que no tiene empresa fija
   * en el JWT y debe indicar explícitamente con qué empresa opera.
   * Para usuarios normales el backend lo toma del JWT como fallback.
   */
  getUnitsLive(search = "", idEmpresa?: number | null): Promise<MapUnitItem[]> {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (idEmpresa) params.set("id_empresa", String(idEmpresa));

    const query = params.toString()
      ? `/monitor/units-live?${params.toString()}`
      : "/monitor/units-live";

    return apiFetch<MapUnitItem[]>(query, { method: "GET" });
  },
};