// ══════════════════════════════════════════════════════════════════════════════
// infowindow-geocode.ts — Helper de InfoWindow con reverse geocoding perezoso
// ══════════════════════════════════════════════════════════════════════════════
//
// Responsabilidad única: abrir un InfoWindow mostrando el HTML base de
// inmediato (con placeholder de dirección) y actualizar su contenido cuando
// el reverse geocoding resuelve la dirección real.
//
// ── Patrón UX (Nielsen #1 — Visibilidad del estado del sistema) ───────────────
// El usuario ve la carta abrirse al instante con "Obteniendo dirección…".
// La dirección aparece ~200-500 ms después sin ninguna acción extra.
// Esto es el mismo patrón que usa Google Maps al hacer clic en un lugar
// del mapa: la carta aparece inmediatamente y la dirección llega sola.
//
// ── Por qué NO async/await en el handler de clic ─────────────────────────────
// El listener "gmp-click" de Google Maps no es async — si lo hiciéramos
// async y esperáramos el geocoding antes de abrir el InfoWindow, el usuario
// vería un retraso de ~300-500 ms antes de que aparezca cualquier cosa.
// La solución es: abrir SÍNCRONAMENTE con el HTML base (sin dirección) y
// actualizar de forma asíncrona cuando llega la dirección.
// ══════════════════════════════════════════════════════════════════════════════

import { resolveAddress } from "./geocoding-cache";

/**
 * Abre un InfoWindow de Google Maps con geocoding perezoso.
 *
 * Flujo:
 *   1. Abre el InfoWindow inmediatamente con `htmlBase` (tiene placeholder).
 *   2. Llama a resolveAddress(lat, lng) en background.
 *   3. Cuando resuelve, reemplaza el placeholder con la dirección real
 *      (solo si el InfoWindow sigue abierto en el mismo marcador).
 *
 * @param infoWindow  Instancia compartida de InfoWindow del mapa
 * @param map         Instancia del mapa de Google Maps
 * @param marker      Marcador al que anclar el InfoWindow
 * @param htmlBase    HTML ya renderizado con GEOCODE_PLACEHOLDER en el lugar
 *                    donde debe aparecer la dirección
 * @param lat         Latitud del punto GPS
 * @param lng         Longitud del punto GPS
 */
export const openInfoWindowWithGeocode = (
    infoWindow: google.maps.InfoWindow,
    map: google.maps.Map,
    marker: google.maps.marker.AdvancedMarkerElement,
    htmlBase: string,
    lat: number,
    lng: number,
): void => {
    // Paso 1: abrir inmediatamente con el placeholder visible
    infoWindow.setContent(htmlBase);
    infoWindow.open({ map, anchor: marker });

    // Paso 2: resolver la dirección en background (sin bloquear el hilo)
    resolveAddress(lat, lng).then((address) => {
        // Paso 3: actualizar SOLO si el InfoWindow sigue mostrando este contenido.
        // Comparamos el contenido actual para no sobreescribir una carta diferente
        // que el usuario haya abierto mientras esperaba el geocoding.
        const currentContent = infoWindow.getContent();
        if (typeof currentContent === "string" && currentContent.includes(GEOCODE_PLACEHOLDER)) {
            infoWindow.setContent(currentContent.replace(GEOCODE_PLACEHOLDER, escapeAddressHtml(address)));
        }
    });
};

// ── Constante placeholder ─────────────────────────────────────────────────────
// Texto único que identifica el lugar donde insertar la dirección.
// Debe ser único en el HTML generado para que el replace sea inequívoco.
export const GEOCODE_PLACEHOLDER = "__GEOCODE_PENDING__";

// ── Escaper mínimo para la dirección ────────────────────────────────────────
// La dirección viene de Google (fuente confiable), pero aplicamos escape
// defensivo por buena práctica (nunca insertar strings sin sanitizar en HTML).
const escapeAddressHtml = (address: string): string =>
    address
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");