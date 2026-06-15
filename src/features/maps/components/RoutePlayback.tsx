// ══════════════════════════════════════════════════════════════════════════════
// RoutePlayback.tsx — Reproducción animada de un recorrido sobre el mapa
// ══════════════════════════════════════════════════════════════════════════════
//
// Capa independiente del dibujo estático de useMapRoute. Se monta cuando el
// usuario activa el modo playback y maneja TODO lo suyo:
//   - El marcador de la unidad que avanza por la ruta (Pieza 2)
//   - El "trail": polyline que se va pintando detrás del marcador (Pieza 2)
//   - Los controles flotantes: play/pausa, scrubber, velocidad (Pieza 3)
//
// Por qué capa aparte y no dentro de useMapRoute:
// useMapRoute usa solo refs (sin estado React, sin re-renders). El playback
// SÍ necesita estado reactivo (posición que cambia cada frame, progreso para
// el scrubber). Aislarlo evita contaminar useMapRoute con re-renders y mantiene
// cada responsabilidad en su lugar.
//
// El marcador y el trail son propios — NO tocan los markers/polylines que
// dibuja useMapRoute. Al desmontarse, limpia lo suyo y deja el recorrido
// estático intacto.
// ══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import { Play, Pause, X } from "lucide-react";
import type { RoutePoint } from "../types/map.types";
import { usePlayback, PLAYBACK_SPEEDS } from "../hooks/usePlayback";
import { formatCalendar } from "@/lib/date-time";

interface RoutePlaybackProps {
    /** Instancia del mapa (compartida con useMapRoute vía mapRef). */
    map: google.maps.Map | null;
    /** Puntos del recorrido activo. */
    points: RoutePoint[];
    /** Cierra el modo playback (desmonta el componente). */
    onClose: () => void;
}

// Color del trail — distinto al polyline estático para no confundirse.
const TRAIL_COLOR = "#2563eb";

export const RoutePlayback = ({ map, points, onClose }: RoutePlaybackProps) => {
    const {
        isPlaying,
        progress,
        speed,
        position,
        currentIndex,
        toggle,
        seek,
        setSpeed,
    } = usePlayback(points);

    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const trailRef = useRef<google.maps.Polyline | null>(null);

    // ── Crear marcador y trail al montar; limpiarlos al desmontar ─────────────
    useEffect(() => {
        if (!map || points.length === 0) return;

        // Contenido del marcador: un chevron que rota según el rumbo.
        const el = document.createElement("div");
        el.style.cssText =
            "width:28px;height:28px;display:flex;align-items:center;justify-content:center;" +
            "background:" + TRAIL_COLOR + ";border:2px solid #fff;border-radius:50%;" +
            "box-shadow:0 1px 4px rgba(0,0,0,0.4);transition:transform 0.1s linear;";
        el.innerHTML =
            '<span style="color:#fff;font-size:16px;line-height:1;">\u25B2</span>';

        markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
            map,
            position: { lat: points[0].latitud, lng: points[0].longitud },
            content: el,
            zIndex: 100, // por encima de los markers de eventos
        });

        trailRef.current = new window.google.maps.Polyline({
            map,
            path: [{ lat: points[0].latitud, lng: points[0].longitud }],
            strokeColor: TRAIL_COLOR,
            strokeOpacity: 0.9,
            strokeWeight: 5,
            zIndex: 50,
        });

        return () => {
            markerRef.current && (markerRef.current.map = null);
            markerRef.current = null;
            trailRef.current?.setMap(null);
            trailRef.current = null;
        };
    }, [map, points]);

    // ── Mover el marcador y extender el trail en cada cambio de posición ──────
    useEffect(() => {
        if (!position || !markerRef.current || !trailRef.current) return;

        // Mover marcador
        markerRef.current.position = { lat: position.lat, lng: position.lng };

        // Rotar el chevron según el rumbo (el ▲ apunta al norte = 0°)
        const content = markerRef.current.content as HTMLElement | null;
        const arrow = content?.querySelector("span");
        if (arrow) {
            (arrow as HTMLElement).style.transform = `rotate(${position.heading}deg)`;
        }

        // Extender el trail: reconstruir el path hasta el índice actual + la
        // posición interpolada de la "cabeza". Reconstruir (en vez de push) es
        // correcto al hacer seek hacia atrás, y con unos miles de puntos el
        // costo es despreciable.
        const path: google.maps.LatLngLiteral[] = [];
        for (let i = 0; i <= currentIndex && i < points.length; i++) {
            path.push({ lat: points[i].latitud, lng: points[i].longitud });
        }
        path.push({ lat: position.lat, lng: position.lng });
        trailRef.current.setPath(path);
    }, [position, currentIndex, points]);

    if (!map || points.length < 2) return null;

    const pct = Math.round(progress * 100);

    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
            <div className="pointer-events-auto w-full max-w-md rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
                {/* Encabezado */}
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">
                        Reproducir recorrido
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar reproducción"
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Play + scrubber */}
                <div className="mb-2 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={toggle}
                        aria-label={isPlaying ? "Pausar" : "Reproducir"}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"
                    >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={pct}
                        onChange={(e) => seek(Number(e.target.value) / 100)}
                        aria-label="Posición del recorrido"
                        className="h-1.5 flex-1 cursor-pointer accent-blue-600"
                    />
                </div>

                {/* Velocidad + lectura en vivo */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">Velocidad</span>
                        {PLAYBACK_SPEEDS.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setSpeed(s)}
                                className={`rounded-md border px-2 py-0.5 text-xs transition-colors ${
                                    speed === s
                                        ? "border-blue-500 bg-blue-600 text-white"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                {s}×
                            </button>
                        ))}
                    </div>
                    {position && (
                        <span className="text-xs text-slate-500">
                            {formatCalendar(position.fechaHoraGps)} ·{" "}
                            {Math.round(position.velocidad)} km/h
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};