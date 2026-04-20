import { useRef } from "react";
import type { MapPoiItem } from "../types/map.types";
import { buildPoiMarkerContent } from "../lib/map-markers";
import {
    buildPoiInfoWindowContent,
} from "../lib/map-html-builders";

// ── Interfaz pública del hook ─────────────────────────────────
export interface UseMapPoisReturn {
    // Centra el mapa en un POI y abre su InfoWindow
    focusPoi: (poi: MapPoiItem) => void;
    // Muestra una lista de POIs con sus geometrías y ajusta el zoom
    showPois: (pois: MapPoiItem[]) => void;
    // Oculta todos los markers, geometrías e InfoWindows de POIs
    hidePois: () => void;
}

// ── Parámetros que recibe el hook ─────────────────────────────
interface UseMapPoisParams {
    mapRef: React.RefObject<google.maps.Map | null>;
    infoWindowRef: React.RefObject<google.maps.InfoWindow | null>;
}

// ── Parsea el path de un polígono desde JSON ──────────────────
const parsePolygonPath = (polygonPath: string): google.maps.LatLngLiteral[] => {
    try {
        const parsed = JSON.parse(polygonPath);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

// ── Hook principal ────────────────────────────────────────────
export const useMapPois = ({
    mapRef,
    infoWindowRef,
}: UseMapPoisParams): UseMapPoisReturn => {

    // Colecciones de elementos activos en el mapa indexadas por id_poi
    const poiMarkersRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());
    const poiCirclesRef = useRef<Map<number, google.maps.Circle>>(new Map());
    const poiPolygonsRef = useRef<Map<number, google.maps.Polygon>>(new Map());

    // ── Helpers de limpieza ───────────────────────────────────────

    const clearPoisMarkers = () => {
        poiMarkersRef.current.forEach((marker) => { marker.map = null; });
        poiMarkersRef.current.clear();
    };

    const clearPoiGeometry = () => {
        poiCirclesRef.current.forEach((circle) => circle.setMap(null));
        poiCirclesRef.current.clear();
        poiPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
        poiPolygonsRef.current.clear();
    };

    // ── Dibuja la geometría de un POI (círculo o polígono) ────────
    const drawSinglePoiGeometry = (poi: MapPoiItem) => {
        const map = mapRef.current;
        if (!map || poi.lat === null || poi.lng === null) return;

        // tipo_poi 1 → círculo de radio
        if (poi.tipo_poi === 1) {
            const existingCircle = poiCirclesRef.current.get(poi.id_poi);
            if (existingCircle) {
                existingCircle.setMap(null);
                poiCirclesRef.current.delete(poi.id_poi);
            }

            const circle = new window.google.maps.Circle({
                map,
                center: { lat: poi.lat, lng: poi.lng },
                radius: poi.radio || 50,
                fillColor: poi.radio_color || "#5e6383",
                fillOpacity: 0.2,
                strokeColor: poi.radio_color || "#5e6383",
                strokeOpacity: 0.9,
                strokeWeight: 2,
            });

            poiCirclesRef.current.set(poi.id_poi, circle);
            return;
        }

        // tipo_poi 2 → polígono
        if (poi.tipo_poi === 2) {
            const points = parsePolygonPath(poi.polygon_path);
            if (points.length < 3) return;

            const existingPolygon = poiPolygonsRef.current.get(poi.id_poi);
            if (existingPolygon) {
                existingPolygon.setMap(null);
                poiPolygonsRef.current.delete(poi.id_poi);
            }

            const polygon = new window.google.maps.Polygon({
                map,
                paths: points,
                fillColor: poi.polygon_color || "#5e6383",
                fillOpacity: 0.2,
                strokeColor: poi.polygon_color || "#5e6383",
                strokeOpacity: 0.9,
                strokeWeight: 2,
            });

            poiPolygonsRef.current.set(poi.id_poi, polygon);
        }
    };

    // ── Acciones públicas ─────────────────────────────────────────

    const focusPoi = (poi: MapPoiItem) => {
        const map = mapRef.current;
        const infoWindow = infoWindowRef.current;
        if (!map || !infoWindow) return;
        if (poi.lat === null || poi.lng === null) return;

        const position = { lat: poi.lat, lng: poi.lng };
        map.panTo(position);
        map.setZoom(17);

        // Si el marker ya existe reutilizarlo, si no crear uno nuevo
        const existingMarker = poiMarkersRef.current.get(poi.id_poi);

        if (existingMarker) {
            infoWindow.setContent(buildPoiInfoWindowContent(poi));
            infoWindow.open({ map, anchor: existingMarker });
            return;
        }

        const marker = new window.google.maps.marker.AdvancedMarkerElement({
            map,
            position,
            title: poi.nombre,
            content: buildPoiMarkerContent(),
        });

        marker.addListener("gmp-click", () => {
            infoWindow.setContent(buildPoiInfoWindowContent(poi));
            infoWindow.open({ map, anchor: marker });
        });

        poiMarkersRef.current.set(poi.id_poi, marker);
        infoWindow.setContent(buildPoiInfoWindowContent(poi));
        infoWindow.open({ map, anchor: marker });
    };

    const showPois = (pois: MapPoiItem[]) => {
        const map = mapRef.current;
        const infoWindow = infoWindowRef.current;
        if (!map || !infoWindow) return;

        clearPoisMarkers();
        clearPoiGeometry();

        const bounds = new window.google.maps.LatLngBounds();
        let hasValidPoints = false;

        pois.forEach((poi) => {
            if (poi.lat === null || poi.lng === null) return;

            const position = { lat: poi.lat, lng: poi.lng };

            const marker = new window.google.maps.marker.AdvancedMarkerElement({
                map,
                position,
                title: poi.nombre,
                content: buildPoiMarkerContent(),
            });

            marker.addListener("gmp-click", () => {
                infoWindow.setContent(buildPoiInfoWindowContent(poi));
                infoWindow.open({ map, anchor: marker });
            });

            poiMarkersRef.current.set(poi.id_poi, marker);
            bounds.extend(position);
            hasValidPoints = true;
        });

        // Dibujar círculos y polígonos de todos los POIs
        pois.forEach(drawSinglePoiGeometry);

        if (hasValidPoints) {
            map.fitBounds(bounds);
            const zoom = map.getZoom();
            if (typeof zoom === "number" && zoom > 17) map.setZoom(17);
        }
    };

    const hidePois = () => {
        clearPoisMarkers();
        clearPoiGeometry();
        infoWindowRef.current?.close();
    };

    return { focusPoi, showPois, hidePois };
};