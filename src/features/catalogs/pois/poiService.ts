import { apiFetch } from "@/lib/api";
import type {
  PoiItem,
  PoiGroupItem,
  ClientOption,
  CreatePoiPayload,
  CreatePoiGroupPayload,
  UpdatePoiPayload,
} from "./poi.types";

// ── Tipos de respuesta de update y delete ────────────────────────────────────
// Inline porque solo se usan aquí — si crecen, se promueven a poi.types.ts.
interface UpdatePoiResponse {
  message: string;
  actualizado: boolean;
  id_poi: number;
}

interface DeletePoiResponse {
  message: string;
  eliminado: boolean;
  id_poi: number;
}

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

// ── Helper para query con solo idEmpresa (sin search) ────────
// Usado en los endpoints PATCH y DELETE: necesitan idEmpresa como
// contexto pero no aceptan search.
const buildEmpresaQuery = (idEmpresa?: number | null): string =>
  idEmpresa ? `?id_empresa=${idEmpresa}` : "";

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

  // Actualización parcial (PATCH). Solo se mandan los campos que cambiaron.
  //
  // El backend usa UpdatePoiSchema sin load_default — los campos omitidos
  // NO entran al UPDATE SQL. Por eso es importante que el caller
  // (EditPoiModal) construya el payload con SOLO los campos modificados,
  // no el POI entero.
  //
  // idEmpresa: el sudo_erp lo manda explícitamente porque su JWT no tiene
  // id_empresa fijo. Otros roles lo heredan del JWT en el backend.
  //
  // Errores que puede lanzar (vía apiFetch):
  //   - 404 POI_NOT_FOUND: el POI no existe o no es de tu empresa
  //   - 422: errores de validación por campo (fields)
  //   - 400: body vacío sin campos para actualizar
  updatePoi(
    idPoi: number,
    payload: UpdatePoiPayload,
    idEmpresa?: number | null,
  ): Promise<UpdatePoiResponse> {
    return apiFetch<UpdatePoiResponse>(
      `/pois/${idPoi}${buildEmpresaQuery(idEmpresa)}`,
      {
        method: "PATCH",
        body: payload,
      },
    );
  },

  // Elimina (soft-delete) un POI — el backend lo marca con status=0.
  //
  // El POI desaparece del listado pero queda en BD para auditoría.
  // No requiere body — solo el id en la URL y el contexto de empresa.
  deletePoi(
    idPoi: number,
    idEmpresa?: number | null,
  ): Promise<DeletePoiResponse> {
    return apiFetch<DeletePoiResponse>(
      `/pois/${idPoi}${buildEmpresaQuery(idEmpresa)}`,
      {
        method: "DELETE",
      },
    );
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