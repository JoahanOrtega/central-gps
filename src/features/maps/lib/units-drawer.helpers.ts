import type { MapUnitItem } from "../types/map.types";
import { getTelemetryMapState } from "./telemetry-status";

/**
 * Devuelve la clase Tailwind del punto de color según el estado lógico
 * de la unidad.
 */
export const getUnitStatusDotClass = (unit: MapUnitItem) => {
  const mapState = getTelemetryMapState(
    unit.telemetry?.engine_state,
    unit.telemetry?.velocidad,
  );

  if (mapState === "apagado") return "bg-rose-400";
  if (mapState === "movimiento") return "bg-emerald-500";
  if (mapState === "detenido") return "bg-amber-400";

  return "bg-slate-400";
};