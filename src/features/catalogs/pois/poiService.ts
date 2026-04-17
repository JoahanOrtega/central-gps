import { apiFetch } from "@/lib/api";
import type {
  PoiItem,
  PoiGroupItem,
  ClientOption,
  CreatePoiPayload,
  CreatePoiGroupPayload,
} from "./poi.types";

export const poiService = {
  getPois(search = "", idEmpresa?: number | null): Promise<PoiItem[]> {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (idEmpresa) params.set("id_empresa", String(idEmpresa));
    const query = params.toString() ? `/pois?${params.toString()}` : "/pois";

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