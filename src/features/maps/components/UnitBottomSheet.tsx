import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, ExternalLink, MapPin, Power, Gauge, X } from "lucide-react";
import { formatElapsedTimeFromApiDate, parseApiDate } from "@/lib/date-time";
import { reverseGeocodeCached } from "@/lib/geocode-cache";
import {
    getEngineStateLabel,
    getTelemetryStatusMeta,
    getSpeedTextColor,
} from "../lib/telemetry-status";
import type { MapUnitItem } from "../types/map.types";

interface UnitBottomSheetProps {
    unit: MapUnitItem | null;
    onClose: () => void;
}

// Formatea segundos como "3h 47m" / "45m" / "9d 17h" para el "desde hace".
const formatSegundos = (segundos: number | null | undefined): string => {
    if (segundos == null || segundos < 0) return "";
    const d = Math.floor(segundos / 86400);
    const h = Math.floor((segundos % 86400) / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const formatFechaCorta = (iso?: string | null): string => {
    const fecha = parseApiDate(iso);
    if (!fecha) return "";
    return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(fecha);
};

// Fila icono + etiqueta + valor. El valor NUNCA se trunca: hace wrap las
// líneas que necesite — el motivo de existir de este sheet (el InfoWindow
// anclado recortaba el texto contra el borde del viewport).
const FilaDato = ({
    icono,
    etiqueta,
    children,
}: {
    icono: React.ReactNode;
    etiqueta: string;
    children: React.ReactNode;
}) => (
    <div className="flex items-start gap-3 py-3">
        <span className="mt-0.5 shrink-0 text-slate-300">{icono}</span>
        <span className="w-20 shrink-0 pt-px text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {etiqueta}
        </span>
        <div className="min-w-0 flex-1 text-right text-sm text-slate-700">
            {children}
        </div>
    </div>
);

/**
 * Bottom sheet con el detalle de una unidad — SOLO móvil.
 */
export const UnitBottomSheet = ({ unit, onClose }: UnitBottomSheetProps) => {
    const [direccion, setDireccion] = useState<string | null>(null);
    // Arrastre del asa: translateY en vivo mientras el dedo baja.
    const [dragY, setDragY] = useState(0);
    const touchStartY = useRef<number | null>(null);
    // Geocoder perezoso: el script de Google Maps ya está cargado si el
    // usuario pudo tocar un marcador; se crea una sola vez por montaje.
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);

    const t = unit?.telemetry;

    // Reverse geocode con la caché compartida (mismo costo cero que el
    // InfoWindow de desktop cuando la coordenada ya se resolvió antes).
    useEffect(() => {
        setDireccion(null);
        if (t?.latitud == null || t?.longitud == null) return;
        let cancelado = false;
        geocoderRef.current ??= new google.maps.Geocoder();
        reverseGeocodeCached(geocoderRef.current, t.latitud, t.longitud).then(
            (res) => {
                if (!cancelado)
                    setDireccion(res ?? "Dirección no disponible");
            },
        );
        return () => {
            cancelado = true;
        };
    }, [t?.latitud, t?.longitud]);

    // Evita que el body haga scroll mientras el sheet está abierto. El
    // portal a document.body lo hace independiente de la jerarquía del layout
    // (overflow:hidden en un ancestro no recorta el sheet), pero el body
    // sigue pudiendo scrollearse.
    useEffect(() => {
        if (!unit) return;
        const previo = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previo;
        };
    }, [unit]);

    if (!unit) return null;


    const meta = getTelemetryStatusMeta(
        t?.engine_state,
        t?.velocidad,
        t?.segundos,
        t?.segundos_sistema,
        unit.vel_max,
    );
    const desdeHace = formatSegundos(t?.segundos_en_estado_actual);
    const esSinReporte = meta.mapState === "sin-reporte";
    // Muda: el tiempo del chip es el del silencio (último dato), no el del
    // estado motor — cada número junto a su pregunta.
    const tiempoChip = esSinReporte
        ? formatSegundos(t?.segundos)
        : desdeHace;
    const nombre = [unit.marca, unit.modelo].filter(Boolean).join(" ");
    const enMovimiento =
        meta.engineState === "on" && Math.round(t?.velocidad ?? 0) >= 1;
    const urlGoogleMaps =
        t?.latitud != null && t?.longitud != null
            ? `https://www.google.com/maps?q=${t.latitud},${t.longitud}`
            : null;

    // Deslizar hacia abajo > 80px cierra; menos, regresa a su lugar.
    const onTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: React.TouchEvent) => {
        if (touchStartY.current == null) return;
        const delta = e.touches[0].clientY - touchStartY.current;
        setDragY(Math.max(0, delta));
    };
    const onTouchEnd = () => {
        if (dragY > 80) onClose();
        setDragY(0);
        touchStartY.current = null;
    };

    // Portal a document.body: position:fixed dentro de un ancestro con
    // transform u overflow-hidden (los contenedores animados del layout)
    // se ancla a ESE ancestro en vez del viewport y el sheet queda
    // recortado o invisible. El portal lo hace inmune a la jerarquía.
    return createPortal(
        <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop: fixed inset-0 — el canvas de Google Maps se traga
                los mousedown, este patrón es la lección del proyecto */}
            <button
                type="button"
                aria-label="Cerrar detalle"
                onClick={onClose}
                className="absolute inset-0 bg-black/25"
            />

            <div
                role="dialog"
                aria-label={`Detalle de la unidad ${unit.numero ?? ""}`}
                className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white pb-[max(env(safe-area-inset-bottom),14px)] shadow-[0_-12px_40px_rgba(15,23,42,0.18)] transition-transform duration-200 ease-out"
                style={{ transform: `translateY(${dragY}px)` }}
            >
                {/* Asa de arrastre */}
                <div
                    className="flex cursor-grab justify-center pb-2 pt-3"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    <div className="h-1 w-10 rounded-full bg-slate-200" />
                </div>

                {/* Header: eco del marcador (círculo número+color) + chip de estado */}
                <div className="flex items-center gap-3 px-5 pb-3">
                    <span
                        aria-hidden
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ring-2 ring-white"
                        style={{ backgroundColor: meta.fillColor }}
                    >
                        {unit.numero}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold capitalize text-slate-800">
                            {nombre || `Unidad ${unit.numero}`}
                        </p>
                        <span
                            className="mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                                backgroundColor: `${meta.fillColor}1A`,
                                color: meta.fillColor,
                            }}
                        >
                            <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: meta.fillColor }}
                            />
                            {meta.label}
                            {tiempoChip && (
                                <span className="opacity-70">
                                    · {tiempoChip}
                                </span>
                            )}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="mx-5 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/50 px-4">
                    {enMovimiento && (
                        <FilaDato
                            icono={<Gauge className="h-4 w-4" />}
                            etiqueta="Velocidad"
                        >
                            <span
                                className="text-base font-semibold tabular-nums"
                                style={{
                                    color: getSpeedTextColor(
                                        t?.velocidad ?? 0,
                                        unit.vel_max ?? 0,
                                    ),
                                }}
                            >
                                {Math.round(t?.velocidad ?? 0)} km/h
                            </span>
                        </FilaDato>
                    )}

                    <FilaDato
                        icono={<Power className="h-4 w-4" />}
                        etiqueta={esSinReporte ? "Motor" : "Estado"}
                    >
                        <span className="font-medium">
                            {esSinReporte
                                ? getEngineStateLabel(meta.engineState)
                                : meta.label}
                        </span>
                        {desdeHace && (
                            <span className="block text-xs text-slate-400">
                                desde hace {desdeHace}
                            </span>
                        )}
                    </FilaDato>

                    <FilaDato
                        icono={<Clock className="h-4 w-4" />}
                        etiqueta="Reporte"
                    >
                        <span className="font-medium">
                            hace{" "}
                            {formatElapsedTimeFromApiDate(t?.fecha_hora_gps)}
                        </span>
                        <span className="block text-xs text-slate-400">
                            {formatFechaCorta(t?.fecha_hora_gps)}
                        </span>
                    </FilaDato>

                    <FilaDato
                        icono={<MapPin className="h-4 w-4" />}
                        etiqueta="Ubicación"
                    >
                        {direccion === null ? (
                            <span className="animate-pulse text-slate-400">
                                Obteniendo dirección…
                            </span>
                        ) : (
                            <span className="break-words leading-relaxed">
                                {direccion}
                            </span>
                        )}
                    </FilaDato>
                </div>

                {urlGoogleMaps && (
                    <div className="px-5 pt-4">
                        <a
                            href={urlGoogleMaps}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-sky-500 text-sm font-semibold text-white shadow-sm shadow-sky-200 active:bg-sky-600"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Ver en Google Maps
                        </a>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
};