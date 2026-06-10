import { apiFetch } from "@/lib/api";
import type {
    ItinerarioGrupoRuta,
    ItinerariosPaginados,
    Itinerario,
    CreateItinerarioPayload,
} from "./itinerary.types";

// Construye query string descartando valores vacíos/nulos
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

export const itineraryService = {
    /**
     * Lista los itinerarios agrupados por ruta.
     * Útil para el catálogo visual donde se muestra ruta → turnos.
     */
    listGrouped(
        idEmpresa?: number | null,
        search = "",
        idRuta?: number | null,
    ): Promise<ItinerarioGrupoRuta[]> {
        return apiFetch<ItinerarioGrupoRuta[]>(
            `/operation/itineraries${buildQuery({
                id_empresa: idEmpresa,
                search,
                id_ruta: idRuta,
            })}`,
            { method: "GET" },
        ).then((grupos) =>
            grupos.map((g) => ({
                ...g,
                itinerarios: g.itinerarios.map((i) => ({
                    ...i,
                    dias: (Array.isArray(i.dias)
                        ? i.dias
                        : String(i.dias ?? "").split(" ").map(Number).filter((n) => !isNaN(n))
                    ) as import("./itinerary.types").DiaSemana[],
                    id_itinerario: Number(i.id_itinerario),
                })),
            }))
        );
    },

    /**
     * Lista los itinerarios en formato plano paginado.
     * Útil para selects y búsquedas rápidas.
     */
    listPaged(
        idEmpresa?: number | null,
        page = 1,
        pageSize = 25,
        search = "",
        idRuta?: number | null,
    ): Promise<ItinerariosPaginados> {
        return apiFetch<ItinerariosPaginados>(
            `/operation/itineraries/paged${buildQuery({
                id_empresa: idEmpresa,
                page,
                page_size: pageSize,
                search,
                id_ruta: idRuta,
            })}`,
            { method: "GET" },
        );
    },

    /** Detalle completo de un itinerario con sus paradas y horas. */
    getById(
        idItinerario: number,
        idEmpresa?: number | null,
    ): Promise<Itinerario> {
        return apiFetch<Itinerario>(
            `/operation/itineraries/${idItinerario}${buildQuery({ id_empresa: idEmpresa })}`,
            { method: "GET" },
        );
    },

    /** Crea un itinerario con sus paradas. */
    create(
        payload: CreateItinerarioPayload,
        idEmpresa?: number | null,
    ): Promise<{ id_itinerario: number; message: string }> {
        return apiFetch(
            `/operation/itineraries${buildQuery({ id_empresa: idEmpresa })}`,
            { method: "POST", body: payload },
        );
    },

    /** Actualiza un itinerario. Reemplaza sus paradas. */
    update(
        idItinerario: number,
        payload: CreateItinerarioPayload,
        idEmpresa?: number | null,
    ): Promise<{ message: string }> {
        return apiFetch(
            `/operation/itineraries/${idItinerario}${buildQuery({ id_empresa: idEmpresa })}`,
            { method: "PUT", body: payload },
        );
    },

    /** Soft-delete de un itinerario. */
    delete(
        idItinerario: number,
        idEmpresa?: number | null,
    ): Promise<{ message: string }> {
        return apiFetch(
            `/operation/itineraries/${idItinerario}${buildQuery({ id_empresa: idEmpresa })}`,
            { method: "DELETE" },
        );
    },
};