import { useEffect, useRef } from "react";
import type { MapUnitItem } from "../types/map.types";
import { buildUnitMarkerContent } from "../lib/map-markers";
import { buildUnitInfoWindowContent } from "../lib/map-html-builders";
import { hydrateInfoWindowGeocode } from "../lib/infowindow-geocode";


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

    // Efecto de limpieza al desmontar el hook, para que no queden markers huérfanos en el mapa.
    useEffect(() => () => clearUnitMarkers(), []);

    // Asocia listeners comunes a un marker de unidad.
    const attachUnitMarkerListeners = (
        marker: google.maps.marker.AdvancedMarkerElement,
        unit: MapUnitItem,
    ) => {
        const map = mapRef.current!;
        const infoWindow = infoWindowRef.current!;

        marker.addListener("gmp-click", () => {
            infoWindow.setContent(buildUnitInfoWindowContent(unit));
            infoWindow.open({ map, anchor: marker });
            const t = unit.telemetry;
            if (typeof t?.latitud === "number" && typeof t?.longitud === "number") {
                hydrateInfoWindowGeocode(infoWindow, t.latitud, t.longitud);
            }

        });
    };


    // Función para centrar el mapa en una unidad y abrir su InfoWindow. Si la unidad no tiene telemetría, no hace nada.
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
            infoWindow.setContent(buildUnitInfoWindowContent(unit));
            infoWindow.open({ map, anchor: existing });
            const t = unit.telemetry;
            if (typeof t?.latitud === "number" && typeof t?.longitud === "number") {
                hydrateInfoWindowGeocode(infoWindow, t.latitud, t.longitud);
            }
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
        const t = unit.telemetry;
        if (typeof t?.latitud === "number" && typeof t?.longitud === "number") {
            hydrateInfoWindowGeocode(infoWindow, t.latitud, t.longitud);
        }

    };

    // Muestra un conjunto de unidades en el mapa, centrando y ajustando zoom a sus posiciones.
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

            // Marcar la primera interacción manual para no reposicionar el mapa
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

    // Actualiza la posición y contenido de un marker existente sin recrearlo.
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
            const t = unit.telemetry;
            if (typeof t?.latitud === "number" && typeof t?.longitud === "number") {
                hydrateInfoWindowGeocode(infoWindow, t.latitud, t.longitud);
            }
        }
    };

    const hideUnits = () => {
        clearUnitMarkers();
        infoWindowRef.current?.close();
    };

    return { focusUnit, showUnits, hideUnits, updateUnit };
};