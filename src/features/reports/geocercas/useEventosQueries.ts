import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { poiService } from "@/features/catalogs/pois/poiService";
import { eventosService } from "./eventosService";
import type { EventosFiltros } from "./eventos.types";

// 5 minutos para listas que cambian poco
const STALE_TIME_MS = 5 * 60 * 1000;

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface UnidadOption {
    id: number;
    numero: string;
    marca: string;
}

interface PoiOption {
    id_poi: number;
    nombre: string;
}

// ── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Lista de unidades de la empresa activa.
 * Cacheada 5 min — las unidades cambian raramente.
 */
export const useUnidadesQuery = (idEmpresa: number | null) =>
    useQuery<UnidadOption[]>({
        queryKey: ["unidades-lista", idEmpresa],
        queryFn: () => apiFetch<UnidadOption[]>(`/units?id_empresa=${idEmpresa}`),
        enabled: !!idEmpresa,
        staleTime: STALE_TIME_MS,
    });

/**
 * Lista de POIs de la empresa activa.
 */
export const usePoisQuery = (idEmpresa: number | null) =>
    useQuery<PoiOption[]>({
        queryKey: queryKeys.pois.list(idEmpresa, ""),
        queryFn: () => poiService.getPois("", idEmpresa as number),
        enabled: !!idEmpresa,
        staleTime: STALE_TIME_MS,
    });

/**
 * Query principal de eventos paginados según filtros aplicados.
 *
 * Se invalida automáticamente cuando cambian `filtros` o `pagina` porque
 * forman parte de la queryKey — TanStack los detecta y refetch sin que
 * tengamos que hacer nada.
 */
export const useEventosQuery = (
    idEmpresa: number | null,
    filtros: EventosFiltros,
    pagina: number,
) =>
    useQuery({
        queryKey: queryKeys.eventos.lista(idEmpresa, filtros, pagina),
        queryFn: () =>
            eventosService.getEventos(
                { ...filtros, pagina },
                idEmpresa as number,
            ),
        enabled: !!idEmpresa,
    });