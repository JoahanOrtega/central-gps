import type { EngineState } from "../types/map.types";

export type { EngineState };

export type TelemetryMapState =
  | "movimiento"
  | "detenido"
  | "apagado"
  | "apagado-prolongado"
  | "sin-telemetria";

// Una unidad puede estar apagada por pernocta normal; más de 4h sin encender
// suele indicar un problema (vehículo en taller, batería desconectada), así que
// a partir de aquí el marcador se pinta en rojo. Subir el umbral si la flota
// tiene jornadas más largas.
export const APAGADO_PROLONGADO_SEGS = 4 * 60 * 60;

export const UNIT_COLORS = {
  VERDE: "#26C281",
  AMBAR: "#F1C40F",
  ROJO: "#ed6b75",
  GRIS: "#94a3b8",
  GRIS_OSCURO: "#262626",
  BLANCO: "#FFFFFF",
} as const;

export interface TelemetryStatusMeta {
  fillColor: string;
  strokeColor: string;
  mapState: TelemetryMapState;
  label: string;
  shortLabel: string;
  engineState: EngineState;
}

export const getTelemetryStatusMeta = (
  engineState: EngineState | null | undefined,
  velocidad?: number | null,
  _segundos?: number | null,
  _segundosSistema?: number | null,
  _velMax?: number | null,
  segundosEnEstado?: number | null,
): TelemetryStatusMeta => {
  const effectiveEngineState: EngineState = engineState ?? "unknown";
  const speed = velocidad ?? 0;

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

  const fillColor =
    effectiveEngineState === "off" ? UNIT_COLORS.GRIS_OSCURO : UNIT_COLORS.VERDE;
  const strokeColor = UNIT_COLORS.BLANCO;

  if (effectiveEngineState === "off") {
    const offSecs = segundosEnEstado ?? 0;
    if (offSecs > APAGADO_PROLONGADO_SEGS) {
      return {
        fillColor: UNIT_COLORS.ROJO,
        strokeColor,
        mapState: "apagado-prolongado",
        label: "Apagada (prolongado)",
        shortLabel: "OFF!",
        engineState: "off",
      };
    }

    return {
      fillColor,
      strokeColor,
      mapState: "apagado",
      label: "Apagada",
      shortLabel: "OFF",
      engineState: "off",
    };
  }

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

export const getTelemetryStatusColor = (
  engineState: EngineState | null | undefined,
  velocidad?: number | null,
  segundos?: number | null,
  segundosSistema?: number | null,
  velMax?: number | null,
): string =>
  getTelemetryStatusMeta(engineState, velocidad, segundos, segundosSistema, velMax)
    .fillColor;

export const getTelemetryStatusLabel = (
  engineState: EngineState | null | undefined,
  velocidad?: number | null,
): string => getTelemetryStatusMeta(engineState, velocidad).label;

export const getTelemetryStatusShortLabel = (
  engineState: EngineState | null | undefined,
  velocidad?: number | null,
): string => getTelemetryStatusMeta(engineState, velocidad).shortLabel;

export const getTelemetryMapState = (
  engineState: EngineState | null | undefined,
  velocidad?: number | null,
): TelemetryMapState => getTelemetryStatusMeta(engineState, velocidad).mapState;

export const isEngineOff = (
  engineState: EngineState | null | undefined,
): boolean => engineState === "off";

export const isEngineOn = (
  engineState: EngineState | null | undefined,
): boolean => engineState === "on";

// Verde normal, amarillo dentro de 5 km/h del límite, rojo en exceso
export const getSpeedTextColor = (velocidad: number, velMax: number): string => {
  if (velMax <= 0) return "#26C281";
  if (Math.round(velocidad) >= velMax) return "#ed6b75";
  if (Math.round(velocidad) >= velMax - 5) return "#F1C40F";
  return "#26C281";
};