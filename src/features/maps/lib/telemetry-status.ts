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

// ── Constantes legacy eliminadas ──────────────────────────────────────────────
//
// Hasta el refactor v2, estos umbrales definían los COLORES DE RELLENO del
// marcador por antigüedad de transmisión:
//   IGNICION_ON_VERDE/AMBAR  = 240s / 300s  (4 min / 5 min)
//   IGNICION_OFF_VERDE/AMBAR = 2100s / 2160s (35 min / 36 min)
//
// Ahora el fill depende SOLO del engineState (off=gris, on=verde) y la
// antigüedad se expresa en el STROKE con los umbrales de STROKE_VERDE/AMBAR
// (ver getUnitStrokeColor). Ya no se necesitan los umbrales amplios del
// motor apagado — la "salud del dispositivo" es la misma regla para todos.

// ── Colores del sistema ───────────────────────────────────────────────────────
//
// Esquema actual (refactor marcadores v2):
//   - FILL (color del interior del marcador) = estado del motor
//       off       → GRIS_OSCURO (neutral-800)
//       on        → VERDE
//       unknown   → GRIS (slate-400, más claro que off para que se distinga
//                   visualmente de "motor apagado confirmado")
//   - STROKE (borde del marcador) = antigüedad de transmisión
//       reciente  → VERDE (dispositivo transmitiendo OK)
//       leve      → AMBAR (algo retrasado)
//       offline   → ROJO (sin datos del sistema hace rato)
//
// Ventaja del esquema: el usuario ve en un solo vistazo dos ejes de
// información. El color del centro le dice "está apagada o encendida".
// El color del borde le dice "está el dispositivo vivo o no".
export const UNIT_COLORS = {
  VERDE: "#26C281",         // motor encendido o transmisión reciente
  AMBAR: "#F1C40F",         // transmisión con leve retraso
  ROJO: "#ed6b75",          // sin transmisión / offline / exceso velocidad
  GRIS: "#94a3b8",          // sin telemetría (slate-400, estado ambiguo)
  GRIS_OSCURO: "#262626",   // motor apagado confirmado (neutral-800)
  BLANCO: "#FFFFFF",
} as const;

// ── Color del borde (stroke) del marcador ─────────────────────────────────────
//
// Refleja la ANTIGÜEDAD de transmisión del sistema (cuándo fue el último
// reporte vivo del equipo, independiente de si el motor está encendido):
//   ≤ 5 min     → VERDE    (online saludable)
//   5–6 min     → AMBAR    (atraso leve)
//   > 6 min     → ROJO     (offline)
//
// Se preserva la lógica especial de exceso de velocidad: si el vehículo va
// por encima de vel_max, el stroke se pinta ROJO aunque la transmisión sea
// reciente — la alerta de velocidad tiene prioridad visual.
//
// NOTA: los umbrales de antigüedad acá son SIEMPRE los del motor encendido
// (4-5 min). Ya no se usa el umbral amplio del motor apagado (35 min)
// porque el dato de "antigüedad" ahora vive en el stroke y debe reflejar
// la vida del DISPOSITIVO, no la del movimiento. Si una unidad apagada
// deja de transmitir >5 min, algo pasa con el equipo (batería, red) y
// merece la alerta visual.
const STROKE_VERDE_MAX_SEGS = 300;   // 5 min
const STROKE_AMBAR_MAX_SEGS = 360;   // 6 min

export const getUnitStrokeColor = (
  _fillColor: string,  // legacy: se mantiene en la firma por compatibilidad
  segundosSistema?: number | null,
  velocidad?: number | null,
  velMax?: number | null,
): string => {
  // Regla 1: exceso de velocidad gana siempre (alerta prioritaria).
  const speed = velocidad ?? 0;
  const limit = velMax ?? 0;
  if (limit > 0 && Math.round(speed) >= limit) return UNIT_COLORS.ROJO;

  // Regla 2: stroke por antigüedad del sistema.
  // Si no hay dato de segundosSistema, asumir offline (rojo) — mejor
  // "ver una alerta de más" que ocultar un problema real.
  const secs = segundosSistema ?? Number.POSITIVE_INFINITY;
  if (secs <= STROKE_VERDE_MAX_SEGS) return UNIT_COLORS.VERDE;
  if (secs <= STROKE_AMBAR_MAX_SEGS) return UNIT_COLORS.AMBAR;
  return UNIT_COLORS.ROJO;
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
 * Construye los metadatos completos del estado de una unidad.
 *
 * Recibe el `engineState` ya resuelto por el backend (no reinterpreta bits).
 *
 * Esquema de color actual (refactor v2):
 *   - fillColor   = estado del motor
 *       off       → GRIS_OSCURO (neutral-800)
 *       on        → VERDE
 *       unknown   → GRIS neutro (estado ambiguo)
 *   - strokeColor = antigüedad de transmisión
 *       via getUnitStrokeColor() que aplica umbrales sobre segundosSistema
 *
 * Razón del cambio respecto a la versión anterior:
 *   Antes el fillColor se degradaba por antigüedad (verde → ámbar → rojo)
 *   mezclando dos conceptos en una sola variable. Ahora los dos ejes son
 *   independientes y más legibles: el CENTRO dice "motor" y el BORDE dice
 *   "salud del dispositivo".
 *
 * @param engineState     - Estado del motor ("on" | "off" | "unknown").
 * @param velocidad       - Velocidad en km/h.
 * @param _segundos       - Segundos desde último dato GPS. YA NO SE USA para
 *                          el fillColor. Se mantiene en la firma por
 *                          compatibilidad con consumidores del hook.
 * @param segundosSistema - Segundos desde el último dato del sistema (para stroke).
 * @param velMax          - Velocidad máxima configurada en la unidad.
 */
export const getTelemetryStatusMeta = (
  engineState: EngineState | null | undefined,
  velocidad?: number | null,
  _segundos?: number | null,
  segundosSistema?: number | null,
  velMax?: number | null,
): TelemetryStatusMeta => {
  const effectiveEngineState: EngineState = engineState ?? "unknown";
  const speed = velocidad ?? 0;

  // Caso 1: sin datos — marcador gris neutro, sin medir antigüedad
  // porque no tenemos contexto suficiente para evaluar salud del equipo.
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

  // Fill = estado del motor (solo depende de engineState)
  const fillColor =
    effectiveEngineState === "off" ? UNIT_COLORS.GRIS_OSCURO : UNIT_COLORS.VERDE;

  // Stroke = antigüedad de transmisión (+exceso de velocidad tiene prioridad)
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