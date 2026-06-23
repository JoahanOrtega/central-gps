import { apiFetch } from "@/lib/api";
import type {
    OperatorItem,
    CreateOperatorPayload,
    UpdateOperatorPayload,
    OperatorGroupItem,
    CreateOperatorGroupPayload,
    UpdateOperatorGroupPayload,
    AssignOperatorPayload,
} from "../services/operator.types";

interface MessageResponse {
    message: string;
}

// El id_empresa viaja por query param (no en el body): el backend de
// operadores lo resuelve así, y es consistente con el resto de catálogos.
// Para usuarios no-sudo el JWT ya filtra, pero pasarlo no estorba.
const empresaQuery = (idEmpresa?: number | null): string =>
    idEmpresa ? `?id_empresa=${idEmpresa}` : "";

export const operatorService = {
    // ── Operadores ──────────────────────────────────────────────────────────────

    list(
        search = "",
        idEmpresa?: number | null,
        signal?: AbortSignal,
    ): Promise<OperatorItem[]> {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (idEmpresa) params.set("id_empresa", String(idEmpresa));
        const qs = params.toString();
        return apiFetch<OperatorItem[]>(
            qs ? `/operadores?${qs}` : "/operadores",
            { method: "GET", signal },
        );
    },

    getById(idOperador: number, idEmpresa?: number | null): Promise<OperatorItem> {
        return apiFetch<OperatorItem>(
            `/operadores/${idOperador}${empresaQuery(idEmpresa)}`,
            { method: "GET" },
        );
    },

    create(
        payload: CreateOperatorPayload,
        idEmpresa?: number | null,
    ): Promise<{ message: string; operador: { id_operador: number } }> {
        return apiFetch(`/operadores${empresaQuery(idEmpresa)}`, {
            method: "POST",
            body: payload,
        });
    },

    update(
        idOperador: number,
        payload: UpdateOperatorPayload,
        idEmpresa?: number | null,
    ): Promise<{ message: string; operador: { id_operador: number } }> {
        return apiFetch(`/operadores/${idOperador}${empresaQuery(idEmpresa)}`, {
            method: "PATCH",
            body: payload,
        });
    },

    delete(idOperador: number, idEmpresa?: number | null): Promise<MessageResponse> {
        return apiFetch<MessageResponse>(
            `/operadores/${idOperador}${empresaQuery(idEmpresa)}`,
            { method: "DELETE" },
        );
    },

    // ── Asignación operador ↔ unidad ──────────────────────────────────────────────

    assign(
        idOperador: number,
        payload: AssignOperatorPayload,
        idEmpresa?: number | null,
    ): Promise<MessageResponse> {
        return apiFetch<MessageResponse>(
            `/operadores/${idOperador}/asignar${empresaQuery(idEmpresa)}`,
            { method: "POST", body: payload },
        );
    },

    unassign(idOperador: number, idEmpresa?: number | null): Promise<MessageResponse> {
        return apiFetch<MessageResponse>(
            `/operadores/${idOperador}/desasignar${empresaQuery(idEmpresa)}`,
            { method: "POST" },
        );
    },

    // ── Grupos de operadores ──────────────────────────────────────────────────────

    listGroups(
        search = "",
        idEmpresa?: number | null,
        signal?: AbortSignal,
    ): Promise<OperatorGroupItem[]> {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (idEmpresa) params.set("id_empresa", String(idEmpresa));
        const qs = params.toString();
        return apiFetch<OperatorGroupItem[]>(
            qs ? `/operador-grupos?${qs}` : "/operador-grupos",
            { method: "GET", signal },
        );
    },

    getGroupById(
        idGrupo: number,
        idEmpresa?: number | null,
    ): Promise<OperatorGroupItem> {
        return apiFetch<OperatorGroupItem>(
            `/operador-grupos/${idGrupo}${empresaQuery(idEmpresa)}`,
            { method: "GET" },
        );
    },

    createGroup(
        payload: CreateOperatorGroupPayload,
        idEmpresa?: number | null,
    ): Promise<{ message: string; id_grupo_operadores: number }> {
        return apiFetch(`/operador-grupos${empresaQuery(idEmpresa)}`, {
            method: "POST",
            body: payload,
        });
    },

    updateGroup(
        idGrupo: number,
        payload: UpdateOperatorGroupPayload,
        idEmpresa?: number | null,
    ): Promise<MessageResponse> {
        return apiFetch<MessageResponse>(
            `/operador-grupos/${idGrupo}${empresaQuery(idEmpresa)}`,
            { method: "PUT", body: payload },
        );
    },

    deleteGroup(idGrupo: number, idEmpresa?: number | null): Promise<MessageResponse> {
        return apiFetch<MessageResponse>(
            `/operador-grupos/${idGrupo}${empresaQuery(idEmpresa)}`,
            { method: "DELETE" },
        );
    },
};