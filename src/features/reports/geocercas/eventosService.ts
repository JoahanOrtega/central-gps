// features/reports/geocercas/eventosService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Servicio para el historial de eventos de geocerca.

import { apiFetch } from "@/lib/api";
import type { EventosResponse, EventosFiltros } from "./eventos.types";

// Convierte el objeto de filtros a query params
const buildParams = (
    filtros: EventosFiltros,
    idEmpresa?: number | null,
): string => {
    const params = new URLSearchParams();

    if (idEmpresa) params.set("id_empresa", String(idEmpresa));
    if (filtros.desde) params.set("desde", filtros.desde);
    if (filtros.hasta) params.set("hasta", filtros.hasta);
    if (filtros.id_unidad) params.set("id_unidad", String(filtros.id_unidad));
    if (filtros.id_poi) params.set("id_poi", String(filtros.id_poi));
    if (filtros.tipos_evento?.length)
        params.set("tipos_evento", filtros.tipos_evento.join(","));
    if (filtros.pagina) params.set("pagina", String(filtros.pagina));
    if (filtros.limite) params.set("limite", String(filtros.limite));

    return params.toString();
};

export const eventosService = {
    /**
     * Retorna el historial de eventos paginado con filtros.
     */
    getEventos(
        filtros: EventosFiltros,
        idEmpresa?: number | null,
    ): Promise<EventosResponse> {
        const qs = buildParams(filtros, idEmpresa);
        return apiFetch<EventosResponse>(`/eventos?${qs}`, { method: "GET" });
    },

    /**
     * Descarga los eventos filtrados como CSV.
     * Retorna la URL de descarga directa — el navegador abre el dialogo
     * de guardar archivo automaticamente.
     */
    getExportUrl(
        filtros: EventosFiltros,
        idEmpresa?: number | null,
        baseUrl = "",
    ): string {
        const qs = buildParams(filtros, idEmpresa);
        return `${baseUrl}/eventos/export?${qs}`;
    },
};