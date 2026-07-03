import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Maximize2 } from "lucide-react";
import type { LatLng, Parada } from "../types/route.types";
import { geocodeAddressCached, reverseGeocodeCached } from "@/lib/geocode-cache";
import { loadGoogleMaps } from "@/lib/loadGoogleMaps";

const DEFAULT_CENTER = { lat: 21.88234, lng: -102.28259 }; // Aguascalientes

// Resultado de generar un trazo automáticamente
export interface GenerateTraceResult {
    path: LatLng[];
    distanceKm: number;
}

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
    // Genera el trazo de la ruta conectando las paradas por carretera (API de Directions).
    generateTrace: (
        stops: LatLng[],
    ) => Promise<GenerateTraceResult | null>;
    // Ajusta el mapa para mostrar todas las paradas y el trazo en pantalla
    fitAll: () => void;
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
    // Se llama cuando el usuario edita los vértices de una geocerca poligonal
    onParadaPolygonChanged?: (numero: number, vertices: LatLng[]) => void;
}

export const RouteTraceMap = forwardRef<RouteTraceMapHandle, RouteTraceMapProps>(
    ({ path, paradas, traceColor, placingMode = false, onMapClick, onParadaMoved, onParadaPolygonChanged }, ref) => {
        const mapRef = useRef<HTMLDivElement | null>(null);
        const mapInstanceRef = useRef<google.maps.Map | null>(null);
        const polylineRef = useRef<google.maps.Polyline | null>(null);
        const markersRef = useRef<google.maps.Marker[]>([]);
        // Un círculo por cada parada circular — dibuja su geocerca (radio)
        const circlesRef = useRef<google.maps.Circle[]>([]);
        // Un polígono por cada parada poligonal/rectangular — dibuja su geocerca
        const polygonsRef = useRef<google.maps.Polygon[]>([]);
        // Un solo infoWindow reutilizado para todas las paradas
        const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
        const geocoderRef = useRef<google.maps.Geocoder | null>(null);
        const directionsRef = useRef<google.maps.DirectionsService | null>(null);
        const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

        // Guardamos los callbacks en refs para que el listener de click
        // siempre use la versión más reciente sin re-registrarse.
        const placingRef = useRef(placingMode);
        const onClickRef = useRef(onMapClick);
        const onPolygonChangedRef = useRef(onParadaPolygonChanged);
        placingRef.current = placingMode;
        onClickRef.current = onMapClick;
        onPolygonChangedRef.current = onParadaPolygonChanged;

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
                    mapTypeControlOptions: {
                        // Mover el toggle Mapa/Satélite a la derecha para dejar
                        // libre la esquina superior izquierda al botón Ajustar vista
                        position: window.google.maps.ControlPosition.TOP_RIGHT,
                    },
                    streetViewControl: false,
                    fullscreenControl: true,
                });

                mapInstanceRef.current = map;
                geocoderRef.current = new window.google.maps.Geocoder();
                directionsRef.current = new window.google.maps.DirectionsService();
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
            polygonsRef.current.forEach((pg) => pg.setMap(null));
            polygonsRef.current = [];
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

                // Dibujar la geocerca poligonal/rectangular (editable)
                if (
                    (parada.tipo_geocerca === "poligonal" || parada.tipo_geocerca === "rectangular") &&
                    parada.poligono &&
                    parada.poligono.length >= 3
                ) {
                    const polygon = new window.google.maps.Polygon({
                        paths: parada.poligono,
                        map,
                        strokeColor: "#475569",
                        strokeOpacity: 0.7,
                        strokeWeight: 2,
                        fillColor: "#94a3b8",
                        fillOpacity: 0.25,
                        editable: true,   // el usuario puede arrastrar los vértices
                        draggable: false, // pero no mover todo el polígono
                    });

                    // Reportar los cambios cuando el usuario edita los vértices
                    const reportarCambio = () => {
                        const ruta = polygon.getPath();
                        const vertices: LatLng[] = [];
                        for (let i = 0; i < ruta.getLength(); i++) {
                            const punto = ruta.getAt(i);
                            vertices.push({ lat: punto.lat(), lng: punto.lng() });
                        }
                        onPolygonChangedRef.current?.(parada.numero, vertices);
                    };
                    polygon.getPath().addListener("set_at", reportarCambio);
                    polygon.getPath().addListener("insert_at", reportarCambio);
                    polygon.getPath().addListener("remove_at", reportarCambio);

                    polygonsRef.current.push(polygon);
                    parada.poligono.forEach((v) => bounds.extend(v));
                }
            });

            if (!bounds.isEmpty()) map.fitBounds(bounds);
        };

        // Ajusta el zoom para mostrar todas las paradas y el trazo.
        // La usan tanto el botón flotante como el método fitAll del handle.
        const fitToContent = () => {
            const map = mapInstanceRef.current;
            if (!map || !window.google?.maps) return;
            const bounds = new window.google.maps.LatLngBounds();
            path.forEach((p) => bounds.extend(p));
            paradas
                .filter((p) => p.latitud !== 0 && p.longitud !== 0)
                .forEach((p) => bounds.extend({ lat: p.latitud, lng: p.longitud }));
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
                // Con caché: la misma dirección no se vuelve a pagar a Google.
                return geocodeAddressCached(geocoder, address);
            },

            reverseGeocode: async (lat: number, lng: number) => {
                const geocoder = geocoderRef.current;
                if (!geocoder) return null;
                return reverseGeocodeCached(geocoder, lat, lng);
            },

            fitAll: () => fitToContent(),

            generateTrace: async (stops) => {
                if (stops.length < 2) return null;

                // ── API de Directions: genera el trazo siguiendo las calles ──
                const service = directionsRef.current;
                if (!service || !window.google?.maps) return null;

                // Google Directions solo permite hasta 25 puntos (origen + destino + 23 waypoints) por petición.
                const MAX_POINTS = 25;
                const fullPath: LatLng[] = [];
                let totalMeters = 0;

                for (let start = 0; start < stops.length - 1; start += MAX_POINTS - 1) {
                    const chunk = stops.slice(start, start + MAX_POINTS);
                    if (chunk.length < 2) break;

                    const origin = chunk[0];
                    const destination = chunk[chunk.length - 1];
                    const waypoints = chunk.slice(1, -1).map((s) => ({
                        location: new window.google.maps.LatLng(s.lat, s.lng),
                        stopover: true,
                    }));

                    const result = await new Promise<google.maps.DirectionsResult | null>((resolve) => {
                        service.route(
                            {
                                origin: new window.google.maps.LatLng(origin.lat, origin.lng),
                                destination: new window.google.maps.LatLng(destination.lat, destination.lng),
                                waypoints,
                                travelMode: window.google.maps.TravelMode.DRIVING,
                            },
                            (res, status) => resolve(status === "OK" ? res : null),
                        );
                    });

                    // Si un segmento falla, devolvemos null para que el tab avise
                    if (!result?.routes[0]) return null;

                    result.routes[0].legs.forEach((leg) => {
                        totalMeters += leg.distance?.value ?? 0;
                        leg.steps.forEach((step) => {
                            step.path.forEach((p) => fullPath.push({ lat: p.lat(), lng: p.lng() }));
                        });
                    });
                }

                return { path: fullPath, distanceKm: totalMeters / 1000 };
            },
        }));

        return (
            <div className="space-y-2">
                {placingMode && (
                    <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-700">
                        Haz click en el mapa para ubicar la parada, o arrastra su marcador para ajustarla.
                    </div>
                )}
                <div className="relative">
                    <div
                        ref={mapRef}
                        className="h-[420px] w-full rounded-lg"
                        role="application"
                        aria-label="Mapa del trazo de la ruta"
                    />
                    {/* Botón flotante para encuadrar la ruta — sobre el mapa,
                        esquina superior izquierda (Google deja ese espacio libre) */}
                    {(path.length > 0 || paradas.some((p) => p.latitud !== 0)) && (
                        <button
                            type="button"
                            onClick={fitToContent}
                            title="Ver toda la ruta en pantalla"
                            className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur hover:bg-white"
                        >
                            <Maximize2 className="h-3.5 w-3.5" />
                            Ajustar vista
                        </button>
                    )}
                </div>
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