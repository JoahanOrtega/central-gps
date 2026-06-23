import { apiFetch } from "@/lib/api";
import type {
    AlertaPoi,
    UpsertAlertaPoiPayload,
    UpsertAlertaPoiResponse,
} from "@/features/catalogs/pois/types/poi-alertas.types";

const buildQuery = (idEmpresa?: number | null): string =>
    idEmpresa ? `?id_empresa=${idEmpresa}` : "";

/**
 * Alertas de geocerca para clientes.
 */
export const clientAlertasService = {
    getAlerta(
        idCliente: number,
        idEmpresa?: number | null,
    ): Promise<AlertaPoi> {
        return apiFetch<AlertaPoi>(
            `/catalogs/clients/${idCliente}/alertas${buildQuery(idEmpresa)}`,
            { method: "GET" },
        );
    },

    upsertAlerta(
        idCliente: number,
        payload: UpsertAlertaPoiPayload,
        idEmpresa?: number | null,
    ): Promise<UpsertAlertaPoiResponse> {
        return apiFetch<UpsertAlertaPoiResponse>(
            `/catalogs/clients/${idCliente}/alertas${buildQuery(idEmpresa)}`,
            { method: "POST", body: payload },
        );
    },

    desactivarAlerta(
        idCliente: number,
        idEmpresa?: number | null,
    ): Promise<{ message: string; desactivada: boolean }> {
        return apiFetch(
            `/catalogs/clients/${idCliente}/alertas${buildQuery(idEmpresa)}`,
            { method: "DELETE" },
        );
    },
};