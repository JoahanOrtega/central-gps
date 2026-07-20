import { apiFetch } from "@/lib/api";
import type {
  FuelCargaItem,
  CreateFuelCargaPayload,
  UpdateFuelCargaPayload,
  DeleteFuelCargaResponse,
  UnidadCatalogo,
  BulkImportFuelResponse
} from "../types/fuelCargas.types";

export const fuelCargasService = {
  getUnidades(idEmpresa?: number | null): Promise<UnidadCatalogo[]> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<UnidadCatalogo[]>(`/cargas/unidades${query}`, { method: "GET" });
  },

  list(search = "", idEmpresa?: number | null, signal?: AbortSignal): Promise<FuelCargaItem[]> {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (idEmpresa) params.set("id_empresa", String(idEmpresa));
    
    const query = params.toString() ? `/cargas?${params.toString()}` : "/cargas";
    return apiFetch<FuelCargaItem[]>(query, { method: "GET", signal });
  },

  create(payload: CreateFuelCargaPayload): Promise<FuelCargaItem> {
    return apiFetch<FuelCargaItem>("/cargas", { method: "POST", body: payload });
  },

  update(idCombustible: number, payload: UpdateFuelCargaPayload): Promise<FuelCargaItem> {
    return apiFetch<FuelCargaItem>(`/cargas/${idCombustible}`, { method: "PUT", body: payload });
  },

  delete(idCombustible: number): Promise<DeleteFuelCargaResponse> {
    return apiFetch<DeleteFuelCargaResponse>(`/cargas/${idCombustible}`, { method: "DELETE" });
  },

  bulkImport(idEmpresa: number, items: any[]): Promise<BulkImportFuelResponse> {
    return apiFetch<BulkImportFuelResponse>("/cargas/bulk", {
      method: "POST",
      body: { id_empresa: idEmpresa, items }
    });
  }
};