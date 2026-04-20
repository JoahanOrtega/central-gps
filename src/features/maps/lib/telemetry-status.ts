// ── Lógica de estado de telemetría (frontend) ────────────────────────────────
//
// A partir de la refactorización, el BACKEND es la única fuente de verdad
// para determinar si el motor está encendido, apagado o desconocido
// (campo `engine_state` en la respuesta de telemetría).
//
// Este archivo se encarga SOLO de:
//   - Derivar presentación visual (color, label, strokeColor) a partir de
//     `engine_state` + tiempo desde el último reporte.
//   - Clasificar movimiento semántico (movimiento/detenido/apagado/sin-datos)
//     a partir de `engine_state` + velocidad.
//
// NO reinterpreta bits crudos del campo `status`. Si encuentras código que
// lo haga (ej: `status.charAt(0) === "1"`), debe migrarse a usar el nuevo
// campo `engine_state`.

import type { EngineState } from "../types/map.types";

// ── Re-export para consumidores que necesiten el tipo ────────────────────────
export type { EngineState };

// ── Estado lógico para la UI ──────────────────────────────────────────────────
export type TelemetryMapState =
  | "movimiento"       // motor ON + velocidad >= 1 km/h
  | "detenido"         // motor ON + velocidad < 1 km/h (relentí)
  | "apagado"          // motor OFF
  | "sin-telemetria";  // sin datos o engine_state === "unknown"

// ── Color por tiempo de transmisión (lógica del PHP legacy) ──────────────────
//
// La lógica del draw.js original distingue DOS umbrales distintos según el
// estado de ignición, porque un vehículo apagado transmite con menor frecuencia:
//
//   Encendida:  verde ≤ 4 min | amarillo 4-5 min | rojo > 5 min
//   Apagada:    verde ≤ 35 min | amarillo 35-36 min | rojo > 36 min
//
// Estas constantes son los límites en SEGUNDOS:
const IGNICION_ON_VERDE = 240;    // 4 min
const IGNICION_ON_AMBAR = 300;    // 5 min
const IGNICION_OFF_VERDE = 2100;  // 35 min
const IGNICION_OFF_AMBAR = 2160;  // 36 min

// ── Colores del sistema ───────────────────────────────────────────────────────
export const UNIT_COLORS = {
  VERDE: "#26C281",   // transmisión reciente
  AMBAR: "#F1C40F",   // transmisión con leve retraso
  ROJO: "#ed6b75",    // sin transmisión / offline
  GRIS: "#94a3b8",    // sin telemetría
  BLANCO: "#FFFFFF",
} as const;

// ── Color del borde (stroke) del marcador ─────────────────────────────────────
// El stroke blanco es el default. Si el marcador es rojo pero la transmisión
// del sistema es reciente (<5 min), el stroke se pinta verde para indicar
// que el dispositivo sigue online aunque los datos GPS sean viejos.
export const getUnitStrokeColor = (
  fillColor: string,
  segundosSistema?: number | null,
  velocidad?: number | null,
  velMax?: number | null,
): string => {
  // Exceso de velocidad → stroke rojo intenso
  const speed = velocidad ?? 0;
  const limit = velMax ?? 0;
  if (limit > 0 && Math.round(speed) >= limit) return "#ED6B75";

  // Marcador offline con sistema reciente → stroke verde como indicador
  if (fillColor === UNIT_COLORS.ROJO && (segundosSistema ?? 999) <= 300) {
    return UNIT_COLORS.VERDE;
  }

  return UNIT_COLORS.BLANCO;
};

// ── Metadata completa del estado ─────────────────────────────────────────────
export interface TelemetryStatusMeta {
  // Color de relleno del marcador según tiempo de transmisión
  fillColor: string;
  // Color del stroke (borde) del marcador
  strokeColor: string;
  // Estado lógico para la UI
  mapState: TelemetryMapState;
  // Etiqueta legible para el usuario
  label: string;
  // Abreviatura para espacios compactos
  shortLabel: string;
  // Estado del motor tal como viene del backend
  engineState: EngineState;
}

/**
 * Calcula el color del marcador según la lógica del PHP legacy (draw.js _setColor).
 *
 * Reglas (idénticas al original PHP):
 *   Encendida: verde ≤ 4 min | amarillo 4-5 min | rojo > 5 min
 *   Apagada:   verde ≤ 35 min | amarillo 35-36 min | rojo > 36 min
 *
 * Cuando el estado es "unknown", se usa el esquema de "apagada" (umbrales
 * amplios) como aproximación razonable para unidades que transmiten poco.
 */
const getTimingColor = (engineState: EngineState, segundos: number): string => {
  if (engineState === "on") {
    if (segundos <= IGNICION_ON_VERDE) return UNIT_COLORS.VERDE;
    if (segundos <= IGNICION_ON_AMBAR) return UNIT_COLORS.AMBAR;
    return UNIT_COLORS.ROJO;
  }
  // "off" o "unknown" — umbrales amplios (transmite menos frecuente)
  if (segundos <= IGNICION_OFF_VERDE) return UNIT_COLORS.VERDE;
  if (segundos <= IGNICION_OFF_AMBAR) return UNIT_COLORS.AMBAR;
  return UNIT_COLORS.ROJO;
};

/**
 * Construye los metadatos completos del estado de una unidad.
 *
 * Recibe el `engineState` ya resuelto por el backend (no reinterpreta bits).
 *
 * @param engineState     - Estado del motor ("on" | "off" | "unknown").
 * @param velocidad       - Velocidad en km/h.
 * @param segundos        - Segundos desde el último dato GPS hasta ahora.
 * @param segundosSistema - Segundos desde el último dato del sistema (para stroke).
 * @param velMax          - Velocidad máxima configurada en la unidad.
 */
export const getTelemetryStatusMeta = (
  engineState: EngineState | null | undefined,
  velocidad?: number | null,
  segundos?: number | null,
  segundosSistema?: number | null,
  velMax?: number | null,
): TelemetryStatusMeta => {
  const effectiveEngineState: EngineState = engineState ?? "unknown";
  const speed = velocidad ?? 0;
  const secs = segundos ?? 9999;

  // Sin datos → marcador gris neutro
  if (effectiveEngineState === "unknown") {
    return {
      fillColor: UNIT_COLORS.GRIS,
      strokeColor: UNIT_COLORS.BLANCO,
      mapState: "sin-telemetria",
      label: "Sin telemetría",
      shortLabel: "N/A",
      engineState: "unknown",
    };
  }

  const fillColor = getTimingColor(effectiveEngineState, secs);
  const strokeColor = getUnitStrokeColor(
    fillColor,
    segundosSistema,
    speed,
    velMax,
  );

  if (effectiveEngineState === "off") {
    return {
      fillColor,
      strokeColor,
      mapState: "apagado",
      label: "Apagada",
      shortLabel: "OFF",
      engineState: "off",
    };
  }

  // engineState === "on"
  if (speed >= 1) {
    return {
      fillColor,
      strokeColor,
      mapState: "movimiento",
      label: "En movimiento",
      shortLabel: "MOV",
      engineState: "on",
    };
  }

  return {
    fillColor,
    strokeColor,
    mapState: "detenido",
    label: "En relentí",
    shortLabel: "ON",
    engineState: "on",
  };
};

// ── Helpers de acceso rápido ──────────────────────────────────────────────────

/** Color de relleno del marcador. */
export const getTelemetryStatusColor = (
  engineState: EngineState | null | undefined,
  velocidad?: number | null,
  segundos?: number | null,
  segundosSistema?: number | null,
  velMax?: number | null,
): string =>
  getTelemetryStatusMeta(engineState, velocidad, segundos, segundosSistema, velMax)
    .fillColor;

/** Etiqueta legible del estado. */
export const getTelemetryStatusLabel = (
  engineState: EngineState | null | undefined,
  velocidad?: number | null,
): string => getTelemetryStatusMeta(engineState, velocidad).label;

/** Abreviatura del estado. */
export const getTelemetryStatusShortLabel = (
  engineState: EngineState | null | undefined,
  velocidad?: number | null,
): string => getTelemetryStatusMeta(engineState, velocidad).shortLabel;

/** Estado lógico para el mapa. */
export const getTelemetryMapState = (
  engineState: EngineState | null | undefined,
  velocidad?: number | null,
): TelemetryMapState => getTelemetryStatusMeta(engineState, velocidad).mapState;

/** true si la ignición está apagada. */
export const isEngineOff = (
  engineState: EngineState | null | undefined,
): boolean => engineState === "off";

/** true si la ignición está encendida. */
export const isEngineOn = (
  engineState: EngineState | null | undefined,
): boolean => engineState === "on";

// ── Color de velocidad en textos ──────────────────────────────────────────────
// Replicado del PHP: verde normal, amarillo cerca del límite, rojo exceso.
export const getSpeedTextColor = (velocidad: number, velMax: number): string => {
  if (velMax <= 0) return "#26C281";
  if (Math.round(velocidad) >= velMax) return "#ed6b75";           // exceso
  if (Math.round(velocidad) >= (velMax - 5)) return "#F1C40F";     // cerca
  return "#26C281";                                                 // normal
};