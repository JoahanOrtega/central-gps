import { apiFetch } from "@/lib/api";
import type {
  AforoItem,
  CreateAforoPayload,
  UpdateAforoPayload,
  DeleteAforoResponse,
  GroupItem,
  CreateGroupPayload,
  UpdateGroupPayload,
  DeleteGroupResponse,
  RouteItem,
  ClientItem,
} from "../types/aforo.types";

export const aforosService = {
  // ─── Rutas ────────────────────────────────────────────────────────────────
  listRoutes(idEmpresa?: number | null): Promise<RouteItem[]> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<RouteItem[]>(`/aforos/routes${query}`, { method: "GET" });
  },

  // ─── Clientes ─────────────────────────────────────────────────────────────
  listClients(idEmpresa?: number | null): Promise<ClientItem[]> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<ClientItem[]>(`/aforos/clients${query}`, { method: "GET" });
  },

  // ─── Aforos ──────────────────────────────────────────────────────────────
  list(
    search = "",
    idEmpresa?: number | null,
    isBlacklist?: boolean | null,
    signal?: AbortSignal,
  ): Promise<AforoItem[]> {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (idEmpresa) params.set("id_empresa", String(idEmpresa));
    if (isBlacklist !== undefined && isBlacklist !== null) {
      params.set("is_blacklist", String(isBlacklist));
    }
    const query = params.toString() ? `/aforos?${params.toString()}` : "/aforos";
    return apiFetch<AforoItem[]>(query, { method: "GET", signal });
  },

  create(payload: CreateAforoPayload): Promise<AforoItem> {
    return apiFetch<AforoItem>("/aforos", { method: "POST", body: payload });
  },

  update(idAforo: number, payload: UpdateAforoPayload): Promise<AforoItem> {
    return apiFetch<AforoItem>(`/aforos/${idAforo}`, { method: "PUT", body: payload });
  },

  delete(idAforo: number): Promise<DeleteAforoResponse> {
    return apiFetch<DeleteAforoResponse>(`/aforos/${idAforo}`, { method: "DELETE" });
  },

  toggleBlacklist(idAforo: number, isBlacklist: boolean): Promise<AforoItem> {
    // Solución al formato de fecha: Formatea a "YYYY-MM-DD HH:mm:ss" usando la hora local
    let formattedDate: string | null = null;
    if (isBlacklist) {
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const localISO = new Date(now.getTime() - offset).toISOString();
      formattedDate = localISO.slice(0, 19).replace("T", " ");
    }

    return apiFetch<AforoItem>(`/aforos/${idAforo}/blacklist`, {
      method: "PATCH",
      body: {
        is_blacklist: isBlacklist,
        blacklist_date: formattedDate,
      },
    });
  },

  // ─── Grupos ──────────────────────────────────────────────────────────────
  listGroups(
    search = "",
    idEmpresa?: number | null,
    signal?: AbortSignal,
  ): Promise<GroupItem[]> {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (idEmpresa) params.set("id_empresa", String(idEmpresa));
    const query = params.toString() ? `/aforos/groups?${params.toString()}` : "/aforos/groups";
    return apiFetch<GroupItem[]>(query, { method: "GET", signal });
  },

  createGroup(payload: CreateGroupPayload): Promise<GroupItem> {
    return apiFetch<GroupItem>("/aforos/groups", { method: "POST", body: payload });
  },

  updateGroup(
    idGrupoAforos: number,
    payload: UpdateGroupPayload,
    idEmpresa?: number | null,
  ): Promise<GroupItem> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<GroupItem>(`/aforos/groups/${idGrupoAforos}${query}`, {
      method: "PUT",
      body: payload,
    });
  },

  deleteGroup(idGrupoAforos: number): Promise<DeleteGroupResponse> {
    return apiFetch<DeleteGroupResponse>(`/aforos/groups/${idGrupoAforos}`, { method: "DELETE" });
  },
};