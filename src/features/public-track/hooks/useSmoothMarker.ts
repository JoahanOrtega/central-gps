import { useCallback, useEffect, useRef } from "react";
import { buildUnitMarkerContent } from "@/features/maps/lib/map-markers";
import type { MapUnitItem } from "@/features/maps/types/map.types";

// Cuánto dura la animación de deslizamiento entre la posición vieja y la nueva.
// El backend reporta cada ~40s en movimiento y la página refresca cada 15s, así
// que la unidad se queda quieta un rato y luego salta. Animar el salto durante
// ~1.4s lo convierte en un deslizamiento suave (efecto "Uber") sin fingir datos
// que no tenemos. Más largo se sentiría flotante; más corto, brusco.
const SLIDE_MS = 1400;

// Easing suave (easeInOutCubic): arranca y termina despacio, acelera en medio.
// Da la sensación natural de un vehículo, no de un objeto a velocidad constante.
const easeInOutCubic = (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Interpola un ángulo tomando el camino más corto (ej. de 350° a 10° gira +20°,
// no -340°). Sin esto, la flecha daría una vuelta completa al cruzar el norte.
const lerpAngle = (from: number, to: number, t: number): number => {
    let diff = ((to - from + 540) % 360) - 180;
    return from + diff * t;
};

export interface UseSmoothMarkerReturn {
    // La página llama esto en cada refresco con la unidad ya adaptada. El hook
    // decide cómo animar hacia la nueva posición/dirección.
    moverA: (map: google.maps.Map, unit: MapUnitItem) => void;
}

// Anima el marcador de la unidad de forma fluida: desliza la posición entre
// reportes (interpolación con requestAnimationFrame) y gira la flecha de forma
// suave. Reusa buildUnitMarkerContent para el aspecto — solo controla CÓMO se
// mueve, no cómo se ve.
export const useSmoothMarker = (): UseSmoothMarkerReturn => {
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
        null,
    );
    const rafRef = useRef<number | null>(null);
    // Posición y ángulo actuales "renderizados" (no los del último reporte, sino
    // los que se están mostrando frame a frame).
    const posActualRef = useRef<google.maps.LatLngLiteral | null>(null);
    const anguloActualRef = useRef(0);
    // Para saber si hay que reconstruir el contenido (cambió movimiento↔detenido)
    // o basta rotar el que ya está.
    const enMovimientoRef = useRef<boolean | null>(null);

    // Limpia cualquier animación pendiente al desmontar.
    useEffect(() => {
        return () => {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const moverA = useCallback(
        (map: google.maps.Map, unit: MapUnitItem) => {
            const t = unit.telemetry;
            if (!t || t.latitud == null || t.longitud == null) return;

            const destino = { lat: t.latitud, lng: t.longitud };
            const gradosDestino = t.grados ?? anguloActualRef.current;
            const enMovimiento =
                (t.engine_state ?? "unknown") === "on" &&
                Math.round(t.velocidad ?? 0) >= 1;

            // Crear el marcador la primera vez (sin animación: aparece ya puesto).
            if (!markerRef.current) {
                markerRef.current =
                    new google.maps.marker.AdvancedMarkerElement({
                        map,
                        position: destino,
                        content: buildUnitMarkerContent(unit),
                        title: unit.numero,
                    });
                posActualRef.current = destino;
                anguloActualRef.current = gradosDestino;
                enMovimientoRef.current = enMovimiento;
                aplicarRotacion(markerRef.current, gradosDestino, false);
                return;
            }

            // Si cambió el modo (arrancó o se detuvo), reconstruimos el contenido
            // —es otro SVG (flecha vs círculo)—. Si no, conservamos el nodo para
            // que la transición CSS de rotación no se pierda.
            if (enMovimientoRef.current !== enMovimiento) {
                markerRef.current.content = buildUnitMarkerContent(unit);
                enMovimientoRef.current = enMovimiento;
                aplicarRotacion(
                    markerRef.current,
                    anguloActualRef.current,
                    false,
                );
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
                if (enMovimiento && markerRef.current) {
                    const ang = lerpAngle(anguloOrigen, gradosDestino, k);
                    aplicarRotacion(markerRef.current, ang, false);
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
        },
        [],
    );

    return { moverA };
};

// Aplica la rotación al SVG interno del marcador. Como buildUnitMarkerContent
// ya pone un transform:rotate() inline en la flecha, lo sobreescribimos aquí
// con el ángulo interpolado del frame actual.
const aplicarRotacion = (
    marker: google.maps.marker.AdvancedMarkerElement,
    grados: number,
    conTransicion: boolean,
) => {
    const content = marker.content as HTMLElement | null;
    const svg = content?.querySelector("svg");
    if (!svg) return;
    // Solo rotamos la flecha (viewBox alto). El círculo (detenido) no rota.
    svg.style.transition = conTransicion ? "transform 0.8s ease-out" : "";
    svg.style.transform = `rotate(${grados}deg)`;
};