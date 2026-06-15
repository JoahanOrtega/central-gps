import { useCallback, useEffect, useRef, useState } from "react";
import type { RoutePoint } from "../types/map.types";
import {
    interpolateLatLng,
    getHeadingBetweenPoints,
} from "../lib/map-geometry";

// Multiplicadores de velocidad disponibles en los controles.
export const PLAYBACK_SPEEDS = [1, 4, 8] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

// Tope de tiempo simulado por frame: durante una parada larga (ej. 5 min entre
// pings), sin tope el marcador quedaría inmóvil minutos reales aun a 8×. Con
// este tope, los gaps largos se recorren en tiempo acotado sin perder la
// sensación de "pausa". 30 s de tiempo real simulado por frame es buen balance.
const MAX_SIM_MS_PER_FRAME = 30_000;

export interface PlaybackPosition {
    lat: number;
    lng: number;
    /** Rumbo en grados (0-360) para rotar el marcador. */
    heading: number;
    /** Velocidad del punto actual (km/h), para la lectura en vivo. */
    velocidad: number;
    /** Hora GPS del punto actual (ISO string), para la lectura en vivo. */
    fechaHoraGps: string;
}

export interface UsePlaybackResult {
    isPlaying: boolean;
    /** Progreso 0-1 a lo largo del recorrido (para el scrubber). */
    progress: number;
    speed: PlaybackSpeed;
    /** Posición interpolada actual, o null si no hay recorrido. */
    position: PlaybackPosition | null;
    /** Índice del último punto ya recorrido (para pintar el trail). */
    currentIndex: number;
    play: () => void;
    pause: () => void;
    toggle: () => void;
    /** Salta a una fracción 0-1 del recorrido (scrubber arrastrado). */
    seek: (progress: number) => void;
    setSpeed: (speed: PlaybackSpeed) => void;
    /** Reinicia al punto de inicio y pausa. */
    reset: () => void;
}

/**
 * Calcula los timestamps acumulados (ms desde el inicio) de cada punto.
 * Se memoiza por referencia de `points` para no recalcular cada frame.
 */
const buildTimeline = (points: RoutePoint[]): number[] => {
    const times: number[] = [];
    if (points.length === 0) return times;
    const t0 = new Date(points[0].fecha_hora_gps).getTime();
    for (const p of points) {
        times.push(new Date(p.fecha_hora_gps).getTime() - t0);
    }
    return times;
};

export const usePlayback = (points: RoutePoint[]): UsePlaybackResult => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeedState] = useState<PlaybackSpeed>(4);
    const [position, setPosition] = useState<PlaybackPosition | null>(null);
    const [progress, setProgress] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Tiempo simulado transcurrido (ms desde el inicio del recorrido).
    const elapsedMsRef = useRef(0);
    // Línea de tiempo acumulada de los puntos.
    const timelineRef = useRef<number[]>([]);
    // Timestamp del frame anterior (para calcular el delta real).
    const lastFrameRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);
    const speedRef = useRef<PlaybackSpeed>(speed);

    // Mantener speedRef sincronizado para leerlo dentro del rAF sin re-suscribir.
    useEffect(() => {
        speedRef.current = speed;
    }, [speed]);

    // Reconstruir timeline y resetear cuando cambia el recorrido.
    useEffect(() => {
        timelineRef.current = buildTimeline(points);
        elapsedMsRef.current = 0;
        lastFrameRef.current = null;
        setProgress(0);
        setCurrentIndex(0);
        setIsPlaying(false);
        setPosition(
            points.length > 0
                ? {
                    lat: points[0].latitud,
                    lng: points[0].longitud,
                    heading: points[0].grados ?? 0,
                    velocidad: points[0].velocidad ?? 0,
                    fechaHoraGps: points[0].fecha_hora_gps,
                }
                : null,
        );
    }, [points]);

    /**
     * Calcula la posición interpolada para un tiempo simulado dado y
     * actualiza el estado expuesto (posición, progreso, índice).
     */
    const applyElapsed = useCallback(
        (elapsedMs: number) => {
            const timeline = timelineRef.current;
            if (timeline.length < 2) return;

            const totalMs = timeline[timeline.length - 1];
            const clamped = Math.max(0, Math.min(elapsedMs, totalMs));

            // Buscar el segmento [i, i+1] que contiene `clamped`.
            let i = 0;
            while (i < timeline.length - 1 && timeline[i + 1] <= clamped) {
                i++;
            }
            const segStart = timeline[i];
            const segEnd = timeline[i + 1] ?? segStart;
            const segDur = segEnd - segStart;
            const t = segDur > 0 ? (clamped - segStart) / segDur : 0;

            const pA = points[i];
            const pB = points[i + 1] ?? pA;
            const interp = interpolateLatLng(
                { lat: pA.latitud, lng: pA.longitud },
                { lat: pB.latitud, lng: pB.longitud },
                t,
            );

            // Rumbo: preferir el grados del AVL; si es 0/ausente, calcularlo
            // del segmento (útil cuando el dispositivo no reporta dirección).
            const heading =
                pA.grados && pA.grados > 0
                    ? pA.grados
                    : getHeadingBetweenPoints(
                        { lat: pA.latitud, lng: pA.longitud },
                        { lat: pB.latitud, lng: pB.longitud },
                    );

            setPosition({
                lat: interp.lat,
                lng: interp.lng,
                heading,
                velocidad: pA.velocidad ?? 0,
                fechaHoraGps: pA.fecha_hora_gps,
            });
            setCurrentIndex(i);
            setProgress(totalMs > 0 ? clamped / totalMs : 0);

            // ¿Llegó al final?
            if (clamped >= totalMs) {
                setIsPlaying(false);
                lastFrameRef.current = null;
            }
        },
        [points],
    );

    // Bucle de animación.
    useEffect(() => {
        if (!isPlaying) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
            lastFrameRef.current = null;
            return;
        }

        const tick = (now: number) => {
            if (lastFrameRef.current === null) {
                lastFrameRef.current = now;
            }
            const realDelta = now - lastFrameRef.current;
            lastFrameRef.current = now;

            // Avance simulado = tiempo real × multiplicador, con tope para
            // no estancarse en gaps largos.
            const simDelta = Math.min(
                realDelta * speedRef.current,
                MAX_SIM_MS_PER_FRAME,
            );
            elapsedMsRef.current += simDelta;
            applyElapsed(elapsedMsRef.current);

            const total = timelineRef.current[timelineRef.current.length - 1] ?? 0;
            if (elapsedMsRef.current < total) {
                rafRef.current = requestAnimationFrame(tick);
            }
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [isPlaying, applyElapsed]);

    const play = useCallback(() => {
        const total = timelineRef.current[timelineRef.current.length - 1] ?? 0;
        // Si está al final, reiniciar antes de reproducir.
        if (elapsedMsRef.current >= total) {
            elapsedMsRef.current = 0;
        }
        lastFrameRef.current = null;
        setIsPlaying(true);
    }, []);

    const pause = useCallback(() => setIsPlaying(false), []);

    const toggle = useCallback(() => {
        if (isPlaying) pause();
        else play();
    }, [isPlaying, play, pause]);

    const seek = useCallback(
        (p: number) => {
            const total = timelineRef.current[timelineRef.current.length - 1] ?? 0;
            elapsedMsRef.current = Math.max(0, Math.min(p, 1)) * total;
            lastFrameRef.current = null;
            applyElapsed(elapsedMsRef.current);
        },
        [applyElapsed],
    );

    const setSpeed = useCallback((s: PlaybackSpeed) => setSpeedState(s), []);

    const reset = useCallback(() => {
        elapsedMsRef.current = 0;
        lastFrameRef.current = null;
        setIsPlaying(false);
        applyElapsed(0);
    }, [applyElapsed]);

    return {
        isPlaying,
        progress,
        speed,
        position,
        currentIndex,
        play,
        pause,
        toggle,
        seek,
        setSpeed,
        reset,
    };
};