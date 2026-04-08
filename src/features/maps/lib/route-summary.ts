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
 * - OFF => tiempo apagado
 * - ON + velocidad >= 1 => movimiento
 * - ON + velocidad < 1 => stop
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

  const STATUS_OFF = "000000000";
  const STATUS_ON = "100000000";

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
    const previousStatus = (previous.status || "").trim();

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

    if (previousStatus === STATUS_OFF) {
      offSeconds += deltaSeconds;
      continue;
    }

    if (previousStatus === STATUS_ON && previousSpeed >= 1) {
      movingSeconds += deltaSeconds;
      movementCount += 1;
      continue;
    }

    stopSeconds += deltaSeconds;
  }

  return {
    movementCount,
    distanceKm: Number(distanceKm.toFixed(2)),
    movingSeconds,
    stopSeconds,
    offSeconds,
  };
};