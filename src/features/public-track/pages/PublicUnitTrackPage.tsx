import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Satellite, Clock, Gauge, AlertCircle } from "lucide-react";
import { loadGoogleMaps, GOOGLE_MAPS_MAP_ID } from "@/lib/loadGoogleMaps";
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

// Formatea "hace X" a partir de un ISO. Más amable que un timestamp crudo.
const tiempoRelativo = (iso: string | null): string => {
    if (!iso) return "sin datos";
    const fecha = new Date(iso);
    const segs = Math.floor((Date.now() - fecha.getTime()) / 1000);
    if (segs < 60) return "hace unos segundos";
    if (segs < 3600) return `hace ${Math.floor(segs / 60)} min`;
    if (segs < 86400) return `hace ${Math.floor(segs / 3600)} h`;
    return `hace ${Math.floor(segs / 86400)} d`;
};

export const PublicUnitTrackPage = () => {
    const { token } = useParams<{ token: string }>();

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

    const [data, setData] = useState<PublicTrackResponse | null>(null);
    const [mapReady, setMapReady] = useState(false);
    // null = cargando; "invalid" = token no válido; "error" = fallo de red.
    const [errorKind, setErrorKind] = useState<"invalid" | "error" | null>(null);
    const [loading, setLoading] = useState(true);

    // ── Inicializar el mapa una sola vez ────────────────────────────────────
    useEffect(() => {
        let cancelado = false;
        loadGoogleMaps()
            .then(() => {
                if (cancelado || !mapContainerRef.current) return;
                mapRef.current = new google.maps.Map(mapContainerRef.current, {
                    center: DEFAULT_CENTER,
                    zoom: 13,
                    disableDefaultUI: true,
                    zoomControl: true,
                    mapId: GOOGLE_MAPS_MAP_ID,
                });
                setMapReady(true);
            })
            .catch(() => {
                if (!cancelado) setErrorKind("error");
            });
        return () => {
            cancelado = true;
        };
    }, []);

    // ── Pintar / mover el marcador cuando llega una posición ────────────────
    const actualizarMarcador = useCallback((resp: PublicTrackResponse) => {
        const map = mapRef.current;
        const pos = resp.posicion;
        if (!map || !pos || pos.latitud == null || pos.longitud == null) return;

        const latLng = { lat: pos.latitud, lng: pos.longitud };

        if (!markerRef.current) {
            // Pin simple con el número de la unidad.
            const pin = new google.maps.marker.PinElement({
                glyph: resp.unidad.numero,
                background: "#1d4ed8",
                borderColor: "#1e3a8a",
                glyphColor: "#ffffff",
            });
            markerRef.current = new google.maps.marker.AdvancedMarkerElement({
                map,
                position: latLng,
                content: pin.element,
                title: resp.unidad.numero,
            });
            map.setCenter(latLng);
        } else {
            markerRef.current.position = latLng;
        }
    }, []);

    // ── Polling de la posición ──────────────────────────────────────────────
    useEffect(() => {
        if (!token || !mapReady) return;

        let activo = true;
        let timer: number | undefined;

        const cargar = async () => {
            try {
                const resp = await fetchPublicTrack(token);
                if (!activo) return;
                setData(resp);
                setErrorKind(null);
                actualizarMarcador(resp);
            } catch (e) {
                if (!activo) return;
                // Token inválido: error permanente, no reintenta.
                if (e instanceof PublicTrackError && e.notFound) {
                    setErrorKind("invalid");
                    setLoading(false);
                    return;
                }
                setErrorKind("error");
            } finally {
                if (activo) setLoading(false);
            }
            // Reagenda solo si el token sigue siendo válido.
            if (activo) timer = window.setTimeout(cargar, REFRESH_MS);
        };

        cargar();
        return () => {
            activo = false;
            if (timer) window.clearTimeout(timer);
        };
    }, [token, mapReady, actualizarMarcador]);

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
                    <Satellite className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm font-medium text-slate-700">
                    CentralGPS
                </span>
            </div>

            {/* Indicador "en vivo" arriba a la derecha */}
            {!loading && !errorKind && (
                <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs text-slate-500">en vivo</span>
                </div>
            )}

            {/* Tarjeta flotante inferior (bottom sheet) */}
            <div className="absolute inset-x-4 bottom-4 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
                {loading ? (
                    <p className="py-2 text-center text-sm text-slate-400">
                        Cargando rastreo…
                    </p>
                ) : (
                    <>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                                    <Satellite className="h-5 w-5 text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-base font-semibold text-slate-800">
                                        {data?.unidad.numero}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {data?.unidad.marca}
                                        {data?.unidad.modelo
                                            ? ` ${data.unidad.modelo}`
                                            : ""}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <div>
                                    <p className="text-[11px] text-slate-400">
                                        Última señal
                                    </p>
                                    <p className="text-sm text-slate-700">
                                        {sinSenal
                                            ? "sin datos"
                                            : tiempoRelativo(
                                                pos?.fecha_hora_gps ?? null,
                                            )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Gauge className="h-4 w-4 text-slate-400" />
                                <div>
                                    <p className="text-[11px] text-slate-400">
                                        Velocidad
                                    </p>
                                    <p className="text-sm text-slate-700">
                                        {sinSenal || pos?.velocidad == null
                                            ? "—"
                                            : `${Math.round(pos.velocidad)} km/h`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {sinSenal && (
                            <p className="mt-3 text-xs text-amber-600">
                                Esta unidad aún no ha reportado su ubicación.
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};