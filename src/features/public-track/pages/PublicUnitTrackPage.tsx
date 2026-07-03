import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, Navigation } from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useAutoRefresh } from "@/features/maps/hooks/useAutoRefresh";
import { PublicTrackCard } from "../components/PublicTrackCard";
import { useSmoothMarker } from "../hooks/useSmoothMarker";
import { toMapUnitItem } from "../lib/public-track-adapter";
import {
    fetchPublicTrack,
    PublicTrackError,
    type PublicTrackResponse,
} from "../publicTrackService";

// Cada cuántos ms se refresca la posición. 15s equilibra frescura y carga;
// igual al intervalo del worker de geocercas del backend.
const REFRESH_MS = 15000;

// Centro por defecto (Aguascalientes) mientras no hay posición.
const DEFAULT_CENTER = { lat: 21.8853, lng: -102.2916 };

export const PublicUnitTrackPage = () => {
    const { token } = useParams<{ token: string }>();

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const yaCentroRef = useRef(false);

    const { moverA } = useSmoothMarker();

    const [data, setData] = useState<PublicTrackResponse | null>(null);
    const [mapReady, setMapReady] = useState(false);
    // null = cargando; "invalid" = token no válido; "error" = fallo de red.
    const [errorKind, setErrorKind] = useState<"invalid" | "error" | null>(null);
    const [loading, setLoading] = useState(true);

    // Inicializar el mapa y el marcador (solo una vez, al montar el componente).
    useEffect(() => {
        if (!mapContainerRef.current) return;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: {
                version: 8,
                sources: {
                    osm: {
                        type: "raster",
                        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                        tileSize: 256,
                        attribution: "© OpenStreetMap contributors",
                    },
                },
                layers: [{ id: "osm", type: "raster", source: "osm" }],
            },
            // OJO: MapLibre usa orden [lng, lat] — al revés que Google Maps.
            center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
            zoom: 13,
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }));

        map.on("load", () => setMapReady(true));
        map.on("error", () => setErrorKind("error"));
        mapRef.current = map;

        // Ajustar el mapa si cambia el tamaño del contenedor (p. ej. rotación de pantalla).
        const resizeObserver = new ResizeObserver(() => map.resize());
        resizeObserver.observe(mapContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // ── Pintar / animar el marcador (el hook se encarga del movimiento) ─────
    const actualizarMapa = useCallback(
        (resp: PublicTrackResponse) => {
            const map = mapRef.current;
            if (!map) return;

            // Reusamos buildUnitMarkerContent (vía el hook) para que la unidad se
            // vea idéntica al mapa interno, y el hook la desliza suave entre
            // reportes en vez de saltar.
            const unit = toMapUnitItem(resp);
            if (!unit || !unit.telemetry) return;

            moverA(map, unit);

            // Centrar solo la primera vez, para no pelear con el usuario si está
            // explorando el mapa.
            if (!yaCentroRef.current) {
                map.setCenter([unit.telemetry.longitud!, unit.telemetry.latitud!]);
                yaCentroRef.current = true;
            }
        },
        [moverA],
    );

    // ── Polling de la posición (reusa useAutoRefresh) ───────────────────────
    const cargar = useCallback(async () => {
        if (!token) return;
        try {
            const resp = await fetchPublicTrack(token);
            setData(resp);
            setErrorKind(null);
            actualizarMapa(resp);
        } catch (e) {
            // Token inválido: error permanente.
            if (e instanceof PublicTrackError && e.notFound) {
                setErrorKind("invalid");
                return;
            }
            setErrorKind("error");
        } finally {
            setLoading(false);
        }
    }, [token, actualizarMapa]);

    useAutoRefresh({
        callback: cargar,
        intervalMs: REFRESH_MS,
        // Pausa mientras el mapa no está listo o si el token ya resultó inválido.
        enabled: mapReady && errorKind !== "invalid",
        immediate: true,
    });

    // ── Render: token inválido (pantalla de error a página completa) ────────
    if (errorKind === "invalid") {
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <AlertCircle className="h-7 w-7" />
                </div>
                <h1 className="text-lg font-semibold text-slate-800">
                    Enlace no disponible
                </h1>
                <p className="max-w-sm text-sm text-slate-500">
                    Este enlace de rastreo no es válido o fue desactivado.
                    Solicita uno nuevo a quien te lo compartió.
                </p>
            </div>
        );
    }

    const pos = data?.posicion;
    const sinSenal = !pos || pos.latitud == null || pos.longitud == null;

    return (
        <div className="relative h-screen w-screen overflow-hidden">
            {/* Mapa de fondo */}
            <div ref={mapContainerRef} className="absolute inset-0" />

            {/* Marca discreta arriba a la izquierda */}
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                    <Navigation className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm font-medium text-slate-700">
                    CentralGPS
                </span>
            </div>

            {/* Indicador "en vivo" arriba a la derecha */}
            {!loading && !errorKind && !sinSenal && (
                <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium text-slate-600">
                        en vivo
                    </span>
                </div>
            )}

            {/* Tarjeta flotante inferior */}
            <PublicTrackCard data={data} loading={loading} />
        </div>
    );
};