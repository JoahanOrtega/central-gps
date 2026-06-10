import { apiFetch } from "@/lib/api";
import type {
    ItineraryGroup, ItineraryGroupDetail, CreateGroupPayload,
    ItineraryRole, ItineraryRoleDetail, CreateRolePayload,
} from "./itinerary-group.types";

const buildQuery = (
    params: Record<string, string | number | null | undefined>,
): string => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined && value !== "") {
            search.append(key, String(value));
        }
    }
    const qs = search.toString();
    return qs ? `?${qs}` : "";
};

// ── Grupos ────────────────────────────────────────────────────────────────────

export const itineraryGroupService = {
    listGroups(
        idEmpresa?: number | null,
        search = "",
    ): Promise<ItineraryGroup[]> {
        return apiFetch<ItineraryGroup[]>(
            `/operation/itinerary-groups${buildQuery({ id_empresa: idEmpresa, search })}`,
            { method: "GET" },
        );
    },

    getGroupById(
        id: number,
        idEmpresa?: number | null,
    ): Promise<ItineraryGroupDetail> {
        return apiFetch<ItineraryGroupDetail>(
            `/operation/itinerary-groups/${id}${buildQuery({ id_empresa: idEmpresa })}`,
            { method: "GET" },
        );
    },

    createGroup(
        payload: CreateGroupPayload,
        idEmpresa?: number | null,
    ): Promise<{ id_grupo_itinerarios: number; message: string }> {
        return apiFetch(
            `/operation/itinerary-groups${buildQuery({ id_empresa: idEmpresa })}`,
            { method: "POST", body: payload },
        );
    },

    updateGroup(
        id: number,
        payload: Partial<CreateGroupPayload>,
        idEmpresa?: number | null,
    ): Promise<{ message: string }> {
        return apiFetch(
            `/operation/itinerary-groups/${id}${buildQuery({ id_empresa: idEmpresa })}`,
            { method: "PUT", body: payload },
        );
    },

    deleteGroup(
        id: number,
        idEmpresa?: number | null,
    ): Promise<{ message: string }> {
        return apiFetch(
            `/operation/itinerary-groups/${id}${buildQuery({ id_empresa: idEmpresa })}`,
            { method: "DELETE" },
        );
    },
};

// ── Roles ─────────────────────────────────────────────────────────────────────

export const itineraryRoleService = {
    listRoles(
        idEmpresa?: number | null,
        search = "",
    ): Promise<ItineraryRole[]> {
        return apiFetch<ItineraryRole[]>(
            `/operation/itinerary-roles${buildQuery({ id_empresa: idEmpresa, search })}`,
            { method: "GET" },
        );
    },

    getRoleById(
        id: number,
        idEmpresa?: number | null,
    ): Promise<ItineraryRoleDetail> {
        return apiFetch<ItineraryRoleDetail>(
            `/operation/itinerary-roles/${id}${buildQuery({ id_empresa: idEmpresa })}`,
            { method: "GET" },
        );
    },

    createRole(
        payload: CreateRolePayload,
        idEmpresa?: number | null,
    ): Promise<{ id_rol_itinerarios: number; message: string }> {
        return apiFetch(
            `/operation/itinerary-roles${buildQuery({ id_empresa: idEmpresa })}`,
            { method: "POST", body: payload },
        );
    },

    updateRole(
        id: number,
        payload: Partial<CreateRolePayload>,
        idEmpresa?: number | null,
    ): Promise<{ message: string }> {
        return apiFetch(
            `/operation/itinerary-roles/${id}${buildQuery({ id_empresa: idEmpresa })}`,
            { method: "PUT", body: payload },
        );
    },

    deleteRole(
        id: number,
        idEmpresa?: number | null,
    ): Promise<{ message: string }> {
        return apiFetch(
            `/operation/itinerary-roles/${id}${buildQuery({ id_empresa: idEmpresa })}`,
            { method: "DELETE" },
        );
    },
};