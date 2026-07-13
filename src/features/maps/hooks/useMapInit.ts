import { useEffect, useRef, useState } from "react";
import { buildSearchMarkerContent } from "../lib/map-markers";
import { geocodeAddressCached } from "@/lib/geocode-cache";
import {
    getOrCreateMapSingleton,
    setCachedLocation,
    DEFAULT_CENTER,
    DEFAULT_ZOOM,
    USER_LOCATION_ZOOM,
    type MapSingleton,
} from "../lib/map-singleton";

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

// Hook que inicializa el mapa y devuelve referencias a él y a su contenedor, así como funciones para interactuar con el mapa.
export const useMapInit = (): UseMapInitReturn => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const singletonRef = useRef<MapSingleton | null>(null);

    const [isTrafficVisible, setIsTrafficVisible] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const attachMap = async () => {
            const s = await getOrCreateMapSingleton();
            if (!isMounted || !containerRef.current) return;

            singletonRef.current = s;
            mapRef.current = s.map;
            infoWindowRef.current = s.infoWindow;

            //  Adjuntar el div anfitrión del mapa al contenedor de la página y disparar el evento "resize" para que Google Maps sepa que cambió de tamaño.
            containerRef.current.appendChild(s.host);
            window.google.maps.event.trigger(s.map, "resize");

            // Si el usuario ya había activado la capa de tráfico, reactivarla al volver.
            setIsTrafficVisible(s.trafficLayer.getMap() != null);
        };

        void attachMap();

        return () => {
            isMounted = false;
            // Desprender el div anfitrión del mapa para que no quede huérfano en el DOM.
            singletonRef.current?.host.remove();
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
        const s = singletonRef.current;
        if (!s) return;

        if (isTrafficVisible) {
            s.trafficLayer.setMap(null);
            setIsTrafficVisible(false);
            return;
        }
        s.trafficLayer.setMap(s.map);
        setIsTrafficVisible(true);
    };

    const searchAddress = async (address: string): Promise<void> => {
        const s = singletonRef.current;
        if (!s || !address.trim()) return;

        // Con caché: repetir la misma búsqueda no vuelve a pagar a Google.
        const result = await geocodeAddressCached(s.geocoder, address);
        if (!result) return;

        const location = { lat: result.lat, lng: result.lng };
        s.map.panTo(location);
        s.map.setZoom(16);

        // Si no hay marcador de búsqueda, crearlo; si ya existe, moverlo y re-adjuntarlo al mapa.
        if (!s.searchMarker) {
            s.searchMarker = new window.google.maps.marker.AdvancedMarkerElement({
                map: s.map,
                position: location,
                title: result.formattedAddress,
                content: buildSearchMarkerContent(),
            });
            return;
        }
        s.searchMarker.position = location;
        s.searchMarker.map = s.map;
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