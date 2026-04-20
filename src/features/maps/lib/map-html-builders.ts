import type { MapPoiItem, MapUnitItem, RoutePoint } from "../types/map.types";
import {
  getTelemetryStatusLabel,
  getTelemetryStatusMeta,
  UNIT_COLORS,
} from "./telemetry-status";
import {
  formatAppDateTimeShort,
  formatDuration,
  formatElapsedTimeFromApiDate,
} from "@/lib/date-time";

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
  // Consumimos `segundos_en_estado_actual` calculado por el backend con
  // una sola query batch (utils.engine_state + telemetry_service).
  // El backend lo expone a nivel de unidad y también dentro de telemetry;
  // preferimos el de la unidad porque el backend lo pobló explícitamente
  // para este caso de uso.
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
    return formatDuration(Math.floor((fin - inicio) / 1000));
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
  // Formato estándar Google Maps (convención Jakob): ?q=lat,lng
  // encodeURIComponent defiende contra valores inesperados (aunque sean números).
  const lat = telemetry?.latitud;
  const lng = telemetry?.longitud;
  const mapsUrl =
    typeof lat === "number" && typeof lng === "number"
      ? `http://maps.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`
      : null;

  // ── Velocidad: solo si el motor está encendido (Ley de Hick) ─────────
  const mostrarVelocidad = engineState === "on";

  // ─────────────────────────────────────────────────────────────────────
  // Plantilla HTML — estilo inline para portabilidad dentro del iframe
  // ─────────────────────────────────────────────────────────────────────

  const rowStyle =
    "display:flex; justify-content:space-between; align-items:baseline; " +
    "padding:7px 0; border-bottom:1px solid #f1f5f9; gap:16px;";
  const rowStyleLast = rowStyle.replace(
    "border-bottom:1px solid #f1f5f9; ",
    "",
  );
  const labelStyle =
    "font-size:10px; color:#94a3b8; text-transform:uppercase; " +
    "letter-spacing:0.05em; font-weight:500; flex-shrink:0;";
  const valueStyle =
    "font-size:13px; color:#0f172a; text-align:right; " +
    "font-variant-numeric:tabular-nums; line-height:1.3;";
  const valueSecondary =
    "display:block; font-size:10px; color:#94a3b8; margin-top:2px; " +
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

  const rowReporte = `
    <div style="${mostrarVelocidad || mostrarViaje ? rowStyle : rowStyleLast}">
      <span style="${labelStyle}">Reporte</span>
      <span style="${valueStyle}">
        hace ${escapeHtml(tiempoRelativoReporte)}
        <span style="${valueSecondary}">${escapeHtml(fechaReporte)}</span>
      </span>
    </div>`;

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

  // Botón: abre Google Maps en nueva pestaña (rel noopener para seguridad)
  const botonMaps = mapsUrl
    ? `
    <a
      href="${mapsUrl}"
      target="_blank"
      rel="noopener noreferrer"
      style="
        display:flex; align-items:center; justify-content:center; gap:6px;
        margin-top:12px; padding:8px 12px;
        background:#f8fafc;
        border:1px solid #e2e8f0;
        border-radius:6px;
        font-size:12px; font-weight:500;
        color:#334155; text-decoration:none;
        transition:background 0.15s ease;
      "
      onmouseover="this.style.background='#f1f5f9'"
      onmouseout="this.style.background='#f8fafc'"
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
      min-width:250px;
      max-width:290px;
      padding:4px 2px;
      font-family:'Poppins', system-ui, -apple-system, sans-serif;
    ">
      <!-- Encabezado: dot de estado + número de unidad -->
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:${marcaModelo ? "4" : "12"}px;">
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
        ">${escapeHtml(unit.numero || "Sin nombre")}</span>
      </div>

      ${marcaModelo
      ? `<div style="
            font-size:12px;
            color:#64748b;
            margin:0 0 10px 18px;
            line-height:1.3;
          ">${escapeHtml(marcaModelo)}</div>`
      : ""}

      <!-- Datos clave (Ley de Proximidad + Similitud) -->
      <div style="border-top:1px solid #f1f5f9;">
        ${rowEstado}
        ${rowReporte}
        ${rowVelocidad}
        ${rowViaje}
      </div>

      ${botonMaps}
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