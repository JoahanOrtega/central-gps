import type { EngineState } from "../types/map.types";

export type { EngineState };

export type TelemetryMapState =
  | "movimiento"
  | "detenido"
  | "apagado"
  | "sin-reporte"
  | "sin-telemetria";

// Umbral para considerar una unidad como "sin reporte prolongado"
export const SIN_REPORTE_PROLONGADO_SEGS = 4 * 60 * 60;

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
  segundosSinReporte?: number | null,
  _segundosSistema?: number | null,
  _velMax?: number | null,
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

  const strokeColor = UNIT_COLORS.BLANCO;

  // Si la unidad lleva más de 4 horas sin reportar, se considera "sin reporte prolongado"
  if ((segundosSinReporte ?? 0) > SIN_REPORTE_PROLONGADO_SEGS) {
    return {
      fillColor: UNIT_COLORS.ROJO,
      strokeColor,
      mapState: "sin-reporte",
      label: "Sin reportar (+4 h)",
      shortLabel: "S/R",
      engineState: effectiveEngineState,
    };
  }

  const fillColor =
    effectiveEngineState === "off" ? UNIT_COLORS.GRIS_OSCURO : UNIT_COLORS.VERDE;

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