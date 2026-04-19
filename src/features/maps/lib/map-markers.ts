import type { MapUnitItem } from "../types/map.types";
import {
    getTelemetryStatusMeta,
    getIgnicion,
} from "./telemetry-status";

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
    const ignicion = getIgnicion(t?.status);

    const meta = getTelemetryStatusMeta(
        t?.status,
        velocidad,
        t?.segundos,
        t?.segundos_sistema,
        unit.vel_max,
    );

    // En movimiento → flecha; detenida/apagada → círculo
    const enMovimiento = ignicion === 1 && Math.round(velocidad) >= 1;

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
// Usa arrow.svg del proyecto — modesto, del mismo tamaño que stop/engine,
// rotado según el campo `grados` del AVL (no calculado entre puntos).
export const buildRouteArrowMarkerContent = (
    grados: number,
): HTMLElement => {
    const size = 16; // pequeño, coherente con stop.svg (25px) y engine.svg

    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        cursor: pointer;
        /* arrow.svg base apunta a la derecha (Este=0°). 
         * Los grados del AVL son 0=Norte, así que compensamos -90° */
        transform: rotate(${grados - 90}deg);
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));
    `;

    const img = document.createElement("img");
    img.src = "/images/app/map_resources/arrow.svg";
    img.width = size;
    img.height = size;
    img.style.cssText = "display:block; width:100%; height:100%;";
    wrapper.appendChild(img);

    return wrapper;
};

// ── Marker de bandera inicio / fin del recorrido ──────────────────────────────
// Usa start.svg y finish.svg del proyecto — mismos assets del legacy PHP.
export const createRouteFlagMarker = (
    map: google.maps.Map,
    position: google.maps.LatLngLiteral,
    label: "I" | "F",
    _color: string,  // se mantiene por compatibilidad, el color lo da el SVG
): google.maps.marker.AdvancedMarkerElement => {
    // start.svg: 19×28.7 | finish-track.svg: 23×36 — ambos a escala natural
    const isStart = label === "I";
    const src = isStart
        ? "/images/app/map_resources/start.svg"
        : "/images/app/map_resources/finish.svg";
    const w = isStart ? 22 : 22;
    const h = isStart ? 33 : 33;

    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
        cursor: pointer;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.40));
    `;

    const img = document.createElement("img");
    img.src = src;
    img.width = w;
    img.height = h;
    img.style.cssText = "display:block;";
    wrapper.appendChild(img);

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
 * Ruta base de los recursos SVG del proyecto.
 * Los archivos viven en /public/images/app/map_resources/
 * y se acceden como rutas absolutas desde la raíz del sitio.
 */
const SVG_BASE = "/images/app/map_resources";

/**
 * Mapeo de tipo de evento → archivo SVG existente en el proyecto.
 * Reusa los mismos assets del legacy PHP para coherencia visual.
 */
const EVENT_SVG: Record<RouteEventType, string> = {
    flags: `${SVG_BASE}/flags.svg`,
    alert: `${SVG_BASE}/alert.svg`,
    rfid: `${SVG_BASE}/rfid.svg`,
    engine: `${SVG_BASE}/engine.svg`,
    door: `${SVG_BASE}/door.svg`,
    speed: `${SVG_BASE}/speed.svg`,
    stop: `${SVG_BASE}/stop.svg`,
    arrow: `${SVG_BASE}/arrow.svg`,
};

/**
 * Tamaño visual de cada ícono de evento.
 * Valores tomados del draw.js legacy (iconSize por tipo).
 */
const EVENT_SIZE: Record<RouteEventType, number> = {
    flags: 28,
    alert: 24,
    rfid: 24,
    engine: 24,
    door: 24,
    speed: 28,   // más grande para que sea legible con la velocidad
    stop: 24,
    arrow: 20,
};

/**
 * Crea el HTMLElement del marker de un evento del recorrido.
 * Usa los SVGs existentes en /public/images/app/map_resources/.
 *
 * Para el evento "speed" muestra la velocidad máxima como badge encima del ícono.
 */
export const buildRouteEventMarkerContent = (
    type: RouteEventType,
    velocidadMaxima?: number,
): HTMLElement => {
    const size = EVENT_SIZE[type];
    const src = EVENT_SVG[type];

    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
        position: relative;
        width: ${size}px;
        height: ${size}px;
        cursor: pointer;
        filter: drop-shadow(0 1px 3px rgba(0,0,0,0.40));
    `;

    const img = document.createElement("img");
    img.src = src;
    img.width = size;
    img.height = size;
    img.style.cssText = "display:block; width:100%; height:100%;";
    wrapper.appendChild(img);

    // Badge de velocidad para exceso — número sobre el ícono
    if (type === "speed" && velocidadMaxima !== undefined) {
        const badge = document.createElement("div");
        badge.style.cssText = `
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            background: #dc2626;
            color: white;
            font-size: 9px;
            font-weight: 700;
            padding: 1px 4px;
            border-radius: 999px;
            white-space: nowrap;
            font-family: Poppins, sans-serif;
            box-shadow: 0 1px 2px rgba(0,0,0,0.30);
        `;
        badge.textContent = `${velocidadMaxima}`;
        wrapper.appendChild(badge);
    }

    return wrapper;
};