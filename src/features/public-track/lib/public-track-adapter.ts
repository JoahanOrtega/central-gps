import type { MapUnitItem, EngineState } from "@/features/maps/types/map.types";
import type { PublicTrackResponse } from "../publicTrackService";

// Convierte la respuesta del rastreo público en un MapUnitItem, para poder
// reusar buildUnitMarkerContent (el mismo marcador del mapa interno) en vez de
// pintar uno propio. Así la unidad se ve idéntica en ambos lados: flecha
// rotada según los grados en movimiento, círculo detenida, color por estado.
//
// Los campos que el rastreo público no necesita (sensores, operador, último
// viaje) se dejan en null: buildUnitMarkerContent no los usa para el marcador.
export const toMapUnitItem = (resp: PublicTrackResponse): MapUnitItem | null => {
    const pos = resp.posicion;
    if (!pos || pos.latitud == null || pos.longitud == null) return null;

    const engineState = (pos.engine_state ?? "unknown") as EngineState;

    return {
        id: 0,
        numero: resp.unidad.numero,
        imei: "",
        marca: resp.unidad.marca,
        modelo: resp.unidad.modelo ?? "",
        vel_max: resp.unidad.vel_max ?? null,
        engine_state: engineState,
        segundos_en_estado_actual: pos.segundos_en_estado_actual ?? null,
        telemetry: {
            imei: "",
            fecha_hora_gps: pos.fecha_hora_gps,
            latitud: pos.latitud,
            longitud: pos.longitud,
            velocidad: pos.velocidad,
            grados: pos.grados,
            status: pos.status ?? null,
            tipo_alerta: pos.tipo_alerta ?? null,
            engine_state: engineState,
            segundos_en_estado_actual: pos.segundos_en_estado_actual ?? null,
            voltaje: null,
            segundos: pos.segundos ?? null,
            segundos_sistema: pos.segundos_sistema ?? null,
        },
    };
};