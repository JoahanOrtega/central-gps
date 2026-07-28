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
    // Callback para abrir el bottom sheet en móvil al hacer click en un marcador de unidad.
    onSelectUnitMobile?: (unit: MapUnitItem) => void;
}

const esViewportMovil = (): boolean =>
    window.matchMedia("(max-width: 767px)").matches;

// ── Hook principal ────────────────────────────────────────────────────────────
export const useMapUnits = ({
    mapRef,
    infoWindowRef,
    onSelectUnitMobile,
}: UseMapUnitsParams): UseMapUnitsReturn => {

    // Map<id_unidad, AdvancedMarkerElement> — permite actualizar sin recrear
    const unitMarkersRef = useRef<
        Map<number, google.maps.marker.AdvancedMarkerElement>
    >(new Map());

    // Unidad cuyo InfoWindow está abierto.
    const openInfoUnitIdRef = useRef<number | null>(null);

    // Firma de ids ordenados de las unidades mostradas en el mapa, para decidir si hacer fitBounds o no.
    const lastShownIdsRef = useRef<string>("");

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
            if (onSelectUnitMobile && esViewportMovil()) {
                onSelectUnitMobile(unit);
                return;
            }
            openInfoUnitIdRef.current = unit.id;
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

        // Si estamos en móvil y hay un callback para abrir el bottom sheet, lo llamamos y no abrimos el InfoWindow.
        if (onSelectUnitMobile && esViewportMovil()) {
            onSelectUnitMobile(unit);
            return;
        }

        const existing = unitMarkersRef.current.get(unit.id);
        if (existing) {
            openInfoUnitIdRef.current = unit.id;
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
        openInfoUnitIdRef.current = unit.id;
        infoWindow.open({ map, anchor: marker });
        const t = unit.telemetry;
        if (typeof t?.latitud === "number" && typeof t?.longitud === "number") {
            hydrateInfoWindowGeocode(infoWindow, t.latitud, t.longitud);
        }

    };

    // Función para mostrar un conjunto de unidades en el mapa. Actualiza los markers existentes, crea los nuevos y elimina los que ya no están en la selección. 
    // FitBounds solo ocurre si CAMBIA la selección.
    const showUnits = (units: MapUnitItem[]) => {
        const map = mapRef.current;
        const infoWindow = infoWindowRef.current;
        if (!map || !infoWindow) return;

        const validas = units.filter(
            (u) => u.telemetry?.latitud != null && u.telemetry?.longitud != null,
        );
        const idsNuevos = new Set(validas.map((u) => u.id));

        // 1) Quitar los markers que ya no están en la selección.
        unitMarkersRef.current.forEach((marker, id) => {
            if (!idsNuevos.has(id)) {
                marker.map = null;
                unitMarkersRef.current.delete(id);
                if (openInfoUnitIdRef.current === id) {
                    infoWindow.close();
                    openInfoUnitIdRef.current = null;
                }
            }
        });

        // 2) Actualizar los existentes en su lugar; crear solo los nuevos.
        const bounds = new window.google.maps.LatLngBounds();
        validas.forEach((unit) => {
            const position = {
                lat: unit.telemetry!.latitud as number,
                lng: unit.telemetry!.longitud as number,
            };
            bounds.extend(position);

            if (unitMarkersRef.current.has(unit.id)) {
                updateUnit(unit);
                return;
            }

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
        });

        // 3) FitBounds solo si CAMBIA la selección (no en cada poll, que antes
        // re-centraba el mapa y le arrebataba el control al usuario).
        const firma = [...idsNuevos].sort((a, b) => a - b).join(",");
        if (firma !== lastShownIdsRef.current) {
            lastShownIdsRef.current = firma;
            if (validas.length > 0) {
                map.fitBounds(bounds);
                // Limitar zoom igual que el legacy (evitar zoom excesivo en pocas unidades)
                const zoom = map.getZoom();
                if (typeof zoom === "number" && zoom > 17) map.setZoom(17);
            }
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

        // Si el InfoWindow de esta unidad está abierto, actualizar su contenido y geocodificación.
        const infoWindow = infoWindowRef.current;
        if (infoWindow && openInfoUnitIdRef.current === unit.id) {
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
        openInfoUnitIdRef.current = null;
        lastShownIdsRef.current = "";
    };

    return { focusUnit, showUnits, hideUnits, updateUnit };
};