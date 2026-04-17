import { apiFetch } from "@/lib/api";
import type {
  PoiItem,
  PoiGroupItem,
  ClientOption,
  CreatePoiPayload,
  CreatePoiGroupPayload,
} from "./poi.types";

// ── Helper para construir query params con idEmpresa ──────────
// Centraliza la lógica repetida en todos los métodos GET del service.
const buildQuery = (
  base: string,
  search?: string,
  idEmpresa?: number | null,
): string => {
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  if (idEmpresa) params.set("id_empresa", String(idEmpresa));
  return params.toString() ? `${base}?${params.toString()}` : base;
};

export const poiService = {
  getPois(search = "", idEmpresa?: number | null): Promise<PoiItem[]> {
    return apiFetch<PoiItem[]>(buildQuery("/pois", search, idEmpresa), {
      method: "GET",
    });
  },

  createPoi(payload: CreatePoiPayload, idEmpresa?: number | null) {
    return apiFetch("/pois", {
      method: "POST",
      // Incluir id_empresa en el body para soportar sudo_erp
      body: { ...payload, id_empresa: idEmpresa },
    });
  },

  getPoiGroups(search = "", idEmpresa?: number | null): Promise<PoiGroupItem[]> {
    return apiFetch<PoiGroupItem[]>(buildQuery("/poi-groups", search, idEmpresa), {
      method: "GET",
    });
  },

  createPoiGroup(payload: CreatePoiGroupPayload, idEmpresa?: number | null) {
    return apiFetch("/poi-groups", {
      method: "POST",
      // Incluir id_empresa en el body para soportar sudo_erp
      body: { ...payload, id_empresa: idEmpresa },
    });
  },

  // Retorna la lista de clientes disponibles para asignar a un grupo de POIs
  getClients(idEmpresa?: number | null): Promise<ClientOption[]> {
    return apiFetch<ClientOption[]>(
      buildQuery("/clients", undefined, idEmpresa),
      { method: "GET" },
    );
  },
};