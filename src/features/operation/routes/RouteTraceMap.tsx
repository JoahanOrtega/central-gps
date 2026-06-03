import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { LatLng, Parada } from "./route.types";
import { loadGoogleMaps } from "@/lib/loadGoogleMaps";

const DEFAULT_CENTER = { lat: 21.88234, lng: -102.28259 }; // Aguascalientes

// Lo que el tab puede pedirle al mapa desde fuera
export interface RouteTraceMapHandle {
    // Centra el mapa en una coordenada y hace zoom
    panTo: (position: LatLng) => void;
    // Geocodifica una dirección → coordenada + dirección formateada
    geocodeAddress: (
        address: string,
    ) => Promise<{ lat: number; lng: number; formattedAddress: string } | null>;
    // Geocodificación inversa: coordenada → dirección legible
    reverseGeocode: (lat: number, lng: number) => Promise<string | null>;
}

interface RouteTraceMapProps {
    path: LatLng[];
    paradas: Parada[];
    traceColor: string;
    // Si está activo, un click en el mapa coloca la parada pendiente
    placingMode?: boolean;
    // Se llama cuando el usuario hace click en el mapa estando en placingMode
    onMapClick?: (position: LatLng) => void;
    // Se llama cuando el usuario arrastra el marcador de una parada ya ubicada
    onParadaMoved?: (numero: number, position: LatLng) => void;
}

export const RouteTraceMap = forwardRef<RouteTraceMapHandle, RouteTraceMapProps>(
    ({ path, paradas, traceColor, placingMode = false, onMapClick, onParadaMoved }, ref) => {
        const mapRef = useRef<HTMLDivElement | null>(null);
        const mapInstanceRef = useRef<google.maps.Map | null>(null);
        const polylineRef = useRef<google.maps.Polyline | null>(null);
        const markersRef = useRef<google.maps.Marker[]>([]);
        // Un círculo por cada parada circular — dibuja su geocerca (radio)
        const circlesRef = useRef<google.maps.Circle[]>([]);
        // Un solo infoWindow reutilizado para todas las paradas
        const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
        const geocoderRef = useRef<google.maps.Geocoder | null>(null);
        const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

        // Guardamos los callbacks en refs para que el listener de click
        // siempre use la versión más reciente sin re-registrarse.
        const placingRef = useRef(placingMode);
        const onClickRef = useRef(onMapClick);
        placingRef.current = placingMode;
        onClickRef.current = onMapClick;

        // Inicializar el mapa una sola vez
        useEffect(() => {
            let cancelled = false;

            const init = async () => {
                await loadGoogleMaps();
                if (cancelled || !mapRef.current || !window.google?.maps) return;

                const map = new window.google.maps.Map(mapRef.current, {
                    center: DEFAULT_CENTER,
                    zoom: 13,
                    mapTypeControl: true,
                    streetViewControl: false,
                    fullscreenControl: true,
                });

                mapInstanceRef.current = map;
                geocoderRef.current = new window.google.maps.Geocoder();
                infoWindowRef.current = new window.google.maps.InfoWindow();

                // Click en el mapa — solo actúa si estamos en modo colocación
                clickListenerRef.current = map.addListener(
                    "click",
                    (e: google.maps.MapMouseEvent) => {
                        if (!placingRef.current || !e.latLng) return;
                        onClickRef.current?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                    },
                );

                drawRoute();
            };

            init();
            return () => {
                cancelled = true;
                clickListenerRef.current?.remove();
            };
        }, []);

        // Redibujar cuando cambie el trazo o las paradas
        useEffect(() => {
            if (mapInstanceRef.current) drawRoute();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [path, paradas, traceColor]);

        // Cambiar el cursor cuando estamos en modo colocación
        useEffect(() => {
            const map = mapInstanceRef.current;
            if (!map) return;
            map.setOptions({ draggableCursor: placingMode ? "crosshair" : null });
        }, [placingMode]);

        const drawRoute = () => {
            const map = mapInstanceRef.current;
            if (!map || !window.google?.maps) return;

            polylineRef.current?.setMap(null);
            markersRef.current.forEach((m) => m.setMap(null));
            markersRef.current = [];
            circlesRef.current.forEach((c) => c.setMap(null));
            circlesRef.current = [];
            infoWindowRef.current?.close();

            const bounds = new window.google.maps.LatLngBounds();

            // Trazo
            if (path.length > 0) {
                polylineRef.current = new window.google.maps.Polyline({
                    path,
                    geodesic: true,
                    strokeColor: traceColor,
                    strokeOpacity: 0.9,
                    strokeWeight: 4,
                    map,
                });
                path.forEach((p) => bounds.extend(p));
            }

            // Paradas marcadores numerados y arrastrables
            paradas.forEach((parada) => {
                if (parada.latitud === 0 && parada.longitud === 0) return; // sin ubicar

                const position = { lat: parada.latitud, lng: parada.longitud };
                const marker = new window.google.maps.Marker({
                    position,
                    map,
                    draggable: true,
                    label: {
                        text: String(parada.numero),
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: "bold",
                    },
                    title: parada.nombre,
                });

                // Al soltar el marcador, avisar la nueva posición
                marker.addListener("dragend", (e: google.maps.MapMouseEvent) => {
                    if (!e.latLng) return;
                    onParadaMoved?.(parada.numero, { lat: e.latLng.lat(), lng: e.latLng.lng() });
                });

                // infoWindow al hacer click — muestra nombre y dirección de la parada
                marker.addListener("click", () => {
                    const info = infoWindowRef.current;
                    if (!info) return;
                    info.setContent(`
            <div style="font-size:13px;max-width:240px">
              <strong>${parada.numero} - ${escapeHtml(parada.nombre)}</strong>
              ${parada.direccion ? `<br/><span style="color:#64748b">${escapeHtml(parada.direccion)}</span>` : ""}
            </div>
          `);
                    info.open({ map, anchor: marker });
                });

                markersRef.current.push(marker);
                bounds.extend(position);

                // Dibujar la geocerca circular de la parada (el radio)
                if (parada.tipo_geocerca === "circular" && parada.radio > 0) {
                    const circle = new window.google.maps.Circle({
                        center: position,
                        radius: parada.radio,
                        map,
                        strokeColor: "#475569",
                        strokeOpacity: 0.6,
                        strokeWeight: 1,
                        fillColor: "#94a3b8",
                        fillOpacity: 0.25,
                    });
                    circlesRef.current.push(circle);
                    // Incluir el círculo en el encuadre para que se vea completo
                    const cb = circle.getBounds();
                    if (cb) bounds.union(cb);
                }
            });

            if (!bounds.isEmpty()) map.fitBounds(bounds);
        };

        // API expuesta al tab
        useImperativeHandle(ref, () => ({
            panTo: (position: LatLng) => {
                const map = mapInstanceRef.current;
                if (!map) return;
                map.panTo(position);
                map.setZoom(17);
            },

            geocodeAddress: async (address: string) => {
                const geocoder = geocoderRef.current;
                if (!geocoder || !address.trim()) return null;
                return new Promise((resolve) => {
                    geocoder.geocode({ address }, (results, status) => {
                        if (status === "OK" && results?.[0]?.geometry.location) {
                            const loc = results[0].geometry.location;
                            resolve({
                                lat: loc.lat(),
                                lng: loc.lng(),
                                formattedAddress: results[0].formatted_address,
                            });
                            return;
                        }
                        resolve(null);
                    });
                });
            },

            reverseGeocode: async (lat: number, lng: number) => {
                const geocoder = geocoderRef.current;
                if (!geocoder) return null;
                return new Promise((resolve) => {
                    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                        resolve(status === "OK" && results?.[0] ? results[0].formatted_address : null);
                    });
                });
            },
        }));

        return (
            <div className="space-y-2">
                {placingMode && (
                    <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-700">
                        Haz click en el mapa para ubicar la parada, o arrastra su marcador para ajustarla.
                    </div>
                )}
                <div
                    ref={mapRef}
                    className="h-[420px] w-full rounded-lg"
                    role="application"
                    aria-label="Mapa del trazo de la ruta"
                />
            </div>
        );
    },
);

RouteTraceMap.displayName = "RouteTraceMap";

// Escapa caracteres especiales para insertar texto seguro en el HTML del infoWindow
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}