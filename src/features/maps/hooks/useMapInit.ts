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
    // Centra el mapa en la ubicacion del usuario
    focusUserLocation: () => void;
    // Activa o desactiva la capa de tráfico
    toggleTraffic: () => void;
    // Busca una dirección y centra el mapa en el resultado
    searchAddress: (address: string) => Promise<void>;
    // Activa o desactiva el modo pantalla completa
    toggleFullscreen: () => void;
}

// ── Clave de caché de ubicación en localStorage ───────────────
// Persiste la última ubicación conocida del usuario entre sesiones.
// Soluciona dos problemas:
//   1. Firefox no persiste permisos de geolocalización en localhost (HTTP).
//      Al guardar la última posición, el mapa se centra inmediatamente
//      en la recarga aunque el usuario aún no haya respondido el banner.
//   2. La primera vez que se muestra el mapa hay un salto visual de
//      México → ubicación del usuario. Con el caché el mapa arranca
//      directamente en la última posición conocida.
const GEO_CACHE_KEY = "cgps_last_location";

interface CachedLocation {
    lat: number;
    lng: number;
    ts: number; // timestamp para invalidar si es muy antigua
}

const getCachedLocation = (): CachedLocation | null => {
    try {
        const raw = localStorage.getItem(GEO_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CachedLocation;
        // Invalidar si tiene más de 24 horas
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
        // localStorage puede estar bloqueado en modo privado — ignorar silenciosamente
    }
};




// ── Hook principal ────────────────────────────────────────────
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

    // ── Inicialización del mapa al montar el componente ──────────
    useEffect(() => {
        let isMounted = true;

        const initializeMap = async () => {
            await loadGoogleMaps();

            if (!containerRef.current || !window.google?.maps || !isMounted) return;

            // Si hay una ubicación cacheada (de una sesión anterior), usarla
            // como centro inicial — el mapa aparece en la posición correcta
            // desde el primer frame sin esperar al banner de permisos.
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
            // Detectar la primera interacción manual del usuario.
            // dragend cubre el panning con dedo/mouse.
            // zoom_changed cubre cuando el usuario usa controles de zoom
            // o gesto de pinch en mobile.
            // Una vez detectada, NO seguimos escuchando — el listener se
            // remueve a sí mismo para no consumir CPU innecesariamente.
            const markUserInteraction = () => {
                userHasInteractedRef.current = true;
            };
            const dragListener = map.addListener("dragend", markUserInteraction);
            const zoomListener = map.addListener(
                "zoom_changed",
                markUserInteraction,
            );

            // Limpiar listeners al desmontar para evitar memory leaks.
            // Los listeners de Google Maps NO se limpian solos al destruir
            // el mapa.
            const cleanupInteractionListeners = () => {
                window.google?.maps?.event?.removeListener(dragListener);
                window.google?.maps?.event?.removeListener(zoomListener);
            };

            // Guardar el cleanup en una closure que el useEffect ejecutará
            // al desmontar.
            mapInteractionCleanupRef.current = cleanupInteractionListeners;

            geocoderRef.current = new window.google.maps.Geocoder();
            trafficLayerRef.current = new window.google.maps.TrafficLayer();
            infoWindowRef.current = new window.google.maps.InfoWindow({
                maxWidth: 320,
                pixelOffset: new window.google.maps.Size(0, -8),
            });

            // Marker de ubicación — se crea una vez y se reposiciona
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
                    // Reposicionar el marker existente sin recrearlo
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

                        // Guardar en caché para la próxima carga — resuelve
                        // el problema de Firefox pidiendo permisos en cada
                        // recarga del navegador.
                        setCachedLocation(location.lat, location.lng);

                        // Solo centrar si el usuario NO ha interactuado con
                        // el mapa todavía. Si ya hizo pan o zoom manual, su
                        // intención es ver lo que está viendo — no la
                        // sobreescribimos.
                        if (!userHasInteractedRef.current && !cached) {
                            mapRef.current.panTo(location);
                            mapRef.current.setZoom(USER_LOCATION_ZOOM);
                        }

                        createOrMoveUserMarker(location);
                    },
                    () => {
                        // Permiso denegado o timeout — el mapa ya está
                        // visible con la ubicación cached o con el centro
                        // por defecto. No hay nada que hacer.
                    },
                    { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 },
                );
            }
        };

        void initializeMap();

        return () => {
            isMounted = false;
            // En su lugar, limpiamos los listeners del mapa.
            mapInteractionCleanupRef.current?.();
            mapInteractionCleanupRef.current = null;
        };
    }, []);

    // ── Acciones públicas ─────────────────────────────────────────

    const focusMexico = () => {
        const map = mapRef.current;
        if (!map) return;
        map.panTo(DEFAULT_CENTER);
        map.setZoom(DEFAULT_ZOOM);
    };

    const focusUserLocation = () => {
        const map = mapRef.current;
        if (!map) return;

        if (!navigator.geolocation) {
            return;
        }

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
                // Si el usuario denegó permisos antes y aquí intenta de
                // nuevo, el navegador volverá a preguntar. Si vuelve a
                // denegar, no hay nada que hacer — silenciar es mejor
                // que mostrar error porque el botón es discreto.
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
        focusUserLocation,
        toggleTraffic,
        searchAddress,
        toggleFullscreen,
    };
};