import { useCallback, useEffect, useRef } from "react";
import { buildUnitMarkerContent } from "@/features/maps/lib/map-markers";
import type { MapUnitItem } from "@/features/maps/types/map.types";

const SLIDE_MS = 1400;

const easeInOutCubic = (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const lerpAngle = (from: number, to: number, t: number): number => {
    const diff = ((to - from + 540) % 360) - 180;
    return from + diff * t;
};

export interface UseSmoothMarkerReturn {
    // La página llama esto en cada refresco con la unidad ya adaptada. El hook
    // decide cómo animar hacia la nueva posición/dirección.
    moverA: (map: google.maps.Map, unit: MapUnitItem) => void;
}

export const useSmoothMarker = (): UseSmoothMarkerReturn => {
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const posActualRef = useRef<{ lat: number; lng: number } | null>(null);
    const anguloActualRef = useRef(0);
    // Para saber si hay que regenerar el contenido (cambió movimiento-detenido)
    // o basta rotar el que ya está.
    const enMovimientoRef = useRef<boolean | null>(null);

    // Limpia la animación y el marcador al desmontar.
    useEffect(() => {
        return () => {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
            if (markerRef.current) markerRef.current.map = null;
        };
    }, []);

    const moverA = useCallback((map: google.maps.Map, unit: MapUnitItem) => {
        const t = unit.telemetry;
        if (!t || t.latitud == null || t.longitud == null) return;

        const destino = { lat: t.latitud, lng: t.longitud };
        const gradosDestino = t.grados ?? anguloActualRef.current;
        const enMovimiento =
            (t.engine_state ?? "unknown") === "on" &&
            Math.round(t.velocidad ?? 0) >= 1;

        // Crear el marcador la primera vez (sin animación: aparece ya puesto).
        if (!markerRef.current) {
            const content = buildUnitMarkerContent(unit);

            markerRef.current = new google.maps.marker.AdvancedMarkerElement({
                map,
                position: destino,
                content,
            });

            posActualRef.current = destino;
            anguloActualRef.current = gradosDestino;
            enMovimientoRef.current = enMovimiento;
            aplicarRotacion(content, gradosDestino);
            return;
        }

        // Si cambió el modo (arrancó o se detuvo), regeneramos el contenido
        if (enMovimientoRef.current !== enMovimiento) {
            const nuevoContent = buildUnitMarkerContent(unit);
            markerRef.current.content = nuevoContent;
            enMovimientoRef.current = enMovimiento;
            aplicarRotacion(nuevoContent, anguloActualRef.current);
        }

        // Cancelar animación previa si seguía corriendo.
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);

        const origen = posActualRef.current ?? destino;
        const anguloOrigen = anguloActualRef.current;
        const inicio = performance.now();

        const frame = (ahora: number) => {
            const progreso = Math.min((ahora - inicio) / SLIDE_MS, 1);
            const k = easeInOutCubic(progreso);

            const lat = origen.lat + (destino.lat - origen.lat) * k;
            const lng = origen.lng + (destino.lng - origen.lng) * k;
            if (markerRef.current) {
                markerRef.current.position = { lat, lng };
            }

            // La flecha solo gira si va en movimiento (detenida es círculo).
            if (enMovimiento && markerRef.current?.content instanceof HTMLElement) {
                const ang = lerpAngle(anguloOrigen, gradosDestino, k);
                aplicarRotacion(markerRef.current.content, ang);
                anguloActualRef.current = ang;
            }

            if (progreso < 1) {
                rafRef.current = requestAnimationFrame(frame);
            } else {
                posActualRef.current = destino;
                anguloActualRef.current = gradosDestino;
                rafRef.current = null;
            }
        };

        rafRef.current = requestAnimationFrame(frame);
    }, []);

    return { moverA };
};

// Aplica la rotación al SVG interno del marcador.
const aplicarRotacion = (content: Element | Node, grados: number) => {
    if (!(content instanceof HTMLElement)) return;
    const svg = content.querySelector("svg");
    if (!svg) return;
    svg.style.transform = `rotate(${grados}deg)`;
};