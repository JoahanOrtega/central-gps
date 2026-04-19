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

/**
 * InfoWindow de un marcador de dirección dentro de un recorrido.
 *
 * Miller's Law → máximo 3 datos: velocidad (lo más importante),
 * distancia acumulada y hora. Sin ruido de estado interno o índice.
 * Aesthetic-Usability → velocidad grande con color semántico.
 * Proximity → hora subordinada visualmente debajo de la velocidad.
 */
export const buildRouteArrowInfoWindowContent = (
  unitLabel: string | null,
  data: RouteArrowMarkerData,
): string => {
  const speed = data.point.velocidad ?? 0;
  // Verde normal · amarillo cerca del límite · rojo exceso (mismo criterio del polyline)
  const speedColor = speed >= 80 ? "#dc2626" : speed >= 60 ? "#d97706" : "#16a34a";
  // Hora limpia en UTC-6: tomar los primeros 16 chars del ISO con offset
  const horaStr = data.point.fecha_hora_gps
    ? data.point.fecha_hora_gps.replace("T", " ").slice(0, 16)
    : "";

  return `
    <div style="font-family:sans-serif; padding:6px 10px; min-width:130px; max-width:180px;">
      <div style="font-size:18px; font-weight:700; color:${speedColor}; line-height:1;">
        ${Math.round(speed)} <span style="font-size:11px; font-weight:400; color:#94a3b8;">km/h</span>
      </div>
      <div style="margin-top:4px; font-size:11px; color:#64748b;">
        📍 ${data.distanceFromStartKm.toFixed(1)} km desde inicio
      </div>
      <div style="margin-top:2px; font-size:11px; color:#94a3b8;">
        🕐 ${escapeHtml(horaStr)}
      </div>
    </div>
  `;
};
// ── Builders de InfoWindow para eventos del recorrido ─────────────────────────
// Compatibles con el useMapRoute. Todos reciben strings ya formateados.

export const buildStartFlagContent = (
  fechaHora: string,
  tiempoApagado?: string,
  fechaApagado?: string,
): string => `
    <div style="min-width:210px; padding:4px 2px; font-family:sans-serif;">
        <div style="font-weight:600; color:#16a34a; margin-bottom:4px; font-size:13px;">
            ▶ Inicio del recorrido
        </div>
        <div style="font-size:12px; color:#475569;">${escapeHtml(fechaHora)}</div>
        ${tiempoApagado ? `
            <div style="font-size:11px; color:#94a3b8; margin-top:4px;">
                Permaneció aquí ${escapeHtml(tiempoApagado)}
                ${fechaApagado ? `desde ${escapeHtml(fechaApagado)}` : ""}
            </div>
        ` : ""}
    </div>
`;

export const buildEndFlagContent = (
  distanciaKm: number,
  duracionTotal: string,
): string => `
    <div style="min-width:210px; padding:4px 2px; font-family:sans-serif;">
        <div style="font-weight:600; color:#374151; margin-bottom:4px; font-size:13px;">
            ■ Fin del recorrido
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#475569; margin-bottom:3px;">
            <span>📍 Distancia</span>
            <span style="font-weight:600;">${distanciaKm.toFixed(2)} km</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#475569;">
            <span>⏱ Duración</span>
            <span style="font-weight:600;">${escapeHtml(duracionTotal)}</span>
        </div>
    </div>
`;

export const buildStopEventContent = (
  tiempoEvento: string,
  periodo: string,
): string => `
    <div style="min-width:210px; padding:4px 2px; font-family:sans-serif;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:600; color:#6366f1; font-size:13px;">⏹ Detenida</span>
            <span style="font-weight:600; font-size:12px; color:#1e293b;">${escapeHtml(tiempoEvento)}</span>
        </div>
        <div style="font-size:11px; color:#94a3b8; margin-top:3px;">${escapeHtml(periodo)}</div>
    </div>
`;

export const buildEngineEventContent = (
  tiempoEvento: string,
  periodo: string,
): string => `
    <div style="min-width:210px; padding:4px 2px; font-family:sans-serif;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:600; color:#6b7280; font-size:13px;">⚙ Motor apagado</span>
            <span style="font-weight:600; font-size:12px; color:#1e293b;">${escapeHtml(tiempoEvento)}</span>
        </div>
        <div style="font-size:11px; color:#94a3b8; margin-top:3px;">${escapeHtml(periodo)}</div>
    </div>
`;

export const buildDoorEventContent = (
  tiempoEvento: string,
  periodo: string,
): string => `
    <div style="min-width:210px; padding:4px 2px; font-family:sans-serif;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:600; color:#f59e0b; font-size:13px;">🚪 Puerta abierta</span>
            <span style="font-weight:600; font-size:12px; color:#1e293b;">${escapeHtml(tiempoEvento)}</span>
        </div>
        <div style="font-size:11px; color:#94a3b8; margin-top:3px;">${escapeHtml(periodo)}</div>
    </div>
`;

export const buildSpeedEventContent = (
  velocidadMaxima: number,
  velMax: number,
  distanciaKm: number,
  tiempoEvento: string,
  periodo: string,
): string => `
    <div style="min-width:210px; padding:4px 2px; font-family:sans-serif;">
        <div style="font-weight:600; color:#dc2626; margin-bottom:4px; font-size:13px;">⚡ Exceso de velocidad</div>
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#475569; margin-bottom:2px;">
            <span>Alcanzado</span>
            <span style="font-weight:700; color:#dc2626;">${velocidadMaxima} km/h</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#475569; margin-bottom:2px;">
            <span>Límite</span>
            <span style="font-weight:600;">${velMax} km/h</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#475569; margin-bottom:2px;">
            <span>Distancia</span>
            <span style="font-weight:600;">${distanciaKm.toFixed(2)} km</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#475569;">
            <span>Duración</span>
            <span style="font-weight:600;">${escapeHtml(tiempoEvento)}</span>
        </div>
        <div style="font-size:11px; color:#94a3b8; margin-top:3px;">${escapeHtml(periodo)}</div>
    </div>
`;

export const buildRfidEventContent = (
  lecturas: Array<{ rfid: string; fecha_hora: string }>,
): string => {
  const rows = lecturas
    .map((l) => `
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:2px;">
                <span style="font-weight:600; color:#2563eb;">${escapeHtml(l.rfid)}</span>
                <span style="font-size:11px; color:#94a3b8;">${escapeHtml(l.fecha_hora)}</span>
            </div>`)
    .join("");
  return `
        <div style="min-width:210px; padding:4px 2px; font-family:sans-serif;">
            <div style="font-weight:600; color:#2563eb; margin-bottom:4px; font-size:13px;">
                📡 ${lecturas.length} Lectura${lecturas.length !== 1 ? "s" : ""} RFID
            </div>
            ${rows}
        </div>
    `;
};

export const buildAlertEventContent = (
  alertas: Array<{ fecha_hora_gps: string; velocidad: number; lat: number; lng: number }>,
): string => {
  const rows = alertas
    .map((a) => `
            <div style="margin-bottom:5px; padding-bottom:5px; border-bottom:1px solid #fee2e2;">
                <div style="font-size:12px; font-weight:600; color:#dc2626;">${escapeHtml(a.fecha_hora_gps)}</div>
                <div style="font-size:11px; color:#6b7280;">${Math.floor(a.velocidad)} km/h · ${a.lat.toFixed(5)}, ${a.lng.toFixed(5)}</div>
            </div>`)
    .join("");
  return `
        <div style="min-width:210px; padding:4px 2px; font-family:sans-serif;">
            <div style="font-weight:600; color:#dc2626; margin-bottom:5px; font-size:13px;">🚨 Botón de pánico</div>
            ${rows}
        </div>
    `;
};