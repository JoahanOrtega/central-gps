import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/loadGoogleMaps";
import { buildSearchMarkerContent } from "../lib/map-markers";

// ── Constantes de posición inicial ────────────────────────────
const DEFAULT_CENTER = { lat: 23.6345, lng: -102.5528 };
const DEFAULT_ZOOM = 5;
const USER_LOCATION_ZOOM = 16;

// ── Interfaz pública del hook ─────────────────────────────────
export interface UseMapInitReturn {
    // Ref del contenedor DOM donde se monta el mapa
    containerRef: React.RefObject<HTMLDivElement | null>;
    // Ref del mapa — accesible para los demás hooks
    mapRef: React.RefObject<google.maps.Map | null>;
    // Ref del InfoWindow compartido entre todos los hooks
    infoWindowRef: React.RefObject<google.maps.InfoWindow | null>;
    // Indica si la capa de tráfico está visible
    isTrafficVisible: boolean;
    // Centra el mapa en México con zoom nacional
    focusMexico: () => void;
    // Activa o desactiva la capa de tráfico
    toggleTraffic: () => void;
    // Busca una dirección y centra el mapa en el resultado
    searchAddress: (address: string) => Promise<void>;
    // Activa o desactiva el modo pantalla completa
    toggleFullscreen: () => void;
}

// ── Obtiene la ubicación del navegador como promesa ───────────
const getBrowserLocation = (): Promise<{ lat: number; lng: number }> =>
    new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("La geolocalización no está disponible"));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            }),
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
        );
    });

// ── Hook principal ────────────────────────────────────────────
export const useMapInit = (): UseMapInitReturn => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);
    const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const searchMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

    const [isTrafficVisible, setIsTrafficVisible] = useState(false);

    // ── Inicialización del mapa al montar el componente ──────────
    useEffect(() => {
        let isMounted = true;

        const initializeMap = async () => {
            await loadGoogleMaps();

            if (!containerRef.current || !window.google?.maps || !isMounted) return;

            // Intentar centrar en la ubicación del usuario.
            // Si falla (permiso denegado, timeout, etc.) usar el centro de México.
            let initialCenter = DEFAULT_CENTER;
            let initialZoom = DEFAULT_ZOOM;
            let hasUserLocation = false;

            try {
                const userLocation = await getBrowserLocation();
                initialCenter = userLocation;
                initialZoom = USER_LOCATION_ZOOM;
                hasUserLocation = true;
            } catch {
                initialCenter = DEFAULT_CENTER;
                initialZoom = DEFAULT_ZOOM;
            }

            if (!isMounted) return;

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
            geocoderRef.current = new window.google.maps.Geocoder();
            trafficLayerRef.current = new window.google.maps.TrafficLayer();
            infoWindowRef.current = new window.google.maps.InfoWindow();

            // Marker azul en la posición del usuario si se obtuvo la ubicación
            if (hasUserLocation) {
                const userMarkerContent = document.createElement("div");
                userMarkerContent.style.width = "18px";
                userMarkerContent.style.height = "18px";
                userMarkerContent.style.borderRadius = "9999px";
                userMarkerContent.style.background = "#2563eb";
                userMarkerContent.style.border = "3px solid white";
                userMarkerContent.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";

                new window.google.maps.marker.AdvancedMarkerElement({
                    map,
                    position: initialCenter,
                    title: "Mi ubicación",
                    content: userMarkerContent,
                });
            }
        };

        void initializeMap();

        return () => { isMounted = false; };
    }, []);

    // ── Acciones públicas ─────────────────────────────────────────

    const focusMexico = () => {
        const map = mapRef.current;
        if (!map) return;
        map.panTo(DEFAULT_CENTER);
        map.setZoom(DEFAULT_ZOOM);
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

        // Reutilizar el marker si ya existe, o crear uno nuevo
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
        toggleTraffic,
        searchAddress,
        toggleFullscreen,
    };
};