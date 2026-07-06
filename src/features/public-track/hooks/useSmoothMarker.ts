import { useCallback, useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
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
    const diff = ((to - from + 540) % 360) - 180;
    return from + diff * t;
};

export interface UseSmoothMarkerReturn {
    // La página llama esto en cada refresco con la unidad ya adaptada. El hook
    // decide cómo animar hacia la nueva posición/dirección.
    moverA: (map: maplibregl.Map, unit: MapUnitItem) => void;
}

// Anima el marcador de la unidad de forma fluida sobre MapLibre: desliza la
// posición entre reportes (interpolación con requestAnimationFrame) y gira la
// flecha de forma suave. Reusa buildUnitMarkerContent para el aspecto — la
// unidad se ve idéntica al mapa interno; solo cambió el motor del mapa
// (MapLibre + tiles libres = cero costo por carga, ver PublicUnitTrackPage).
export const useSmoothMarker = (): UseSmoothMarkerReturn => {
    const markerRef = useRef<maplibregl.Marker | null>(null);
    // Cascarón estable que MapLibre ancla al mapa. El contenido generado por
    // buildUnitMarkerContent se monta/reemplaza ADENTRO, porque MapLibre no
    // permite cambiar el elemento de un marker ya creado.
    const shellRef = useRef<HTMLDivElement | null>(null);
    const rafRef = useRef<number | null>(null);
    // Posición y ángulo actuales "renderizados" (no los del último reporte,
    // sino los que se están mostrando frame a frame).
    const posActualRef = useRef<{ lat: number; lng: number } | null>(null);
    const anguloActualRef = useRef(0);
    // Para saber si hay que regenerar el contenido (cambió movimiento↔detenido)
    // o basta rotar el que ya está.
    const enMovimientoRef = useRef<boolean | null>(null);

    // Limpia la animación y el marcador al desmontar.
    useEffect(() => {
        return () => {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
            markerRef.current?.remove();
        };
    }, []);

    const moverA = useCallback((map: maplibregl.Map, unit: MapUnitItem) => {
        const t = unit.telemetry;
        if (!t || t.latitud == null || t.longitud == null) return;

        const destino = { lat: t.latitud, lng: t.longitud };
        const gradosDestino = t.grados ?? anguloActualRef.current;
        const enMovimiento =
            (t.engine_state ?? "unknown") === "on" &&
            Math.round(t.velocidad ?? 0) >= 1;

        // Crear el marcador la primera vez (sin animación: aparece ya puesto).
        // OJO: MapLibre usa orden [lng, lat] — al revés que Google Maps.
        if (!markerRef.current) {
            const shell = document.createElement("div");
            shell.appendChild(buildUnitMarkerContent(unit));
            shellRef.current = shell;

            markerRef.current = new maplibregl.Marker({ element: shell })
                .setLngLat([destino.lng, destino.lat])
                .addTo(map);

            posActualRef.current = destino;
            anguloActualRef.current = gradosDestino;
            enMovimientoRef.current = enMovimiento;
            aplicarRotacion(shell, gradosDestino);
            return;
        }

        // Si cambió el modo (arrancó o se detuvo), regeneramos el contenido
        // —es otro SVG (flecha vs círculo)—. Si no, conservamos el nodo para
        // no perder la rotación aplicada.
        if (enMovimientoRef.current !== enMovimiento && shellRef.current) {
            shellRef.current.replaceChildren(buildUnitMarkerContent(unit));
            enMovimientoRef.current = enMovimiento;
            aplicarRotacion(shellRef.current, anguloActualRef.current);
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
            markerRef.current?.setLngLat([lng, lat]);

            // La flecha solo gira si va en movimiento (detenida es círculo).
            if (enMovimiento && shellRef.current) {
                const ang = lerpAngle(anguloOrigen, gradosDestino, k);
                aplicarRotacion(shellRef.current, ang);
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

// Aplica la rotación al SVG interno del marcador. buildUnitMarkerContent pone
// un transform:rotate() inline en la flecha; lo sobreescribimos con el ángulo
// interpolado del frame actual.
const aplicarRotacion = (shell: HTMLElement, grados: number) => {
    const svg = shell.querySelector("svg");
    if (!svg) return;
    svg.style.transform = `rotate(${grados}deg)`;
};