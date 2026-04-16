import { useRef } from "react";
import type { RoutePoint } from "../types/map.types";
import { createRouteFlagMarker } from "../lib/map-markers";
import {
    buildRouteArrowInfoWindowContent,
    type RouteArrowMarkerData,
} from "../lib/map-html-builders";
import { haversineKm, getHeadingBetweenPoints } from "../lib/map-geometry";

// ── Interfaz pública del hook ─────────────────────────────────
export interface UseMapRouteReturn {
    // Dibuja el recorrido completo en el mapa y ajusta el zoom
    showUnitRoute: (points: RoutePoint[], unitLabel?: string) => void;
    // Elimina el recorrido y todos sus elementos del mapa
    hideUnitRoute: () => void;
    // Muestra u oculta la línea del recorrido
    setRouteVisible: (visible: boolean) => void;
    // Muestra u oculta los markers de inicio y fin
    setRouteStartEndVisible: (visible: boolean) => void;
    // Muestra u oculta las flechas de dirección sobre el recorrido
    setRouteDirectionVisible: (visible: boolean) => void;
}

// ── Parámetros que recibe el hook ─────────────────────────────
interface UseMapRouteParams {
    mapRef: React.RefObject<google.maps.Map | null>;
    infoWindowRef: React.RefObject<google.maps.InfoWindow | null>;
}

// ── Calcula la distancia acumulada desde el inicio hasta el punto N ──
const calculateDistanceFromStart = (
    points: RoutePoint[],
    index: number,
): number => {
    let distanceKm = 0;
    for (let i = 1; i <= index; i += 1) {
        distanceKm += haversineKm(
            points[i - 1].latitud,
            points[i - 1].longitud,
            points[i].latitud,
            points[i].longitud,
        );
    }
    return Number(distanceKm.toFixed(2));
};

// ── Hook principal ────────────────────────────────────────────
export const useMapRoute = ({
    mapRef,
    infoWindowRef,
}: UseMapRouteParams): UseMapRouteReturn => {

    // ── Refs de elementos activos del recorrido ───────────────────
    const unitRoutePolylineRef = useRef<google.maps.Polyline | null>(null);
    const routeStartMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const routeEndMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const routeDirectionMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

    // ── Refs de estado del recorrido activo ───────────────────────
    const currentRoutePointsRef = useRef<RoutePoint[]>([]);
    const currentRouteUnitLabelRef = useRef<string | null>(null);

    // ── Refs de visibilidad — controlan qué capas se muestran ────
    const routeVisibleRef = useRef(true);
    const routeStartEndVisibleRef = useRef(true);
    const routeDirectionVisibleRef = useRef(false);

    // ── Helpers de limpieza ───────────────────────────────────────

    const clearRouteStartEndMarkers = () => {
        if (routeStartMarkerRef.current) {
            routeStartMarkerRef.current.map = null;
            routeStartMarkerRef.current = null;
        }
        if (routeEndMarkerRef.current) {
            routeEndMarkerRef.current.map = null;
            routeEndMarkerRef.current = null;
        }
    };

    const clearRouteDirectionMarkers = () => {
        routeDirectionMarkersRef.current.forEach((marker) => { marker.map = null; });
        routeDirectionMarkersRef.current = [];
    };

    // ── Dibuja los markers de inicio y fin del recorrido ─────────
    const drawRouteStartEndMarkers = (points: RoutePoint[]) => {
        const map = mapRef.current;
        if (!map || points.length === 0) return;

        clearRouteStartEndMarkers();

        const first = points[0];
        const last = points[points.length - 1];

        routeStartMarkerRef.current = createRouteFlagMarker(
            map,
            { lat: first.latitud, lng: first.longitud },
            "I",
            "#16a34a",
        );

        routeEndMarkerRef.current = createRouteFlagMarker(
            map,
            { lat: last.latitud, lng: last.longitud },
            "F",
            "#6b7280",
        );
    };

    // ── Dibuja las flechas de dirección sobre cada punto ─────────
    const drawRouteDirectionMarkers = (points: RoutePoint[]) => {
        const map = mapRef.current;
        const infoWindow = infoWindowRef.current;
        if (!map || !infoWindow || points.length === 0) return;

        clearRouteDirectionMarkers();

        points.forEach((point, index) => {
            // Calcular el ángulo de la flecha según el punto siguiente o anterior
            let heading = 0;
            if (points.length === 1) {
                heading = point.grados ?? 0;
            } else if (index < points.length - 1) {
                heading = getHeadingBetweenPoints(
                    { lat: point.latitud, lng: point.longitud },
                    { lat: points[index + 1].latitud, lng: points[index + 1].longitud },
                );
            } else {
                heading = getHeadingBetweenPoints(
                    { lat: points[index - 1].latitud, lng: points[index - 1].longitud },
                    { lat: point.latitud, lng: point.longitud },
                );
            }

            // Color de la flecha según el estado de movimiento del punto
            const movementState = point.movement_state || "desconocido";
            const colorMap: Record<string, string> = {
                movimiento: "#16a34a",
                stop: "#6b7280",
                apagado: "#dc2626",
            };
            const color = colorMap[movementState] ?? "#374151";

            const element = document.createElement("div");
            element.style.width = "18px";
            element.style.height = "18px";
            element.style.display = "flex";
            element.style.alignItems = "center";
            element.style.justifyContent = "center";
            element.style.transform = `rotate(${heading}deg)`;
            element.style.fontSize = "14px";
            element.style.fontWeight = "700";
            element.style.lineHeight = "1";
            element.style.cursor = "pointer";
            element.style.textShadow = "0 0 2px white";
            element.style.color = color;
            element.innerHTML = "⮝";

            const markerData: RouteArrowMarkerData = {
                point,
                index,
                heading,
                distanceFromStartKm: calculateDistanceFromStart(points, index),
            };

            const marker = new window.google.maps.marker.AdvancedMarkerElement({
                map,
                position: { lat: point.latitud, lng: point.longitud },
                content: element,
                title: `Registro ${index + 1}`,
                zIndex: 10,
            });

            marker.addListener("click", () => {
                infoWindow.setContent(
                    buildRouteArrowInfoWindowContent(
                        currentRouteUnitLabelRef.current,
                        markerData,
                    ),
                );
                infoWindow.open({ map, anchor: marker });
            });

            routeDirectionMarkersRef.current.push(marker);
        });
    };

    // ── Sincroniza la visibilidad de todas las capas del recorrido ─
    // Se llama cada vez que cambia cualquier flag de visibilidad.
    const syncRouteOverlays = () => {
        const map = mapRef.current;
        const points = currentRoutePointsRef.current;

        // Mostrar u ocultar el polyline según routeVisibleRef
        if (unitRoutePolylineRef.current) {
            unitRoutePolylineRef.current.setMap(
                routeVisibleRef.current ? map : null,
            );
        }

        // Limpiar siempre antes de redibujar para evitar duplicados
        clearRouteStartEndMarkers();
        clearRouteDirectionMarkers();

        if (!routeVisibleRef.current || !map || points.length === 0) return;

        if (routeStartEndVisibleRef.current) {
            drawRouteStartEndMarkers(points);
        }

        if (routeDirectionVisibleRef.current) {
            drawRouteDirectionMarkers(points);
        }
    };

    // ── Acciones públicas ─────────────────────────────────────────

    const showUnitRoute = (points: RoutePoint[], unitLabel?: string) => {
        const map = mapRef.current;
        if (!map || points.length === 0) return;

        hideUnitRoute();

        currentRoutePointsRef.current = points;
        currentRouteUnitLabelRef.current = unitLabel ?? null;

        const path = points.map((point) => ({
            lat: point.latitud,
            lng: point.longitud,
        }));

        unitRoutePolylineRef.current = new window.google.maps.Polyline({
            path,
            strokeColor: "#22c55e",
            strokeOpacity: 1,
            strokeWeight: 4,
            geodesic: false,
            map: routeVisibleRef.current ? map : null,
        });

        const bounds = new window.google.maps.LatLngBounds();
        path.forEach((point) => bounds.extend(point));
        map.fitBounds(bounds);

        syncRouteOverlays();
    };

    const hideUnitRoute = () => {
        if (unitRoutePolylineRef.current) {
            unitRoutePolylineRef.current.setMap(null);
            unitRoutePolylineRef.current = null;
        }

        currentRoutePointsRef.current = [];
        currentRouteUnitLabelRef.current = null;
        clearRouteStartEndMarkers();
        clearRouteDirectionMarkers();
        infoWindowRef.current?.close();
    };

    const setRouteVisible = (visible: boolean) => {
        routeVisibleRef.current = visible;
        syncRouteOverlays();
    };

    const setRouteStartEndVisible = (visible: boolean) => {
        routeStartEndVisibleRef.current = visible;
        syncRouteOverlays();
    };

    const setRouteDirectionVisible = (visible: boolean) => {
        routeDirectionVisibleRef.current = visible;
        syncRouteOverlays();
    };

    return {
        showUnitRoute,
        hideUnitRoute,
        setRouteVisible,
        setRouteStartEndVisible,
        setRouteDirectionVisible,
    };
};