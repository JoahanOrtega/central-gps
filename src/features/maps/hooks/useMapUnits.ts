import { useRef } from "react";
import type { MapUnitItem } from "../types/map.types";
import { buildUnitMarkerContent } from "../lib/map-markers";
import { buildUnitInfoWindowContent } from "../lib/map-html-builders";

// ── Interfaz pública ──────────────────────────────────────────────────────────
export interface UseMapUnitsReturn {
    focusUnit: (unit: MapUnitItem) => void;
    showUnits: (units: MapUnitItem[]) => void;
    hideUnits: () => void;
    updateUnit: (unit: MapUnitItem) => void;  // actualiza marker existente sin recrearlo
}

interface UseMapUnitsParams {
    mapRef: React.RefObject<google.maps.Map | null>;
    infoWindowRef: React.RefObject<google.maps.InfoWindow | null>;
}

// ── Hook principal ────────────────────────────────────────────────────────────
export const useMapUnits = ({
    mapRef,
    infoWindowRef,
}: UseMapUnitsParams): UseMapUnitsReturn => {

    // Map<id_unidad, AdvancedMarkerElement> — permite actualizar sin recrear
    const unitMarkersRef = useRef<
        Map<number, google.maps.marker.AdvancedMarkerElement>
    >(new Map());

    // ── Helpers ───────────────────────────────────────────────────────────────

    const clearUnitMarkers = () => {
        unitMarkersRef.current.forEach((marker) => { marker.map = null; });
        unitMarkersRef.current.clear();
    };

    /**
     * Registra los listeners de hover/click en un marker de unidad.
     *
     * Fiel al draw.js legacy (_handleMouseInMarker + _getContentUnidad):
     *   - mouseover/mousedown → abrir InfoWindow con contenido rico
     *   - mouseout → cerrar InfoWindow
     *
     * En AdvancedMarkerElement se usa "click" porque no existe "mouseover"
     * en la API de marcadores avanzados — es la aproximación más cercana
     * al comportamiento original para pantallas táctiles y desktop.
     */
    const attachUnitMarkerListeners = (
        marker: google.maps.marker.AdvancedMarkerElement,
        unit: MapUnitItem,
    ) => {
        const map = mapRef.current!;
        const infoWindow = infoWindowRef.current!;

        marker.addListener("gmp-click", () => {
            infoWindow.setContent(buildUnitInfoWindowContent(unit));
            infoWindow.open({ map, anchor: marker });
        });
    };

    // ── Acciones públicas ─────────────────────────────────────────────────────

    /**
     * Centra el mapa en una unidad y abre su InfoWindow.
     * Si el marker ya existe lo reutiliza; si no, lo crea.
     */
    const focusUnit = (unit: MapUnitItem) => {
        const map = mapRef.current;
        const infoWindow = infoWindowRef.current;
        if (!map || !infoWindow) return;
        if (unit.telemetry?.latitud == null || unit.telemetry?.longitud == null) return;

        const position = {
            lat: unit.telemetry.latitud,
            lng: unit.telemetry.longitud,
        };

        map.panTo(position);
        map.setZoom(17);

        const existing = unitMarkersRef.current.get(unit.id);
        if (existing) {
            // Reutilizar el marker existente — solo abrir InfoWindow
            infoWindow.setContent(buildUnitInfoWindowContent(unit));
            infoWindow.open({ map, anchor: existing });
            return;
        }

        // Crear un marker temporal para hacer focus sin estar en la selección
        const marker = new window.google.maps.marker.AdvancedMarkerElement({
            map,
            position,
            title: unit.numero,
            content: buildUnitMarkerContent(unit),
            zIndex: 200,
        });

        attachUnitMarkerListeners(marker, unit);
        unitMarkersRef.current.set(unit.id, marker);

        infoWindow.setContent(buildUnitInfoWindowContent(unit));
        infoWindow.open({ map, anchor: marker });
    };

    /**
     * Muestra una lista de unidades en el mapa.
     *
     * Fiel al draw.js legacy (_drawUnidad):
     *   - SVG con forma de flecha (en movimiento) o círculo (detenida/apagada)
     *   - Rotación según el campo `grados` del dato GPS
     *   - Color de relleno por tiempo de transmisión (verde/amarillo/rojo)
     *   - Número de unidad como etiqueta en el marcador
     *   - zIndex mayor para unidades encendidas (quedan encima de apagadas)
     *   - fitBounds al conjunto de unidades, máximo zoom 17
     */
    const showUnits = (units: MapUnitItem[]) => {
        const map = mapRef.current;
        const infoWindow = infoWindowRef.current;
        if (!map || !infoWindow) return;

        clearUnitMarkers();

        const bounds = new window.google.maps.LatLngBounds();
        let hasValidPoints = false;

        units.forEach((unit) => {
            if (unit.telemetry?.latitud == null || unit.telemetry?.longitud == null) return;

            const position = {
                lat: unit.telemetry.latitud,
                lng: unit.telemetry.longitud,
            };

            // Unidades encendidas aparecen encima de las apagadas (igual que legacy).
            // Consumimos engine_state pre-resuelto por el backend, en vez de
            // reinterpretar bit 1 del status crudo.
            const isOn = unit.engine_state === "on";

            const marker = new window.google.maps.marker.AdvancedMarkerElement({
                map,
                position,
                title: unit.numero,
                content: buildUnitMarkerContent(unit),
                zIndex: isOn ? 100 : 50,
            });

            attachUnitMarkerListeners(marker, unit);
            unitMarkersRef.current.set(unit.id, marker);

            bounds.extend(position);
            hasValidPoints = true;
        });

        if (hasValidPoints) {
            map.fitBounds(bounds);
            // Limitar zoom igual que el legacy (evitar zoom excesivo en pocas unidades)
            const zoom = map.getZoom();
            if (typeof zoom === "number" && zoom > 17) map.setZoom(17);
        }
    };

    /**
     * Actualiza el contenido visual de un marker ya existente sin recrearlo.
     *
     * Se usa cuando llegan nuevos datos de telemetría (polling).
     * Fiel al legacy: marker.setOptions(opt) actualiza posición, icono y
     * estado sin crear un nuevo marker — mantiene el infoWindow abierto.
     */
    const updateUnit = (unit: MapUnitItem) => {
        const map = mapRef.current;
        const marker = unitMarkersRef.current.get(unit.id);
        if (!map || !marker) return;

        if (unit.telemetry?.latitud == null || unit.telemetry?.longitud == null) return;

        // Actualizar posición y contenido del marker
        marker.position = {
            lat: unit.telemetry.latitud,
            lng: unit.telemetry.longitud,
        };
        marker.content = buildUnitMarkerContent(unit);

        // Actualizar zIndex según el engine_state pre-resuelto por el backend.
        const isOn = unit.engine_state === "on";
        marker.zIndex = isOn ? 100 : 50;

        // Si el infoWindow está abierto en esta unidad, actualizar su contenido
        const infoWindow = infoWindowRef.current;
        if (infoWindow) {
            infoWindow.setContent(buildUnitInfoWindowContent(unit));
        }
    };

    const hideUnits = () => {
        clearUnitMarkers();
        infoWindowRef.current?.close();
    };

    return { focusUnit, showUnits, hideUnits, updateUnit };
};