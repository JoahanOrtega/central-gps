import { loadGoogleMaps, GOOGLE_MAPS_MAP_ID } from "@/lib/loadGoogleMaps";

// Constantes de configuración del mapa. El centro por defecto es la ciudad de aguascalientes, México.
const DEFAULT_CENTER = { lat: 21.8853, lng: -102.2916 };
const DEFAULT_ZOOM = 12;
const USER_LOCATION_ZOOM = 16;

// Cache de la última ubicación conocida del usuario, para evitar saltos visuales al cargar el mapa.
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

export const setCachedLocation = (lat: number, lng: number) => {
    try {
        const payload: CachedLocation = { lat, lng, ts: Date.now() };
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(payload));
    } catch {
        // localStorage bloqueado en modo privado.
    }
};

export interface MapSingleton {
    // El div anfitrión del mapa. Se adjunta/desprende del contenedor de React.
    host: HTMLDivElement;
    map: google.maps.Map;
    geocoder: google.maps.Geocoder;
    trafficLayer: google.maps.TrafficLayer;
    infoWindow: google.maps.InfoWindow;
    // El marcador de búsqueda vive aquí para no quedar huérfano entre visitas
    // (si viviera en el hook, al volver se crearía uno nuevo encima del viejo).
    searchMarker: google.maps.marker.AdvancedMarkerElement | null;
}

let instancia: MapSingleton | null = null;
let creando: Promise<MapSingleton> | null = null;

// Devuelve la instancia singleton del mapa, creándola si no existe. 
// La primera vez que se llama, carga la API de Google Maps y crea el mapa en un div oculto. 
// Las llamadas posteriores devuelven la misma instancia.
export const getOrCreateMapSingleton = (): Promise<MapSingleton> => {
    if (instancia) return Promise.resolve(instancia);
    if (creando) return creando;

    creando = (async (): Promise<MapSingleton> => {
        await loadGoogleMaps();

        const host = document.createElement("div");
        host.style.width = "100%";
        host.style.height = "100%";

        // Arrancar en la ubicación cacheada (si existe) evita el salto visual
        // mientras el navegador resuelve la geolocalización.
        const cached = getCachedLocation();
        const initialCenter = cached
            ? { lat: cached.lat, lng: cached.lng }
            : DEFAULT_CENTER;
        const initialZoom = cached ? USER_LOCATION_ZOOM : DEFAULT_ZOOM;

        const map = new window.google.maps.Map(host, {
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
            mapId: GOOGLE_MAPS_MAP_ID,
        });

        // Listeners para detectar si el usuario ha interactuado con el mapa, para no re-centrar su ubicación si ya lo hizo.
        let userHasInteracted = false;
        map.addListener("dragend", () => { userHasInteracted = true; });
        map.addListener("zoom_changed", () => { userHasInteracted = true; });

        const geocoder = new window.google.maps.Geocoder();
        const trafficLayer = new window.google.maps.TrafficLayer();
        const infoWindow = new window.google.maps.InfoWindow({
            maxWidth: 320,
            pixelOffset: new window.google.maps.Size(0, -8),
        });

        // Intentar obtener la ubicación del usuario y centrar el mapa en ella. Si no se puede, se queda en la ubicación por defecto.
        let userMarker: google.maps.marker.AdvancedMarkerElement | null = null;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setCachedLocation(location.lat, location.lng);

                    if (!userHasInteracted && !cached) {
                        map.panTo(location);
                        map.setZoom(USER_LOCATION_ZOOM);
                    }

                    if (!userMarker) {
                        const dot = document.createElement("div");
                        dot.style.width = "18px";
                        dot.style.height = "18px";
                        dot.style.borderRadius = "9999px";
                        dot.style.background = "#2563eb";
                        dot.style.border = "3px solid white";
                        dot.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
                        userMarker = new window.google.maps.marker.AdvancedMarkerElement({
                            map,
                            position: location,
                            title: "Mi ubicación",
                            content: dot,
                        });
                    } else {
                        userMarker.position = location;
                    }
                },
                () => {
                    // Permiso denegado o timeout: el mapa ya está centrado por
                    // defecto, no hay nada que hacer.
                },
                { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 },
            );
        }

        instancia = { host, map, geocoder, trafficLayer, infoWindow, searchMarker: null };
        creando = null;
        return instancia;
    })();

    return creando;
};

export { DEFAULT_CENTER, DEFAULT_ZOOM, USER_LOCATION_ZOOM };