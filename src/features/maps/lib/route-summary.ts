import type { RoutePoint } from "../types/map.types";
import { haversineKm } from "./map-geometry";

/**
 * Resumen calculado de un recorrido.
 * Se usa para mostrar métricas rápidas en el drawer de recorridos.
 */
export interface RouteSummary {
  movementCount: number;
  distanceKm: number;
  movingSeconds: number;
  stopSeconds: number;
  offSeconds: number;
}

/**
 * Convierte segundos a un formato legible para UI.
 * Ejemplos:
 * - 45 -> 45s
 * - 125 -> 2m 5s
 * - 3670 -> 1h 1m 10s
 */
export const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

/**
 * Genera un resumen completo del recorrido a partir de sus puntos.
 *
 * Reglas actuales:
 * - engine_state === "off" => tiempo apagado
 * - engine_state === "on" + velocidad >= 1 => movimiento
 * - engine_state === "on" + velocidad < 1 => stop (relentí)
 * - engine_state === "unknown" => no se acumula (se descarta del resumen)
 *
 * Nota: antes este cálculo usaba constantes locales STATUS_ON/STATUS_OFF
 * y parseaba bits del campo `status`. Esa lógica fue unificada en el
 * backend (utils/engine_state.py) y ahora se consume desde el campo
 * derivado `engine_state` de cada punto.
 */
export const getRouteSummary = (points: RoutePoint[]): RouteSummary => {
  if (!points.length) {
    return {
      movementCount: 0,
      distanceKm: 0,
      movingSeconds: 0,
      stopSeconds: 0,
      offSeconds: 0,
    };
  }

  let movementCount = 0;
  let distanceKm = 0;
  let movingSeconds = 0;
  let stopSeconds = 0;
  let offSeconds = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    const previousDate = new Date(previous.fecha_hora_gps);
    const currentDate = new Date(current.fecha_hora_gps);

    const deltaSeconds = Math.max(
      0,
      Math.floor((currentDate.getTime() - previousDate.getTime()) / 1000),
    );

    const previousSpeed = previous.velocidad ?? 0;
    const previousEngineState = previous.engine_state;

    // Distancia acumulada siempre que ambos puntos tengan coordenadas
    if (
      previous.latitud != null &&
      previous.longitud != null &&
      current.latitud != null &&
      current.longitud != null
    ) {
      distanceKm += haversineKm(
        previous.latitud,
        previous.longitud,
        current.latitud,
        current.longitud,
      );
    }

    // Clasificación del intervalo según engine_state
    if (previousEngineState === "off") {
      offSeconds += deltaSeconds;
      continue;
    }

    if (previousEngineState === "on" && previousSpeed >= 1) {
      movingSeconds += deltaSeconds;
      movementCount += 1;
      continue;
    }

    if (previousEngineState === "on") {
      // motor encendido pero sin velocidad → relentí
      stopSeconds += deltaSeconds;
    }
    // engine_state === "unknown" → no se suma a ninguna categoría
  }

  return {
    movementCount,
    distanceKm: Number(distanceKm.toFixed(2)),
    movingSeconds,
    stopSeconds,
    offSeconds,
  };
};