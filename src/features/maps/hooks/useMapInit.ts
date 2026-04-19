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

    const [isTrafficVisible, setIsTrafficVisible] = useState(false);

    // ── Inicialización del mapa al montar el componente ──────────
    useEffect(() => {
        let isMounted = true;
        let watchId: number | null = null;

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
            geocoderRef.current = new window.google.maps.Geocoder();
            trafficLayerRef.current = new window.google.maps.TrafficLayer();
            infoWindowRef.current = new window.google.maps.InfoWindow();

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

            // Solicitar ubicación en segundo plano — no bloquea el render del mapa.
            // watchPosition actualiza la posición continuamente, lo que resuelve
            // el problema de "no actualiza al instante": en cuanto el navegador
            // tiene la ubicación (aunque tarde 1-2s), el mapa se mueve solo.
            if (navigator.geolocation) {
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        if (!isMounted || !mapRef.current) return;

                        const location = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };

                        // Guardar en caché para la próxima carga — resuelve el
                        // problema de Firefox pidiendo permisos en cada recarga
                        setCachedLocation(location.lat, location.lng);

                        // Solo mover el mapa si el usuario no lo ha movido manualmente.
                        // Si el zoom es el de ciudad (≥ 14) y no hay cached previa,
                        // es la primera ubicación — centrar el mapa.
                        if (!cached) {
                            mapRef.current.panTo(location);
                            mapRef.current.setZoom(USER_LOCATION_ZOOM);
                        }

                        createOrMoveUserMarker(location);
                    },
                    () => {
                        // Permiso denegado — el mapa ya está visible,
                        // no hay nada que hacer.
                    },
                    { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 },
                );
            }
        };

        void initializeMap();

        return () => {
            isMounted = false;
            // Cancelar el watcher al desmontar para evitar memory leaks
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
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