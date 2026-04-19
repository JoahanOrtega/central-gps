// ── Constantes de status crudo ────────────────────────────────────────────────
// El campo `status` de t_data es un string de 9 bits donde:
//   bit 1 (posición 0) = ignición  → '1' encendida, '0' apagada
//   bit 2 (posición 1) = input1
//   bit 3 (posición 2) = input2
//   bit 4 (posición 3) = input3
//   bit 5 (posición 4) = input4
//   bit 6 (posición 5) = output1
//   bit 7 (posición 6) = output2
//   bit 8 (posición 7) = output3
//   bit 9 (posición 8) = output4
export const TELEMETRY_STATUS = {
  OFF: "000000000",
  ON: "100000000",
} as const;

// ── Estado lógico para la UI ──────────────────────────────────────────────────
export type TelemetryMapState =
  | "movimiento"       // ignición ON + velocidad >= 1 km/h
  | "detenido"         // ignición ON + velocidad < 1 km/h (relentí)
  | "apagado"          // ignición OFF
  | "sin-telemetria";  // sin datos

// ── Color por tiempo de transmisión (lógica del PHP legacy) ──────────────────
//
// La lógica del draw.js original distingue DOS umbrales distintos según el
// estado de ignición, porque un vehículo apagado transmite con menor frecuencia:
//
//   Encendida:  verde ≤ 4 min | amarillo 4-5 min | rojo > 5 min
//   Apagada:    verde ≤ 35 min | amarillo 35-36 min | rojo > 36 min
//
// Estas constantes son los límites en SEGUNDOS:
const IGNICION_ON_VERDE = 240;   // 4 min
const IGNICION_ON_AMBAR = 300;   // 5 min
const IGNICION_OFF_VERDE = 2100;  // 35 min
const IGNICION_OFF_AMBAR = 2160;  // 36 min

// ── Colores del sistema ───────────────────────────────────────────────────────
export const UNIT_COLORS = {
  VERDE: "#26C281",  // transmisión reciente
  AMBAR: "#F1C40F",  // transmisión con leve retraso
  ROJO: "#ed6b75",  // sin transmisión / offline
  GRIS: "#94a3b8",  // sin telemetría
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
export type TelemetryStatusMeta = {
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
  // Ignición (1 = encendida, 0 = apagada)
  ignicion: 0 | 1;
};

/**
 * Calcula el color del marcador según la lógica del PHP legacy (draw.js _setColor).
 *
 * La función recibe `segundos` que es el tiempo transcurrido desde el ÚLTIMO
 * dato GPS hasta ahora, y la ignición extraída del campo status.
 *
 * Reglas (idénticas al original PHP):
 *   Encendida: verde ≤ 4 min | amarillo 4-5 min | rojo > 5 min
 *   Apagada:   verde ≤ 35 min | amarillo 35-36 min | rojo > 36 min
 */
const getTimingColor = (ignicion: 0 | 1, segundos: number): string => {
  if (ignicion === 1) {
    if (segundos <= IGNICION_ON_VERDE) return UNIT_COLORS.VERDE;
    if (segundos <= IGNICION_ON_AMBAR) return UNIT_COLORS.AMBAR;
    return UNIT_COLORS.ROJO;
  }
  // Apagada — umbrales más amplios porque transmite menos frecuente
  if (segundos <= IGNICION_OFF_VERDE) return UNIT_COLORS.VERDE;
  if (segundos <= IGNICION_OFF_AMBAR) return UNIT_COLORS.AMBAR;
  return UNIT_COLORS.ROJO;
};

/**
 * Extrae la ignición del campo status (primer bit).
 * Retorna 1 si el primer carácter es '1', 0 en cualquier otro caso.
 */
export const getIgnicion = (status?: string | null): 0 | 1 =>
  (status || "").charAt(0) === "1" ? 1 : 0;

/**
 * Construye los metadatos completos del estado de una unidad.
 *
 * @param status      - Campo status crudo de t_data (9 bits)
 * @param velocidad   - Velocidad en km/h
 * @param segundos    - Segundos desde el último dato GPS hasta ahora
 * @param segundosSistema - Segundos desde el último dato del sistema (para stroke)
 * @param velMax      - Velocidad máxima configurada en la unidad
 */
export const getTelemetryStatusMeta = (
  status?: string | null,
  velocidad?: number | null,
  segundos?: number | null,
  segundosSistema?: number | null,
  velMax?: number | null,
): TelemetryStatusMeta => {
  const code = (status || "").trim();
  const speed = velocidad ?? 0;
  const secs = segundos ?? 9999;
  const ignicion = getIgnicion(code);

  // Sin datos → marcador gris neutro
  if (!code) {
    return {
      fillColor: UNIT_COLORS.GRIS,
      strokeColor: UNIT_COLORS.BLANCO,
      mapState: "sin-telemetria",
      label: "Sin telemetría",
      shortLabel: "N/A",
      ignicion: 0,
    };
  }

  const fillColor = getTimingColor(ignicion, secs);
  const strokeColor = getUnitStrokeColor(fillColor, segundosSistema, speed, velMax);

  if (ignicion === 0) {
    return {
      fillColor,
      strokeColor,
      mapState: "apagado",
      label: "Apagada",
      shortLabel: "OFF",
      ignicion,
    };
  }

  if (speed >= 1) {
    return {
      fillColor,
      strokeColor,
      mapState: "movimiento",
      label: "En movimiento",
      shortLabel: "MOV",
      ignicion,
    };
  }

  return {
    fillColor,
    strokeColor,
    mapState: "detenido",
    label: "En relentí",
    shortLabel: "ON",
    ignicion,
  };
};

// ── Helpers de acceso rápido ──────────────────────────────────────────────────

/** Color de relleno del marcador. */
export const getTelemetryStatusColor = (
  status?: string | null,
  velocidad?: number | null,
  segundos?: number | null,
  segundosSistema?: number | null,
  velMax?: number | null,
) => getTelemetryStatusMeta(status, velocidad, segundos, segundosSistema, velMax).fillColor;

/** Etiqueta legible del estado. */
export const getTelemetryStatusLabel = (
  status?: string | null,
  velocidad?: number | null,
) => getTelemetryStatusMeta(status, velocidad).label;

/** Abreviatura del estado. */
export const getTelemetryStatusShortLabel = (
  status?: string | null,
  velocidad?: number | null,
) => getTelemetryStatusMeta(status, velocidad).shortLabel;

/** Estado lógico para el mapa. */
export const getTelemetryMapState = (
  status?: string | null,
  velocidad?: number | null,
) => getTelemetryStatusMeta(status, velocidad).mapState;

/** true si la ignición está apagada. */
export const isTelemetryOff = (status?: string | null) => getIgnicion(status) === 0;

/** true si la ignición está encendida. */
export const isTelemetryOn = (status?: string | null) => getIgnicion(status) === 1;

// ── Color de velocidad en textos ──────────────────────────────────────────────
// Replicado del PHP: verde normal, amarillo cerca del límite, rojo exceso.
export const getSpeedTextColor = (velocidad: number, velMax: number): string => {
  if (velMax <= 0) return "#26C281";
  if (Math.round(velocidad) >= velMax) return "#ed6b75"; // exceso
  if (Math.round(velocidad) >= (velMax - 5)) return "#F1C40F"; // cerca
  return "#26C281";                                                   // normal
};