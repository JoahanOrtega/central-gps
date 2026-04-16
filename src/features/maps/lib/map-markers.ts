import type { MapUnitItem } from "../types/map.types";
import { getTelemetryStatusColor } from "./telemetry-status";

// ── Builders de contenido para AdvancedMarkerElement ─────────
// Cada función crea y devuelve un HTMLElement listo para usar
// como `content` en un google.maps.marker.AdvancedMarkerElement.
//
// Se usan HTMLElement en lugar de SVG para aprovechar el soporte
// nativo de estilos CSS y facilitar futuros cambios visuales.

/** Marker de resultado de búsqueda por dirección — punto azul */
export const buildSearchMarkerContent = (): HTMLElement => {
    const element = document.createElement("div");
    element.style.width = "18px";
    element.style.height = "18px";
    element.style.borderRadius = "9999px";
    element.style.background = "#2563eb";
    element.style.border = "3px solid white";
    element.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
    return element;
};

/** Marker de Punto de Interés — punto naranja */
export const buildPoiMarkerContent = (): HTMLElement => {
    const element = document.createElement("div");
    element.style.width = "18px";
    element.style.height = "18px";
    element.style.borderRadius = "9999px";
    element.style.background = "#f97316";
    element.style.border = "3px solid white";
    element.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
    return element;
};

/** Marker de unidad — color dinámico según estado de telemetría */
export const buildUnitMarkerContent = (unit: MapUnitItem): HTMLElement => {
    const color = getTelemetryStatusColor(
        unit.telemetry?.status,
        unit.telemetry?.velocidad,
    );

    const element = document.createElement("div");
    element.style.width = "22px";
    element.style.height = "22px";
    element.style.borderRadius = "9999px";
    element.style.background = color;
    element.style.border = "3px solid white";
    element.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
    element.style.cursor = "pointer";
    return element;
};

/** Marker de bandera para inicio (I) o fin (F) de recorrido */
export const createRouteFlagMarker = (
    map: google.maps.Map,
    position: google.maps.LatLngLiteral,
    label: string,
    color: string,
): google.maps.marker.AdvancedMarkerElement => {
    const element = document.createElement("div");
    element.style.display = "flex";
    element.style.alignItems = "center";
    element.style.justifyContent = "center";
    element.style.width = "28px";
    element.style.height = "28px";
    element.style.borderRadius = "9999px";
    element.style.background = color;
    element.style.color = "white";
    element.style.fontSize = "12px";
    element.style.fontWeight = "700";
    element.style.border = "2px solid white";
    element.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
    element.innerText = label;

    return new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        content: element,
    });
};