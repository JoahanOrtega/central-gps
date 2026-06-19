import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/loadGoogleMaps";
import { buildSearchMarkerContent } from "../lib/map-markers";

// Centro por defecto: ciudad de Aguascalientes, donde opera la flota.
const DEFAULT_CENTER = { lat: 21.8853, lng: -102.2916 };
const DEFAULT_ZOOM = 12;
const USER_LOCATION_ZOOM = 16;

export interface UseMapInitReturn {
    containerRef: React.RefObject<HTMLDivElement | null>;
    mapRef: React.RefObject<google.maps.Map | null>;
    infoWindowRef: React.RefObject<google.maps.InfoWindow | null>;
    isTrafficVisible: boolean;
    focusMexico: () => void;
    focusUserLocation: () => void;
    toggleTraffic: () => void;
    searchAddress: (address: string) => Promise<void>;
    toggleFullscreen: () => void;
}

// Última ubicación conocida en localStorage. Firefox no persiste el permiso de
// geolocalización en localhost (HTTP), así que sin esto el mapa pediría permiso
// y haría el salto visual en cada recarga.
const GEO_CACHE_KEY = "cgps_last_location";

interface CachedLocation {
    lat: number;
    lng: number;
    ts: number;
}

const getCachedLocation = (): CachedLocation | null => {
    try {
        const raw = localStorage.getItem(GEO_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CachedLocation;
        if (Date.now() - parsed.ts > 24 * 60 * 60 * 1000) {
            localStorage.removeItem(GEO_CACHE_KEY);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
};

const setCachedLocation = (lat: number, lng: number) => {
    try {
        const payload: CachedLocation = { lat, lng, ts: Date.now() };
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(payload));
    } catch {
        // localStorage bloqueado en modo privado.
    }
};

export const useMapInit = (): UseMapInitReturn => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);
    const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const searchMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const userHasInteractedRef = useRef(false);
    const mapInteractionCleanupRef = useRef<(() => void) | null>(null);

    const [isTrafficVisible, setIsTrafficVisible] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const initializeMap = async () => {
            await loadGoogleMaps();

            if (!containerRef.current || !window.google?.maps || !isMounted) return;

            // Arrancar en la ubicación cacheada si existe, para evitar el salto
            // visual mientras el navegador resuelve la geolocalización.
            const cached = getCachedLocation();
            const initialCenter = cached
                ? { lat: cached.lat, lng: cached.lng }
                : DEFAULT_CENTER;
            const initialZoom = cached ? USER_LOCATION_ZOOM : DEFAULT_ZOOM;

            const map = new window.google.maps.Map(containerRef.current, {
                center: initialCenter,
                zoom: initialZoom,
                gestureHandling: "greedy",
                zoomControl: true,
                fullscreenControl: false,
                streetViewControl: false,
                mapTypeControl: true,
                mapTypeControlOptions: {
                    style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                },
                mapTypeId: "roadmap",
                mapId: "DEMO_MAP_ID",
            });

            mapRef.current = map;

            // Marcar la primera interacción manual para no reposicionar el mapa
            // por debajo del usuario. El listener se autoremueve tras dispararse.
            const markUserInteraction = () => {
                userHasInteractedRef.current = true;
            };
            const dragListener = map.addListener("dragend", markUserInteraction);
            const zoomListener = map.addListener("zoom_changed", markUserInteraction);

            // Los listeners de Google Maps no se limpian solos al destruir el mapa.
            const cleanupInteractionListeners = () => {
                window.google?.maps?.event?.removeListener(dragListener);
                window.google?.maps?.event?.removeListener(zoomListener);
            };
            mapInteractionCleanupRef.current = cleanupInteractionListeners;

            geocoderRef.current = new window.google.maps.Geocoder();
            trafficLayerRef.current = new window.google.maps.TrafficLayer();
            infoWindowRef.current = new window.google.maps.InfoWindow({
                maxWidth: 320,
                pixelOffset: new window.google.maps.Size(0, -8),
            });

            let userMarker: google.maps.marker.AdvancedMarkerElement | null = null;

            const createOrMoveUserMarker = (position: { lat: number; lng: number }) => {
                if (!mapRef.current) return;

                if (!userMarker) {
                    const dot = document.createElement("div");
                    dot.style.width = "18px";
                    dot.style.height = "18px";
                    dot.style.borderRadius = "9999px";
                    dot.style.background = "#2563eb";
                    dot.style.border = "3px solid white";
                    dot.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";

                    userMarker = new window.google.maps.marker.AdvancedMarkerElement({
                        map: mapRef.current,
                        position,
                        title: "Mi ubicación",
                        content: dot,
                    });
                } else {
                    userMarker.position = position;
                }
            };

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        if (!isMounted || !mapRef.current) return;

                        const location = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };

                        setCachedLocation(location.lat, location.lng);

                        // No reposicionar si el usuario ya movió el mapa o si ya
                        // arrancó en la ubicación cacheada.
                        if (!userHasInteractedRef.current && !cached) {
                            mapRef.current.panTo(location);
                            mapRef.current.setZoom(USER_LOCATION_ZOOM);
                        }

                        createOrMoveUserMarker(location);
                    },
                    () => {
                        // Permiso denegado o timeout: el mapa ya está en el centro
                        // por defecto, no hay nada que hacer.
                    },
                    { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 },
                );
            }
        };

        void initializeMap();

        return () => {
            isMounted = false;
            mapInteractionCleanupRef.current?.();
            mapInteractionCleanupRef.current = null;
        };
    }, []);

    const focusMexico = () => {
        const map = mapRef.current;
        if (!map) return;
        map.panTo(DEFAULT_CENTER);
        map.setZoom(DEFAULT_ZOOM);
    };

    const focusUserLocation = () => {
        const map = mapRef.current;
        if (!map || !navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                if (!mapRef.current) return;
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                mapRef.current.panTo(location);
                mapRef.current.setZoom(USER_LOCATION_ZOOM);
                setCachedLocation(location.lat, location.lng);
            },
            () => {
                // Permiso denegado: silenciar, el botón es discreto.
            },
            { enableHighAccuracy: true, timeout: 5000 },
        );
    };

    const toggleTraffic = () => {
        const map = mapRef.current;
        const trafficLayer = trafficLayerRef.current;
        if (!map || !trafficLayer) return;

        if (isTrafficVisible) {
            trafficLayer.setMap(null);
            setIsTrafficVisible(false);
            return;
        }

        trafficLayer.setMap(map);
        setIsTrafficVisible(true);
    };

    const searchAddress = async (address: string): Promise<void> => {
        const map = mapRef.current;
        const geocoder = geocoderRef.current;
        if (!map || !geocoder || !address.trim()) return;

        const result = await new Promise<google.maps.GeocoderResult | null>((resolve) => {
            geocoder.geocode({ address }, (results, status) => {
                if (status === "OK" && results && results.length > 0) {
                    resolve(results[0]);
                    return;
                }
                resolve(null);
            });
        });

        if (!result?.geometry.location) return;

        const location = result.geometry.location;
        map.panTo(location);
        map.setZoom(16);

        if (!searchMarkerRef.current) {
            searchMarkerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
                map,
                position: location,
                title: result.formatted_address,
                content: buildSearchMarkerContent(),
            });
            return;
        }

        searchMarkerRef.current.position = location;
        searchMarkerRef.current.map = map;
    };

    const toggleFullscreen = () => {
        const element = containerRef.current;
        if (!element) return;

        if (!document.fullscreenElement) {
            void element.requestFullscreen();
            return;
        }
        void document.exitFullscreen();
    };

    return {
        containerRef,
        mapRef,
        infoWindowRef,
        isTrafficVisible,
        focusMexico,
        focusUserLocation,
        toggleTraffic,
        searchAddress,
        toggleFullscreen,
    };
};