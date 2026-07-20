import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, Navigation, RefreshCw } from "lucide-react";
import { loadGoogleMaps, GOOGLE_MAPS_MAP_ID } from "@/lib/loadGoogleMaps";
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

// Centro por defecto (Aguascalientes)
const DEFAULT_CENTER = { lat: 21.8853, lng: -102.2916 };

export const PublicUnitTrackPage = () => {
    const { token } = useParams<{ token: string }>();

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const yaCentroRef = useRef(false);

    const { moverA } = useSmoothMarker();

    const [data, setData] = useState<PublicTrackResponse | null>(null);
    const [mapReady, setMapReady] = useState(false);
    // null = sin error; "invalid" = token no válido; "error" = fallo de red.
    const [errorKind, setErrorKind] = useState<"invalid" | "error" | null>(null);
    const [loading, setLoading] = useState(true);
    // El mapa NO se crea hasta confirmar que el token existe y está vigente.
    // Así un enlace expirado o inventado no consume cargas de Google Maps.
    const [tokenValido, setTokenValido] = useState(false);

    // Validación previa: una sola llamada al API ANTES de tocar Google Maps.
    const validar = useCallback(async () => {
        if (!token) {
            setErrorKind("invalid");
            setLoading(false);
            return;
        }
        setLoading(true);
        setErrorKind(null);
        try {
            const resp = await fetchPublicTrack(token);
            setData(resp);
            setTokenValido(true);
        } catch (e) {
            // notFound cubre token inexistente, revocado o expirado (404 del API).
            setErrorKind(
                e instanceof PublicTrackError && e.notFound
                    ? "invalid"
                    : "error",
            );
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void validar();
    }, [validar]);

    // Inicializar Google Maps — SOLO cuando el token ya fue validado.
    useEffect(() => {
        if (!tokenValido) return;
        let cancelado = false;
        let resizeObserver: ResizeObserver | null = null;

        loadGoogleMaps()
            .then(() => {
                if (cancelado || !mapContainerRef.current || mapRef.current)
                    return;

                const map = new google.maps.Map(mapContainerRef.current, {
                    center: DEFAULT_CENTER,
                    zoom: 13,
                    disableDefaultUI: true,
                    zoomControl: true,
                    mapId: GOOGLE_MAPS_MAP_ID,
                });

                mapRef.current = map;
                google.maps.event.addListenerOnce(map, "tilesloaded", () => {
                    if (!cancelado) setMapReady(true);
                });

                resizeObserver = new ResizeObserver(() => {
                    google.maps.event.trigger(map, "resize");
                });
                resizeObserver.observe(mapContainerRef.current);
            })
            .catch(() => {
                if (!cancelado) setErrorKind("error");
            });

        return () => {
            cancelado = true;
            resizeObserver?.disconnect();
        };
    }, [tokenValido]);

    // Animar el marcador con la posición más reciente
    const actualizarMapa = useCallback(
        (resp: PublicTrackResponse) => {
            const map = mapRef.current;
            if (!map) return;

            const unit = toMapUnitItem(resp);
            if (!unit || !unit.telemetry) return;

            moverA(map, unit);

            if (!yaCentroRef.current) {
                map.setCenter({
                    lat: unit.telemetry.latitud!,
                    lng: unit.telemetry.longitud!,
                });
                yaCentroRef.current = true;
            }
        },
        [moverA],
    );

    // Polling de la posición (reusa useAutoRefresh)
    const cargar = useCallback(async () => {
        if (!token) return;
        try {
            const resp = await fetchPublicTrack(token);
            setData(resp);
            setErrorKind(null);
            actualizarMapa(resp);
        } catch (e) {
            // Token inválido (revocado/expirado a mitad de sesión): error permanente.
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
        // El primer disparo inmediato también pinta el marcador con la
        // posición que ya validamos, sin esperar los 15s.
        intervalMs: REFRESH_MS,
        enabled: tokenValido && mapReady && errorKind !== "invalid",
        immediate: true,
    });

    // Render: token inválido (pantalla de error a página completa, sin mapa)
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
                    Este enlace de rastreo expiró o fue desactivado. Solicita
                    uno nuevo a quien te lo compartió.
                </p>
            </div>
        );
    }

    // Render: fallo de red ANTES de validar (sin mapa, con acción de reintento)
    if (errorKind === "error" && !tokenValido) {
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <AlertCircle className="h-7 w-7" />
                </div>
                <h1 className="text-lg font-semibold text-slate-800">
                    No se pudo cargar el rastreo
                </h1>
                <p className="max-w-sm text-sm text-slate-500">
                    Revisa tu conexión a internet e intenta de nuevo.
                </p>
                <button
                    type="button"
                    onClick={() => void validar()}
                    className="mt-1 flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
                >
                    <RefreshCw className="h-4 w-4" />
                    Reintentar
                </button>
            </div>
        );
    }

    // Render: validando el token
    if (!tokenValido) {
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-slate-50">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500" />
                <p className="text-sm text-slate-500">Cargando rastreo…</p>
            </div>
        );
    }

    const pos = data?.posicion;
    const sinSenal = !pos || pos.latitud == null || pos.longitud == null;

    return (
        <div className="relative h-screen w-screen overflow-hidden">
            {/* Mapa de fondo */}
            <div
                ref={mapContainerRef}
                className="absolute inset-0"
                style={{ height: "100dvh", width: "100vw" }}
            />

            {/* Marca discreta arriba a la izquierda */}
            <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                    <Navigation className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm font-medium text-slate-700">
                    CentralGPS
                </span>
            </div>

            {/* Indicador "en vivo" arriba a la derecha */}
            {!loading && !errorKind && !sinSenal && (
                <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
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