import { apiFetch } from "@/lib/api";
import type {
  CreateUnitPayload,
  CreateUnitResponse,
  UnitItem,
} from "../types/unit.types";

export const unitService = {
  getUnits(search = ""): Promise<UnitItem[]> {
    const query = search.trim()
      ? `/units?search=${encodeURIComponent(search.trim())}`
      : "/units";

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
