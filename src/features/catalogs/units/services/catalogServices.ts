import { apiFetch } from "@/lib/api";

export interface OperatorOption {
  id_operador: number;
  nombre: string;
}

export interface UnitGroupOption {
  id_grupo_unidades: number;
  nombre: string;
}

export interface AvlModelOption {
  id_modelo_avl: number;
  modelo: string;
}

export const catalogService = {
  getOperators(search?: string, idEmpresa?: number | null): Promise<OperatorOption[]> {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (idEmpresa) params.set("id_empresa", String(idEmpresa));
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiFetch(`/catalogs/operators${query}`, { method: "GET" });
  },

  getUnitGroups(search?: string, idEmpresa?: number | null): Promise<UnitGroupOption[]> {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (idEmpresa) params.set("id_empresa", String(idEmpresa));
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiFetch(`/catalogs/unit-groups${query}`, { method: "GET" });
  },

  getAvlModels(): Promise<AvlModelOption[]> {
    return apiFetch("/catalogs/avl-models", { method: "GET" });
  },
};