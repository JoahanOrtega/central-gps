/**
 * Catálogo de códigos conocidos que llegan desde telemetría.
 * Se centralizan aquí para evitar strings mágicos en los componentes.
 */
export const TELEMETRY_STATUS = {
  OFF: "000000000",
  ON: "100000000",
} as const;

/**
 * Estado lógico que usa la UI para pintar colores y comportamientos.
 */
export type TelemetryMapState =
  | "apagado"
  | "detenido"
  | "movimiento"
  | "sin-telemetria";

/**
 * Metadatos completos del estado.
 */
export type TelemetryStatusMeta = {
  code: string;
  label: string;
  shortLabel: string;
  color: string;
  mapState: TelemetryMapState;
};

const DEFAULT_STATUS_META: TelemetryStatusMeta = {
  code: "",
  label: "Sin telemetría",
  shortLabel: "N/A",
  color: "#94a3b8",
  mapState: "sin-telemetria",
};

/**
 * Traduce el código crudo y la velocidad en un estado amigable para UI.
 *
 * Reglas actuales:
 * - OFF => Apagada
 * - ON + speed >= 1 => En movimiento
 * - ON + speed < 1 => Encendida / detenida
 */
export const getTelemetryStatusMeta = (
  status?: string | null,
  speed?: number | null,
): TelemetryStatusMeta => {
  const code = (status || "").trim();
  const safeSpeed = speed ?? 0;

  if (!code) {
    return DEFAULT_STATUS_META;
  }

  if (code === TELEMETRY_STATUS.OFF) {
    return {
      code,
      label: "Apagada",
      shortLabel: "OFF",
      color: "#ef4444",
      mapState: "apagado",
    };
  }

  if (code === TELEMETRY_STATUS.ON) {
    if (safeSpeed >= 1) {
      return {
        code,
        label: "En movimiento",
        shortLabel: "MOV",
        color: "#22c55e",
        mapState: "movimiento",
      };
    }

    return {
      code,
      label: "Encendida",
      shortLabel: "ON",
      color: "#f59e0b",
      mapState: "detenido",
    };
  }

  return {
    code,
    label: `Estado ${code}`,
    shortLabel: code,
    color: "#64748b",
    mapState: "sin-telemetria",
  };
};

/** Devuelve la etiqueta visible del estado. */
export const getTelemetryStatusLabel = (
  status?: string | null,
  speed?: number | null,
) => getTelemetryStatusMeta(status, speed).label;

/** Devuelve la abreviatura visual del estado. */
export const getTelemetryStatusShortLabel = (
  status?: string | null,
  speed?: number | null,
) => getTelemetryStatusMeta(status, speed).shortLabel;

/** Devuelve el color asociado al estado. */
export const getTelemetryStatusColor = (
  status?: string | null,
  speed?: number | null,
) => getTelemetryStatusMeta(status, speed).color;

/** Devuelve el estado lógico que usa el mapa. */
export const getTelemetryMapState = (
  status?: string | null,
  speed?: number | null,
) => getTelemetryStatusMeta(status, speed).mapState;

export const isTelemetryOff = (status?: string | null) =>
  (status || "").trim() === TELEMETRY_STATUS.OFF;

export const isTelemetryOn = (status?: string | null) =>
  (status || "").trim() === TELEMETRY_STATUS.ON;