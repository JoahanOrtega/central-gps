import { useRef } from "react";
import type { MapUnitItem } from "../types/map.types";
import { buildUnitMarkerContent } from "../lib/map-markers";
import { buildUnitInfoWindowContent } from "../lib/map-html-builders";

// ── Interfaz pública del hook ─────────────────────────────────
export interface UseMapUnitsReturn {
    // Centra el mapa en una unidad y abre su InfoWindow
    focusUnit: (unit: MapUnitItem) => void;
    // Muestra una lista de unidades y ajusta el zoom para verlas todas
    showUnits: (units: MapUnitItem[]) => void;
    // Oculta todos los markers de unidades
    hideUnits: () => void;
}

// ── Parámetros que recibe el hook ─────────────────────────────
interface UseMapUnitsParams {
    mapRef: React.RefObject<google.maps.Map | null>;
    infoWindowRef: React.RefObject<google.maps.InfoWindow | null>;
}

// ── Hook principal ────────────────────────────────────────────
export const useMapUnits = ({
    mapRef,
    infoWindowRef,
}: UseMapUnitsParams): UseMapUnitsReturn => {

    // Colección de markers activos indexados por id de unidad
    const unitMarkersRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());

    // ── Helper de limpieza ────────────────────────────────────────
    const clearUnitMarkers = () => {
        unitMarkersRef.current.forEach((marker) => { marker.map = null; });
        unitMarkersRef.current.clear();
    };

    // ── Acciones públicas ─────────────────────────────────────────

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

        // Si el marker ya existe reutilizarlo, si no crear uno nuevo
        const existingMarker = unitMarkersRef.current.get(unit.id);

        if (existingMarker) {
            infoWindow.setContent(buildUnitInfoWindowContent(unit));
            infoWindow.open({ map, anchor: existingMarker });
            return;
        }

        const marker = new window.google.maps.marker.AdvancedMarkerElement({
            map,
            position,
            title: unit.numero,
            content: buildUnitMarkerContent(unit),
        });

        marker.addListener("click", () => {
            infoWindow.setContent(buildUnitInfoWindowContent(unit));
            infoWindow.open({ map, anchor: marker });
        });

        unitMarkersRef.current.set(unit.id, marker);
        infoWindow.setContent(buildUnitInfoWindowContent(unit));
        infoWindow.open({ map, anchor: marker });
    };

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

            const marker = new window.google.maps.marker.AdvancedMarkerElement({
                map,
                position,
                title: unit.numero,
                content: buildUnitMarkerContent(unit),
            });

            marker.addListener("click", () => {
                infoWindow.setContent(buildUnitInfoWindowContent(unit));
                infoWindow.open({ map, anchor: marker });
            });

            unitMarkersRef.current.set(unit.id, marker);
            bounds.extend(position);
            hasValidPoints = true;
        });

        if (hasValidPoints) {
            map.fitBounds(bounds);
            const zoom = map.getZoom();
            if (typeof zoom === "number" && zoom > 17) map.setZoom(17);
        }
    };

    const hideUnits = () => {
        clearUnitMarkers();
        infoWindowRef.current?.close();
    };

    return { focusUnit, showUnits, hideUnits };
};