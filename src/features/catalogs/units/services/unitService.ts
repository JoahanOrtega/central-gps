import { apiFetch } from "@/lib/api";
import type {
  CreateUnitPayload,
  CreateUnitResponse,
  UnitItem,
} from "../types/unit.types";

export const unitService = {
  getUnits(search = "", idEmpresa?: number | null): Promise<UnitItem[]> {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (idEmpresa) params.set("id_empresa", String(idEmpresa));

    const query = params.toString() ? `/units?${params.toString()}` : "/units";

    return apiFetch<UnitItem[]>(query, {
      method: "GET",
    });
  },

  createUnit(payload: CreateUnitPayload): Promise<CreateUnitResponse> {
    return apiFetch<CreateUnitResponse>("/units", {
      method: "POST",
      body: payload,
    });
  },
};