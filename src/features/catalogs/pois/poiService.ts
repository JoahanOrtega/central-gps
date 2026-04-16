import { apiFetch } from "@/lib/api";
import type {
  PoiItem,
  PoiGroupItem,
  ClientOption,
  CreatePoiPayload,
  CreatePoiGroupPayload,
} from "./poi.types";

export const poiService = {
  getPois(search = ""): Promise<PoiItem[]> {
    const query = search.trim()
      ? `/pois?search=${encodeURIComponent(search.trim())}`
      : "/pois";

    return apiFetch<PoiItem[]>(query, {
      method: "GET",
    });
  },

  createPoi(payload: CreatePoiPayload) {
    return apiFetch("/pois", {
      method: "POST",
      body: payload,
    });
  },

  getPoiGroups(search = ""): Promise<PoiGroupItem[]> {
    const query = search.trim()
      ? `/poi-groups?search=${encodeURIComponent(search.trim())}`
      : "/poi-groups";

    return apiFetch<PoiGroupItem[]>(query, {
      method: "GET",
    });
  },

  createPoiGroup(payload: CreatePoiGroupPayload) {
    return apiFetch("/poi-groups", {
      method: "POST",
      body: payload,
    });
  },

  // Retorna la lista de clientes disponibles para asignar a un grupo de POIs
  getClients(): Promise<ClientOption[]> {
    return apiFetch<ClientOption[]>("/clients", {
      method: "GET",
    });
  },
};