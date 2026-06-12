import type { MapUnitItem } from "../types/map.types";
import { getTelemetryStatusMeta } from "./telemetry-status";
import { getRouteIconSvg, type RouteIconType } from "./map-icon-svgs";

// ── Marker de búsqueda de dirección ──────────────────────────────────────────
export const buildSearchMarkerContent = (): HTMLElement => {
    const el = document.createElement("div");
    el.style.cssText = `
        width:18px; height:18px; border-radius:9999px;
        background:#2563eb; border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
    `;
    return el;
};

// ── Marker de POI ─────────────────────────────────────────────────────────────
export const buildPoiMarkerContent = (): HTMLElement => {
    const el = document.createElement("div");
    el.style.cssText = `
        width:18px; height:18px; border-radius:9999px;
        background:#f97316; border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
    `;
    return el;
};

// ── Marker de unidad ──────────────────────────────────────────────────────────
// Fiel al draw.js legacy: flecha SVG rotada en movimiento, círculo detenida.
// Color de relleno por tiempo de transmisión (verde/amarillo/rojo).
export const buildUnitMarkerContent = (unit: MapUnitItem): HTMLElement => {
    const t = unit.telemetry;
    const velocidad = t?.velocidad ?? 0;
    const grados = t?.grados ?? 0;
    // El estado del motor viene pre-resuelto por el backend.
    const engineState = t?.engine_state ?? "unknown";

    const meta = getTelemetryStatusMeta(
        engineState,
        velocidad,
        t?.segundos,
        t?.segundos_sistema,
        unit.vel_max,
        // Tiempo acumulado en el estado actual del motor (pre-calculado
        // por el backend). Activa el fill ROJO cuando una unidad lleva
        // apagada más del umbral de APAGADO_PROLONGADO_SEGS.
        t?.segundos_en_estado_actual,
    );

    // En movimiento → flecha; detenida/apagada → círculo
    const enMovimiento = engineState === "on" && Math.round(velocidad) >= 1;

    const numero = unit.numero ?? "";
    const fontSize = numero.length >= 5 ? "9px" : numero.length >= 4 ? "10px" : "12px";

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "cursor:pointer; position:relative;";

    if (enMovimiento) {
        // Flecha SVG que rota según los grados del AVL
        wrapper.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg"
                 viewBox="-20 -32 40 52" width="38" height="50"
                 style="transform:rotate(${Math.round(grados)}deg);
                        filter:drop-shadow(0 2px 4px rgba(0,0,0,0.40));">
                <path d="M8.615,15.184l14.599,7.815L16.129,6.704
                         C16.988,4.639,17.467,2.376,17.467,0
                         c0-7.495-4.729-13.869-11.36-16.348L0-30.394
                         l-6.107,14.046c-6.63,2.479-11.36,8.853-11.36,16.348
                         c0,2.376,0.479,4.639,1.338,6.704l-7.084,16.295
                         l14.599-7.815C-6.071,16.63-3.135,17.467,0,17.467
                         C3.136,17.467,6.071,16.63,8.615,15.184z"
                      fill="${meta.fillColor}"
                      stroke="${meta.strokeColor}"
                      stroke-width="3"
                      stroke-opacity="0.6"
                      transform="scale(0.9)"/>
                <text x="0" y="2"
                      text-anchor="middle" dominant-baseline="central"
                      fill="white" font-family="Poppins,sans-serif"
                      font-size="${fontSize}" font-weight="600"
                      style="transform:scale(1.1);">${numero}</text>
            </svg>`;
    } else {
        // Círculo para unidades detenidas o apagadas
        wrapper.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg"
                 viewBox="-20 -20 40 40" width="36" height="36"
                 style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
                <circle cx="0" cy="0" r="15"
                        fill="${meta.fillColor}"
                        stroke="${meta.strokeColor}"
                        stroke-width="3" stroke-opacity="0.6"/>
                <text x="0" y="0"
                      text-anchor="middle" dominant-baseline="central"
                      fill="white" font-family="Poppins,sans-serif"
                      font-size="${fontSize}" font-weight="600">${numero}</text>
            </svg>`;
    }

    return wrapper;
};

// ── Marker de flecha de dirección en el recorrido ─────────────────────────────
// Chevron de navegación inline (fábrica map-icon-svgs). El SVG base apunta
// al NORTE, así que se rota con los grados del AVL directamente —
// sin la compensación -90° que requería el arrow.svg heredado.
export const buildRouteArrowMarkerContent = (
    grados: number,
): HTMLElement => {
    const size = 18; // discreto: las flechas son contexto, no protagonistas

    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        cursor: pointer;
        transform: rotate(${Math.round(grados)}deg);
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.30));
    `;
    wrapper.innerHTML = getRouteIconSvg("arrow");
    return wrapper;
};

// ── Marker de bandera inicio / fin del recorrido ──────────────────────────────
// Pines tipo gota generados inline: verde con "play" para el inicio,
// slate con bandera para el fin. La punta del pin marca la coordenada
// exacta (mejor precisión percibida que los SVG planos anteriores).
export const createRouteFlagMarker = (
    map: google.maps.Map,
    position: google.maps.LatLngLiteral,
    label: "I" | "F",
    _color: string,  // se mantiene por compatibilidad — el color lo da la paleta
): google.maps.marker.AdvancedMarkerElement => {
    const isStart = label === "I";

    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
        width: 26px;
        height: 37px;
        cursor: pointer;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
    `;
    wrapper.innerHTML = getRouteIconSvg(isStart ? "start" : "finish");

    return new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        content: wrapper,
    });
};

// ── Tipos y helpers para eventos del recorrido ────────────────────────────────

export type RouteEventType =
    | "flags"
    | "alert"
    | "rfid"
    | "engine"
    | "door"
    | "speed"
    | "stop"
    | "arrow";

/**
 * Tamaño visual de cada ícono de evento.
 * Uniforme en 26px para que la "familia" de eventos se lea consistente
 * (Nielsen #4); solo las flechas son más chicas por ser secundarias.
 */
const EVENT_SIZE: Record<RouteEventType, number> = {
    flags: 26,
    alert: 26,
    rfid: 26,
    engine: 26,
    door: 26,
    speed: 26,
    stop: 26,
    arrow: 18,
};

/**
 * Crea el HTMLElement del marker de un evento del recorrido.
 * Los íconos se generan inline desde map-icon-svgs (cero archivos externos).
 *
 * Para el evento "speed" muestra la velocidad máxima como badge encima del
 * ícono — el dato accionable visible sin necesidad de hacer click
 * (Nielsen #1: visibilidad del estado del sistema).
 */
export const buildRouteEventMarkerContent = (
    type: RouteEventType,
    velocidadMaxima?: number,
): HTMLElement => {
    const size = EVENT_SIZE[type];

    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
        position: relative;
        width: ${size}px;
        height: ${size}px;
        cursor: pointer;
        filter: drop-shadow(0 1px 3px rgba(0,0,0,0.35));
    `;
    wrapper.innerHTML = getRouteIconSvg(type as RouteIconType);

    // Badge de velocidad para exceso — número sobre el ícono
    if (type === "speed" && velocidadMaxima !== undefined) {
        const badge = document.createElement("div");
        badge.style.cssText = `
            position: absolute;
            top: -9px;
            left: 50%;
            transform: translateX(-50%);
            background: #dc2626;
            color: white;
            font-size: 9px;
            font-weight: 700;
            padding: 1px 5px;
            border-radius: 999px;
            white-space: nowrap;
            font-family: Poppins, sans-serif;
            border: 1.5px solid white;
            box-shadow: 0 1px 2px rgba(0,0,0,0.30);
        `;
        badge.textContent = `${velocidadMaxima}`;
        wrapper.appendChild(badge);
    }

    return wrapper;
};