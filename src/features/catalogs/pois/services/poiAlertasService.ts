// features/catalogs/pois/poiAlertasService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Servicio para los endpoints de alertas de geocerca por POI.
// Sigue el mismo patron que poiService.ts — apiFetch + query params.

import { apiFetch } from "@/lib/api";
import type {
    AlertaPoi,
    UpsertAlertaPoiPayload,
    UpsertAlertaPoiResponse,
} from "../types/poi-alertas.types";

const buildEmpresaQuery = (idEmpresa?: number | null): string =>
    idEmpresa ? `?id_empresa=${idEmpresa}` : "";

export const poiAlertasService = {
    /**
     * Lee la configuracion de alerta de un POI.
     * Si no tiene alerta, el backend retorna defaults con todos los toggles en 0.
     */
    getAlerta(idPoi: number, idEmpresa?: number | null): Promise<AlertaPoi> {
        return apiFetch<AlertaPoi>(
            `/pois/${idPoi}/alertas${buildEmpresaQuery(idEmpresa)}`,
            { method: "GET" },
        );
    },

    /**
     * Crea o actualiza (upsert) la alerta de un POI.
     * El worker detecta el cambio en el proximo ciclo (max 15s).
     */
    upsertAlerta(
        idPoi: number,
        payload: UpsertAlertaPoiPayload,
        idEmpresa?: number | null,
    ): Promise<UpsertAlertaPoiResponse> {
        return apiFetch<UpsertAlertaPoiResponse>(
            `/pois/${idPoi}/alertas${buildEmpresaQuery(idEmpresa)}`,
            { method: "POST", body: payload },
        );
    },

    /**
     * Desactiva la alerta de un POI (status=0).
     * El worker deja de procesar el POI en el proximo ciclo.
     */
    desactivarAlerta(
        idPoi: number,
        idEmpresa?: number | null,
    ): Promise<{ message: string; desactivada: boolean }> {
        return apiFetch(
            `/pois/${idPoi}/alertas${buildEmpresaQuery(idEmpresa)}`,
            { method: "DELETE" },
        );
    },
};