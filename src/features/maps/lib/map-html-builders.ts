import type { MapPoiItem, MapUnitItem, RoutePoint } from "../types/map.types";
import {
    getTelemetryStatusLabel,
} from "./telemetry-status";

// ── Seguridad XSS ─────────────────────────────────────────────
// Escapa caracteres especiales HTML antes de insertar texto
// dinámico en el contenido de un InfoWindow de Google Maps.
// Nunca insertar datos del usuario sin pasar por esta función.
export const escapeHtml = (value: string): string =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

// ── Builders de contenido HTML para InfoWindows ───────────────
// Cada función devuelve un string HTML seguro listo para usar
// en infoWindow.setContent(). Todos los valores dinámicos
// pasan por escapeHtml() antes de ser insertados.

/** InfoWindow de un Punto de Interés */
export const buildPoiInfoWindowContent = (poi: MapPoiItem): string => `
  <div style="min-width:220px; padding:4px 2px;">
    <div style="font-weight:600; font-size:14px; color:#334155;">
      ${escapeHtml(poi.nombre || "Sin nombre")}
    </div>
    <div style="margin-top:6px; font-size:12px; color:#64748b; line-height:1.4;">
      ${escapeHtml(poi.direccion || "Sin dirección")}
    </div>
  </div>
`;

/** InfoWindow de una unidad en el mapa de monitoreo */
export const buildUnitInfoWindowContent = (unit: MapUnitItem): string => {
    const telemetry = unit.telemetry;
    const statusLabel = getTelemetryStatusLabel(
        telemetry?.status,
        telemetry?.velocidad,
    );

    return `
    <div style="min-width:220px; padding:4px 2px;">
      <div style="font-weight:600; font-size:14px; color:#334155;">
        ${escapeHtml(unit.numero || "Sin nombre")}
      </div>
      <div style="margin-top:6px; font-size:12px; color:#64748b; line-height:1.4;">
        Estado: ${escapeHtml(statusLabel)}
      </div>
      <div style="font-size:12px; color:#64748b; line-height:1.4;">
        Velocidad: ${telemetry?.velocidad ?? 0} km/h
      </div>
      <div style="font-size:12px; color:#64748b; line-height:1.4;">
        Fecha: ${escapeHtml(telemetry?.fecha_hora_gps || "Sin fecha")}
      </div>
    </div>
  `;
};

// ── Datos de un marcador de dirección de recorrido ────────────
export interface RouteArrowMarkerData {
    point: RoutePoint;
    index: number;
    heading: number;
    distanceFromStartKm: number;
}

/** InfoWindow de un marcador de dirección dentro de un recorrido */
export const buildRouteArrowInfoWindowContent = (
    unitLabel: string | null,
    data: RouteArrowMarkerData,
): string => {
    const speed = data.point.velocidad ?? 0;
    const status = data.point.status || "Sin estado";
    const movementState = data.point.movement_state || "Sin clasificación";

    return `
    <div style="min-width:220px; padding:4px 2px;">
      <div style="font-weight:600; font-size:14px; color:#334155;">
        ${escapeHtml(unitLabel || "Unidad")}
      </div>
      <div style="margin-top:6px; font-size:12px; color:#16a34a; font-weight:600;">
        Registro del recorrido
      </div>
      <div style="margin-top:4px; font-size:12px; color:#475569; line-height:1.45;">
        Punto #${data.index + 1}
      </div>
      <div style="font-size:12px; color:#475569; line-height:1.45;">
        Velocidad: ${speed} km/h
      </div>
      <div style="font-size:12px; color:#475569; line-height:1.45;">
        Estado: ${escapeHtml(status)}
      </div>
      <div style="font-size:12px; color:#475569; line-height:1.45;">
        Tipo: ${escapeHtml(movementState)}
      </div>
      <div style="font-size:12px; color:#475569; line-height:1.45;">
        Distancia desde el inicio: ${data.distanceFromStartKm.toFixed(2)} km
      </div>
      <div style="font-size:12px; color:#475569; line-height:1.45;">
        ${escapeHtml(data.point.fecha_hora_gps)}
      </div>
    </div>
  `;
};