import { apiFetch } from "@/lib/api";
import type {
  RouteItem,
  Route,
  CreateRoutePayload,
} from "../types/route.types";

const buildQuery = (params: Record<string, string | number | null | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

// Servicio del catálogo de Rutas
export const routeService = {
  /** Lista las rutas de la empresa, con búsqueda opcional. */
  list(search: string, idEmpresa?: number | null): Promise<RouteItem[]> {
    return apiFetch<RouteItem[]>(
      `/operation/routes${buildQuery({ search, id_empresa: idEmpresa })}`,
      { method: "GET" },
    );
  },

  /** Trae el detalle completo de una ruta (con logísticas y paradas) para editar. */
  getById(idRuta: number, idEmpresa?: number | null): Promise<Route> {
    return apiFetch<Route>(
      `/operation/routes/${idRuta}${buildQuery({ id_empresa: idEmpresa })}`,
      { method: "GET" },
    );
  },

  /** Crea una ruta nueva. */
  create(payload: CreateRoutePayload): Promise<{ message: string; id_ruta: number }> {
    return apiFetch(`/operation/routes`, { method: "POST", body: payload });
  },

  /** Edita una ruta existente. */
  update(
    idRuta: number,
    payload: CreateRoutePayload,
  ): Promise<{ message: string }> {
    return apiFetch(`/operation/routes/${idRuta}`, { method: "PUT", body: payload });
  },

  /** Elimina (soft-delete) una ruta. */
  delete(idRuta: number, idEmpresa?: number | null): Promise<{ message: string }> {
    return apiFetch(
      `/operation/routes/${idRuta}${buildQuery({ id_empresa: idEmpresa })}`,
      { method: "DELETE" },
    );
  },
};