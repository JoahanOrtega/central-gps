import type { MapPoiItem, MapUnitItem, RoutePoint } from "../types/map.types";
import {
  getTelemetryStatusLabel,
  getTelemetryStatusMeta,
  UNIT_COLORS,
} from "./telemetry-status";
import {
  formatAppDateTimeShort,
  formatCalendar,
  formatDuration,
  formatDurationHms,
  formatElapsedTimeFromApiDate,
} from "@/lib/date-time";
import { ROUTE_ICON_PALETTE } from "./map-icon-svgs";
import { GEOCODE_PLACEHOLDER } from "./infowindow-geocode";

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

/**
 * InfoWindow de un Punto de Interés.
 *
 * Diseño consistente con el InfoWindow de unidades (Ley de Consistencia):
 * misma tipografía, espaciado y jerarquía para que el usuario reconozca
 * el sistema sin esfuerzo (Reconocimiento > Recuerdo).
 */
export const buildPoiInfoWindowContent = (poi: MapPoiItem): string => `
  <div style="
    min-width:240px;
    max-width:280px;
    padding:4px 2px;
    font-family:'Poppins', system-ui, -apple-system, sans-serif;
  ">
    <!-- Encabezado con ícono de POI -->
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
      <span
        aria-hidden="true"
        style="
          display:inline-block;
          width:10px; height:10px;
          border-radius:999px;
          background:#f97316;
          box-shadow:0 0 0 2px #f9731630;
          flex-shrink:0;
        "
      ></span>
      <span style="
        font-size:15px;
        font-weight:600;
        color:#0f172a;
        line-height:1.2;
        letter-spacing:-0.01em;
      ">${escapeHtml(poi.nombre || "Sin nombre")}</span>
    </div>

    <div style="
      font-size:12px;
      color:#64748b;
      line-height:1.4;
      padding-top:8px;
      border-top:1px solid #f1f5f9;
    ">
      ${escapeHtml(poi.direccion || "Sin dirección")}
    </div>
  </div>
`;

/**
 * InfoWindow de una unidad en el mapa de monitoreo.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Diseño guiado por Laws of UX
 * ─────────────────────────────────────────────────────────────────────────────
 *   - Ley de Jakob: fechas en formato local es-MX + tiempo relativo
 *     "hace 14 min" (convención universalmente conocida). URL de Google Maps
 *     con el formato estándar `?q=lat,lng`.
 *   - Ley de Hick: solo los datos relevantes al estado se muestran — velocidad
 *     y tiempo de viaje se ocultan cuando el motor está apagado.
 *   - Ley de Miller (7±2): máximo 4 grupos de información visibles.
 *   - Ley de Proximidad (Gestalt): cada dato en su propia fila con separadores
 *     sutiles, agrupados en secciones con espaciado uniforme.
 *   - Ley de Similitud (Gestalt): todas las filas usan el patrón
 *     LABEL ↔ VALUE con la misma tipografía.
 *   - Ley de Von Restorff: dot de color destaca el estado del motor y el
 *     texto de estado usa color semántico para un reconocimiento inmediato.
 *   - Ley de Fitts: botón de acción con target cómodo al final del card,
 *     padding generoso.
 *   - Reconocimiento > Recuerdo: dot + etiqueta + color semántico en lugar
 *     de solo texto.
 *   - Estética-Usabilidad: tipografía Poppins, espaciado consistente, bordes
 *     sutiles — percepción de producto pulido.
 *   - Ley de Tesler: complejidad eliminada donde no aporta (sin "0 km/h" en
 *     unidades apagadas, sin iconos decorativos redundantes).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Datos mostrados (todos provistos por el backend, sin cálculos ad-hoc)
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. Encabezado:  dot + número + marca/modelo
 *   2. Estado:      etiqueta con color semántico + `segundos_en_estado_actual`
 *                   formateado como "desde hace Xh Ym" (calculado en backend).
 *   3. Reporte:     tiempo relativo "hace N min" + fecha absoluta compacta
 *   4. Viaje:       duración + distancia del último recorrido (si disponibles)
 *   5. Acción:      link a Google Maps con las coordenadas actuales
 */
export const buildUnitInfoWindowContent = (unit: MapUnitItem): string => {
  const telemetry = unit.telemetry;
  const engineState = telemetry?.engine_state ?? unit.engine_state;
  const velocidad = telemetry?.velocidad ?? 0;

  // Metadata visual del estado (color + etiqueta legible)
  const meta = getTelemetryStatusMeta(
    engineState,
    velocidad,
    telemetry?.segundos,
    telemetry?.segundos_sistema,
    unit.vel_max,
  );
  const statusLabel = getTelemetryStatusLabel(engineState, velocidad);
  const dotColor = meta.fillColor;

  // ── Último reporte: fecha absoluta + tiempo relativo ─────────────────
  const fechaReporte = formatAppDateTimeShort(telemetry?.fecha_hora_gps);
  const tiempoRelativoReporte = formatElapsedTimeFromApiDate(
    telemetry?.fecha_hora_gps,
  );

  // ── Tiempo acumulado en estado actual ────────────────────────────────
  const segundosEnEstado =
    unit.segundos_en_estado_actual ??
    telemetry?.segundos_en_estado_actual ??
    null;

  const tiempoEnEstado =
    typeof segundosEnEstado === "number" && segundosEnEstado > 0
      ? formatDuration(segundosEnEstado)
      : null;

  // ── Último viaje: duración + distancia ───────────────────────────────
  const viajeInicio = unit.fecha_hora_inicio_ultimo_viaje;
  const viajeFin = unit.fecha_hora_fin_ultimo_viaje;
  const odoInicio = unit.odometro_inicio_ultimo_viaje;
  const odoFin = unit.odometro_fin_ultimo_viaje;

  const viajeDuracion = (() => {
    const inicio = viajeInicio ? new Date(viajeInicio).getTime() : null;
    const fin = viajeFin ? new Date(viajeFin).getTime() : null;
    if (!inicio || !fin || fin <= inicio) return null;
    return formatDurationHms(Math.floor((fin - inicio) / 1000));
  })();

  const viajeKm = (() => {
    if (typeof odoInicio !== "number" || typeof odoFin !== "number") return null;
    const km = odoFin - odoInicio;
    if (km <= 0) return null;
    return `${km.toFixed(1)} km`;
  })();

  const mostrarViaje = viajeDuracion !== null || viajeKm !== null;

  // ── Contexto secundario: marca + modelo ──────────────────────────────
  const marcaModelo = [unit.marca, unit.modelo].filter(Boolean).join(" ").trim();

  // ── URL de Google Maps ───────────────────────────────────────────────
  const lat = telemetry?.latitud;
  const lng = telemetry?.longitud;
  const mapsUrl =
    typeof lat === "number" && typeof lng === "number"
      ? `http://maps.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`
      : null;

  // ── Velocidad: solo si el motor está encendido (Ley de Hick) ─────────
  const mostrarVelocidad = engineState === "on";

  // ─────────────────────────────────────────────────────────────────────
  // Plantilla HTML — estilos inline para portabilidad dentro del
  // InfoWindow de Google Maps (no podemos importar CSS desde acá).
  // ─────────────────────────────────────────────────────────────────────

  const rowStyle =
    "display:flex; justify-content:space-between; align-items:flex-start; " +
    "padding:6px 0; border-bottom:1px solid #f1f5f9; gap:12px;";
  const rowStyleLast = rowStyle.replace(
    "border-bottom:1px solid #f1f5f9; ",
    "",
  );
  const labelStyle =
    "font-size:9.5px; color:#64748b; text-transform:uppercase; " +
    "letter-spacing:0.04em; font-weight:600; flex-shrink:0; " +
    "padding-top:1px; line-height:1.2;";
  const valueStyle =
    "font-size:12.5px; color:#0f172a; text-align:right; " +
    "font-variant-numeric:tabular-nums; line-height:1.35; flex:1;";
  const valueSecondary =
    "display:block; font-size:10px; color:#94a3b8; margin-top:1px; " +
    "font-variant-numeric:tabular-nums;";

  // Construcción progresiva de las filas (orden semántico)
  const rowEstado = `
    <div style="${rowStyle}">
      <span style="${labelStyle}">Estado</span>
      <span style="${valueStyle}">
        <span style="font-weight:600; color:${dotColor};">${escapeHtml(statusLabel)}</span>
        ${tiempoEnEstado ? `<span style="${valueSecondary}">desde hace ${escapeHtml(tiempoEnEstado)}</span>` : ""}
      </span>
    </div>`;

  // ── Ubicación con geocoding perezoso ─────────────────────────────────
  // Solo si hay coordenadas. El GEOCODE_PLACEHOLDER lo reemplaza
  // hydrateInfoWindowGeocode() cuando el Geocoder resuelve la dirección
  // (mismo patrón que las cartas de eventos del recorrido).
  const hasUbicacion = typeof lat === "number" && typeof lng === "number";

  const rowReporte = `
    <div style="${hasUbicacion || mostrarVelocidad || mostrarViaje ? rowStyle : rowStyleLast}">
      <span style="${labelStyle}">Reporte</span>
      <span style="${valueStyle}">
        hace ${escapeHtml(tiempoRelativoReporte)}
        <span style="${valueSecondary}">${escapeHtml(fechaReporte)}</span>
      </span>
    </div>`;

  const rowUbicacion = hasUbicacion
    ? `
    <div style="${mostrarVelocidad || mostrarViaje ? rowStyle : rowStyleLast}">
      <span style="${labelStyle}">Ubicación</span>
      <span style="${valueStyle}">${GEOCODE_PLACEHOLDER}</span>
    </div>`
    : "";

  const rowVelocidad = mostrarVelocidad
    ? `
    <div style="${mostrarViaje ? rowStyle : rowStyleLast}">
      <span style="${labelStyle}">Velocidad</span>
      <span style="${valueStyle}"><span style="font-weight:600;">${Math.round(velocidad)} km/h</span></span>
    </div>`
    : "";

  const rowViaje = mostrarViaje
    ? `
    <div style="${rowStyleLast}">
      <span style="${labelStyle}">Últ. viaje</span>
      <span style="${valueStyle}">
        ${viajeKm ? `<span style="font-weight:600;">${escapeHtml(viajeKm)}</span>` : ""}
        ${viajeDuracion ? `<span style="${valueSecondary}">${escapeHtml(viajeDuracion)}</span>` : ""}
      </span>
    </div>`
    : "";

  const botonMaps = mapsUrl
    ? `
    <a
      href="${mapsUrl}"
      target="_blank"
      rel="noopener noreferrer"
      style="
        display:flex; align-items:center; justify-content:center; gap:6px;
        margin-top:10px; padding:10px 12px;
        background:#eff6ff;
        border:1px solid #bfdbfe;
        border-radius:6px;
        font-size:12px; font-weight:500;
        color:#1d4ed8; text-decoration:none;
        transition:background 0.15s ease;
        cursor:pointer;
      "
      onmouseover="this.style.background='#dbeafe'"
      onmouseout="this.style.background='#eff6ff'"
      aria-label="Abrir ubicación en Google Maps"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      Ver en Google Maps
    </a>`
    : "";

  return `
    <div style="
      width:100%;
      min-width:240px;
      max-width:280px;
      box-sizing:border-box;
      padding:4px 8px 4px 8px;
      margin:0;
      font-family:'Poppins', system-ui, -apple-system, sans-serif;
    ">
      <!-- Encabezado: dot de estado + número + marca/modelo en línea -->
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:${marcaModelo ? "2" : "10"}px;">
        <span
          aria-hidden="true"
          style="
            display:inline-block;
            width:10px; height:10px;
            border-radius:999px;
            background:${dotColor};
            box-shadow:0 0 0 2px ${dotColor}30;
            flex-shrink:0;
          "
        ></span>
        <span style="
          font-size:15px;
          font-weight:600;
          color:#0f172a;
          line-height:1.2;
          letter-spacing:-0.01em;
          flex:1;
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        ">${escapeHtml(unit.numero || "Sin nombre")}</span>
      </div>
 
      ${marcaModelo
      ? `<div style="
            font-size:11.5px;
            color:#64748b;
            margin:0 0 8px 18px;
            line-height:1.3;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
          ">${escapeHtml(marcaModelo)}</div>`
      : ""}
 
      <!-- Datos clave (Ley de Proximidad + Similitud) -->
      <div style="border-top:1px solid #e2e8f0;">
        ${rowEstado}
        ${rowReporte}
        ${rowUbicacion}
        ${rowVelocidad}
        ${rowViaje}
      </div>
 
      ${botonMaps}
    </div>
  `;
};

// ══════════════════════════════════════════════════════════════════════════════
// Cartas de eventos del recorrido — sistema de diseño compartido
// ══════════════════════════════════════════════════════════════════════════════
//
// Principios aplicados (Laws of UX):
//   - Ley de Consistencia/Similitud: todas las cartas comparten el mismo
//     esqueleto (encabezado con ícono + filas LABEL↔VALUE + pie con el
//     periodo), idéntico al patrón del InfoWindow de unidades de arriba.
//   - Ley de Jakob + Reconocimiento > Recuerdo: los glifos SVG son los
//     MISMOS de los marcadores del mapa (paleta de map-icon-svgs.ts), así
//     el usuario conecta marcador ↔ carta sin esfuerzo cognitivo.
//   - Estética-Usabilidad: cero emojis. Los emojis se renderizan distinto
//     en cada sistema operativo (Windows ≠ Android ≠ macOS); los SVG
//     inline garantizan exactamente el mismo pixel en todos.
//   - Números tabulares (font-variant-numeric) para que horas y cifras
//     no "bailen" horizontalmente entre cartas.

// ── Tipografía base (misma que la carta de unidades) ──────────────────────────
const CARD_FONT = "'Poppins', system-ui, -apple-system, sans-serif";

// ── Fábrica de íconos SVG inline ──────────────────────────────────────────────
// Genera un <svg> de trazo (estilo Lucide) listo para incrustar en el
// encabezado de una carta. El color llega de ROUTE_ICON_PALETTE para
// mantener identidad visual con los marcadores del mapa.
// Google Maps sanitiza el HTML del InfoWindow y descarta atributos SVG de
// presentación (stroke-width, stroke-linecap, stroke-linejoin) cuando vienen
// como atributos directos. Moverlos a `style=""` inline los preserva porque
// el InfoWindow sí permite propiedades CSS en el atributo style.
const svgIcon = (inner: string, color: string, size = 14): string =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" ` +
  `aria-hidden="true" ` +
  `style="flex-shrink:0; fill:none; stroke:${color}; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round;">` +
  `${inner}</svg>`;

// Glifos — espejo de los marcadores (map-icon-svgs.ts)
const GLYPH_PLAY = (c: string) =>
  svgIcon(`<path d="M8 5v14l11-7z" fill="${c}" stroke="none"/>`, c);
const GLYPH_FLAG = (c: string) =>
  svgIcon(`<path d="M5 21V4h12l-2.5 4L17 12H5"/>`, c);
const GLYPH_PAUSE = (c: string) =>
  svgIcon(`<line x1="9" y1="6" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="18"/>`, c);
const GLYPH_POWER = (c: string) =>
  svgIcon(`<path d="M12 3v8"/><path d="M6.3 7a8 8 0 1 0 11.4 0"/>`, c);
const GLYPH_GAUGE = (c: string) =>
  svgIcon(`<path d="M4 15a8 8 0 0 1 16 0"/><line x1="12" y1="15" x2="16" y2="10"/>`, c);
const GLYPH_RFID = (c: string) =>
  svgIcon(`<rect x="3" y="6" width="18" height="13" rx="2"/><line x1="3" y1="10.5" x2="21" y2="10.5"/>`, c);
const GLYPH_DOOR = (c: string) =>
  svgIcon(`<path d="M19 21V8l-4-5H6a1 1 0 0 0-1 1v17"/><circle cx="15" cy="13" r="1" fill="${c}" stroke="none"/>`, c);
const GLYPH_ALERT = (c: string) =>
  svgIcon(`<path d="M12 3 2.5 20h19L12 3z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r="0.5" fill="${c}"/>`, c);
const GLYPH_PIN = (c: string) =>
  svgIcon(`<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`, c, 12);
const GLYPH_CLOCK = (c: string) =>
  svgIcon(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`, c, 12);

// ── Esqueleto compartido de carta ─────────────────────────────────────────────
// Mismos estilos de fila que buildUnitInfoWindowContent para que TODOS
// los popups del sistema se sientan parte de la misma familia.
const EVENT_ROW_STYLE =
  "display:flex; justify-content:space-between; align-items:center; " +
  "padding:5px 0; border-bottom:1px solid #f1f5f9; gap:12px;";
const EVENT_ROW_STYLE_LAST = EVENT_ROW_STYLE.replace(
  "border-bottom:1px solid #f1f5f9; ",
  "",
);
const EVENT_LABEL_STYLE =
  "font-size:9.5px; color:#64748b; text-transform:uppercase; " +
  "letter-spacing:0.04em; font-weight:600; flex-shrink:0; line-height:1.2;";
const EVENT_VALUE_STYLE =
  "font-size:12.5px; color:#0f172a; text-align:right; " +
  "font-variant-numeric:tabular-nums; line-height:1.35; flex:1; font-weight:600;";

/** Contenedor exterior de toda carta de evento. */
const eventCardWrap = (content: string): string => `
  <div style="
    min-width:220px;
    max-width:280px;
    box-sizing:border-box;
    padding:4px 6px;
    font-family:${CARD_FONT};
  ">${content}</div>
`;

/**
 * Encabezado: ícono + título semántico + valor principal a la derecha.
 * Von Restorff: el color del título identifica el tipo de evento de un
 * vistazo, igual que el color del marcador en el mapa.
 */
const eventCardHeader = (
  iconSvg: string,
  title: string,
  color: string,
  rightValue?: string,
): string => `
  <div style="display:flex; align-items:center; gap:7px;">
    ${iconSvg}
    <span style="
      font-size:13px; font-weight:600; color:${color};
      flex:1; line-height:1.2;
    ">${title}</span>
    ${rightValue
    ? `<span style="
          font-size:12.5px; font-weight:600; color:#0f172a;
          font-variant-numeric:tabular-nums;
        ">${rightValue}</span>`
    : ""}
  </div>
`;

/** Fila LABEL ↔ VALUE (patrón idéntico al de la carta de unidades). */
const eventCardRow = (
  label: string,
  value: string,
  isLast = false,
  valueColor?: string,
): string => `
  <div style="${isLast ? EVENT_ROW_STYLE_LAST : EVENT_ROW_STYLE}">
    <span style="${EVENT_LABEL_STYLE}">${label}</span>
    <span style="${EVENT_VALUE_STYLE}${valueColor ? ` color:${valueColor};` : ""}">${value}</span>
  </div>
`;

/** Pie con el periodo del evento — información secundaria, tono apagado. */
const eventCardFooter = (periodo: string): string => `
  <div style="
    margin-top:6px; padding-top:6px;
    border-top:1px solid #f1f5f9;
    font-size:10.5px; color:#94a3b8;
    font-variant-numeric:tabular-nums; line-height:1.3;
  ">${escapeHtml(periodo)}</div>
`;

// ── Periodo compacto ──────────────────────────────────────────────────────────
/**
 * Formatea un rango de fechas evitando repetir el día.
 *
 * Antes:  "Ayer a las 16:53:47 – Ayer a las 23:59:47"  (redundante)
 * Ahora:  "Ayer, 16:53:47 – 23:59:47"                  (Ley de Tesler:
 *         se elimina complejidad que no aporta al usuario)
 *
 * Si inicio y fin caen en días distintos, se conserva el formato largo
 * porque ahí el día SÍ es información relevante.
 */
export const formatCompactPeriod = (
  startIso: string,
  endIso: string,
): string => {
  const inicio = formatCalendar(startIso);
  const fin = formatCalendar(endIso);

  // Separa "día" y "hora" de los formatos que produce formatCalendar:
  //   "Hoy a las 08:30:15" / "Ayer a las 22:10:45" / "15/03/2024 08:30:15"
  const partir = (s: string): [string, string] => {
    const sep = " a las ";
    const i = s.indexOf(sep);
    if (i !== -1) return [s.slice(0, i), s.slice(i + sep.length)];
    const j = s.indexOf(" ");
    return j === -1 ? [s, ""] : [s.slice(0, j), s.slice(j + 1)];
  };

  const [diaInicio, horaInicio] = partir(inicio);
  const [diaFin, horaFin] = partir(fin);

  if (diaInicio === diaFin && horaInicio && horaFin) {
    return `${diaInicio}, ${horaInicio} – ${horaFin}`;
  }
  return `${inicio} – ${fin}`;
};

// ── Datos de un marcador de dirección de recorrido ────────────────────────────
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
 * distancia acumulada y hora.
 * Aesthetic-Usability → velocidad grande con color semántico.
 *
 * El color de la velocidad usa `velMax` de la unidad (mismo criterio que
 * el polyline del recorrido): rojo en exceso, ámbar a 5 km/h del límite,
 * verde normal. Si la unidad no tiene vel_max configurada (velMax <= 0)
 * se usan los umbrales históricos 80/60 como respaldo.
 */
export const buildRouteArrowInfoWindowContent = (
  unitLabel: string | null,
  data: RouteArrowMarkerData,
  velMax = 0,
): string => {
  const speed = Math.round(data.point.velocidad ?? 0);

  const speedColor =
    velMax > 0
      ? speed >= velMax
        ? "#dc2626"
        : speed >= velMax - 5
          ? "#d97706"
          : "#16a34a"
      : speed >= 80
        ? "#dc2626"
        : speed >= 60
          ? "#d97706"
          : "#16a34a";

  const horaStr = formatCalendar(data.point.fecha_hora_gps);

  return eventCardWrap(`
    <div style="font-size:19px; font-weight:700; color:${speedColor}; line-height:1; font-variant-numeric:tabular-nums;">
      ${speed} <span style="font-size:11px; font-weight:400; color:#94a3b8;">km/h</span>
    </div>
    <div style="margin-top:6px; display:flex; align-items:center; gap:5px; font-size:11px; color:#64748b;">
      ${GLYPH_PIN("#64748b")} ${data.distanceFromStartKm.toFixed(1)} km desde inicio
    </div>
    <div style="margin-top:3px; display:flex; align-items:center; gap:5px; font-size:11px; color:#94a3b8;">
      ${GLYPH_CLOCK("#94a3b8")} ${escapeHtml(horaStr)}
    </div>
  `);
};


/** Fila de dirección con placeholder para geocoding perezoso. */
const eventCardAddressRow = (): string => `
  <div style="
    display:flex; align-items:center; gap:5px;
    margin-top:5px; padding-top:5px;
    border-top:1px solid #f1f5f9;
    font-size:11px; color:#94a3b8;
  ">
    ${GLYPH_PIN("#94a3b8")}
    <span>${GEOCODE_PLACEHOLDER}</span>
  </div>
`;

// ── Builders de InfoWindow para eventos del recorrido ─────────────────────────
// Compatibles con useMapRoute. Todos reciben strings ya formateados.
// Colores espejo de ROUTE_ICON_PALETTE (marcador ↔ carta = mismo color).

export const buildStartFlagContent = (
  fechaHora: string,
  tiempoApagado?: string,
  fechaApagado?: string,
): string =>
  eventCardWrap(`
    ${eventCardHeader(GLYPH_PLAY(ROUTE_ICON_PALETTE.start), "Inicio del recorrido", ROUTE_ICON_PALETTE.start)}
    <div style="margin-top:5px; font-size:12px; color:#475569; font-variant-numeric:tabular-nums;">
      ${escapeHtml(fechaHora)}
    </div>
    ${eventCardAddressRow()}
    ${tiempoApagado
      ? `<div style="margin-top:4px; font-size:10.5px; color:#94a3b8;">
          Permaneció aquí ${escapeHtml(tiempoApagado)}
          ${fechaApagado ? `desde ${escapeHtml(fechaApagado)}` : ""}
        </div>`
      : ""}
  `);

export const buildEndFlagContent = (
  distanciaKm: number,
  duracionTotal: string,
): string =>
  eventCardWrap(`
    ${eventCardHeader(GLYPH_FLAG(ROUTE_ICON_PALETTE.finish), "Fin del recorrido", ROUTE_ICON_PALETTE.finish)}
    ${eventCardAddressRow()}
    <div style="margin-top:4px; border-top:1px solid #f1f5f9;">
      ${eventCardRow("Distancia", `${distanciaKm.toFixed(2)} km`)}
      ${eventCardRow("Duración", escapeHtml(duracionTotal), true)}
    </div>
  `);

export const buildStopEventContent = (
  tiempoEvento: string,
  periodo: string,
): string =>
  eventCardWrap(`
    ${eventCardHeader(GLYPH_PAUSE(ROUTE_ICON_PALETTE.stop), "Detenida", ROUTE_ICON_PALETTE.stop, escapeHtml(tiempoEvento))}
    ${eventCardAddressRow()}
    ${eventCardFooter(periodo)}
  `);

export const buildEngineEventContent = (
  tiempoEvento: string,
  periodo: string,
): string =>
  eventCardWrap(`
    ${eventCardHeader(GLYPH_POWER(ROUTE_ICON_PALETTE.engine), "Motor apagado", ROUTE_ICON_PALETTE.engine, escapeHtml(tiempoEvento))}
    ${eventCardAddressRow()}
    ${eventCardFooter(periodo)}
  `);

export const buildDoorEventContent = (
  tiempoEvento: string,
  periodo: string,
): string =>
  eventCardWrap(`
    ${eventCardHeader(GLYPH_DOOR(ROUTE_ICON_PALETTE.door), "Puerta abierta", ROUTE_ICON_PALETTE.door, escapeHtml(tiempoEvento))}
    ${eventCardFooter(periodo)}
  `);

export const buildSpeedEventContent = (
  velocidadMaxima: number,
  velMax: number,
  distanciaKm: number,
  tiempoEvento: string,
  periodo: string,
): string =>
  eventCardWrap(`
    ${eventCardHeader(GLYPH_GAUGE(ROUTE_ICON_PALETTE.speed), "Exceso de velocidad", ROUTE_ICON_PALETTE.speed)}
    <div style="margin-top:4px; border-top:1px solid #e2e8f0;">
      ${eventCardRow("Alcanzado", `${velocidadMaxima} km/h`, false, ROUTE_ICON_PALETTE.speed)}
      ${eventCardRow("Límite", `${velMax} km/h`)}
      ${eventCardRow("Distancia", `${distanciaKm.toFixed(2)} km`)}
      ${eventCardRow("Duración", escapeHtml(tiempoEvento), true)}
    </div>
    ${eventCardFooter(periodo)}
  `);

export const buildRfidEventContent = (
  lecturas: Array<{ rfid: string; fecha_hora: string }>,
): string => {
  const filas = lecturas
    .map(
      (l, i) =>
        eventCardRow(
          escapeHtml(l.rfid),
          escapeHtml(l.fecha_hora),
          i === lecturas.length - 1,
        ),
    )
    .join("");

  return eventCardWrap(`
    ${eventCardHeader(
    GLYPH_RFID(ROUTE_ICON_PALETTE.rfid),
    `${lecturas.length} lectura${lecturas.length !== 1 ? "s" : ""} RFID`,
    ROUTE_ICON_PALETTE.rfid,
  )}
    <div style="margin-top:4px; border-top:1px solid #e2e8f0;">
      ${filas}
    </div>
  `);
};

export const buildAlertEventContent = (
  alertas: Array<{ fecha_hora_gps: string; velocidad: number; lat: number; lng: number }>,
): string => {
  const filas = alertas
    .map(
      (a) => `
      <div style="margin-bottom:5px; padding-bottom:5px; border-bottom:1px solid #fee2e2;">
        <div style="font-size:12px; font-weight:600; color:${ROUTE_ICON_PALETTE.alert}; font-variant-numeric:tabular-nums;">
          ${escapeHtml(a.fecha_hora_gps)}
        </div>
        <div style="font-size:10.5px; color:#64748b; font-variant-numeric:tabular-nums;">
          ${Math.floor(a.velocidad)} km/h · ${a.lat.toFixed(5)}, ${a.lng.toFixed(5)}
        </div>
      </div>`,
    )
    .join("");

  return eventCardWrap(`
    ${eventCardHeader(GLYPH_ALERT(ROUTE_ICON_PALETTE.alert), "Botón de pánico", ROUTE_ICON_PALETTE.alert)}
    <div style="margin-top:5px;">${filas}</div>
  `);
};