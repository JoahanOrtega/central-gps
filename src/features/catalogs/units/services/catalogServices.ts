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

export interface ProtocolOption {
  id_protocolo: number;
  nombre: string;
  tipo: string; // 'in', 'out', 'rs232'
}

export const catalogService = {
  getOperators(search?: string): Promise<OperatorOption[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiFetch(`/catalogs/operators${query}`, { method: 'GET' });
  },

  getUnitGroups(search?: string): Promise<UnitGroupOption[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiFetch(`/catalogs/unit-groups${query}`, { method: 'GET' });
  },

  getAvlModels(): Promise<AvlModelOption[]> {
    return apiFetch('/catalogs/avl-models', { method: 'GET' });
  },

  getProtocols(tipo?: 'in' | 'out' | 'rs232'): Promise<ProtocolOption[]> {
    const query = tipo ? `?tipo=${tipo}` : '';
    return apiFetch(`/catalogs/protocols${query}`, { method: 'GET' });
  },
};