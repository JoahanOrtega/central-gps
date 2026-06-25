import { useCallback, useRef, useState } from "react";
import { distanciaKm } from "../lib/public-track-format";

// Cuántos puntos de la estela conservamos. La trayectoria es solo "en vivo"
// (lo que pasa mientras la pestaña está abierta), así que no necesitamos
// histórico: un tope acotado evita que la línea crezca sin fin en sesiones
// largas y mantiene el rastro reciente legible.
const MAX_TRAIL_POINTS = 120;

// Distancia mínima (en grados, ~11m) para registrar un punto nuevo. Filtra el
// ruido del GPS cuando la unidad está detenida: sin esto, un vehículo parado
// acumula decenas de puntos casi iguales y el rastro se ve como una mancha.
const MIN_TRAIL_DELTA = 0.0001;

// Azul de navegación, consistente con los marcadores de recorrido del mapa.
const TRAIL_COLOR = "#2563eb";

export interface UsePublicTrailReturn {
    // Kilómetros acumulados en vivo (para mostrar en la tarjeta).
    recorridoKm: number;
    // Registra una nueva posición: actualiza la estela y el acumulado. La
    // página la llama en cada refresco; el hook decide si el punto aporta.
    registrarPosicion: (
        map: google.maps.Map,
        latLng: google.maps.LatLngLiteral,
    ) => void;
}

// Maneja la estela "en vivo" del rastreo público: acumula los puntos por los
// que pasa la unidad, filtra el ruido del GPS, calcula el recorrido y dibuja
// la polilínea. Todo vive en refs porque no debe provocar renders salvo el
// kilometraje, que sí es dato visible.
export const usePublicTrail = (): UsePublicTrailReturn => {
    const trailRef = useRef<google.maps.LatLngLiteral[]>([]);
    const polylineRef = useRef<google.maps.Polyline | null>(null);
    const recorridoKmRef = useRef(0);
    const [recorridoKm, setRecorridoKm] = useState(0);

    const registrarPosicion = useCallback(
        (map: google.maps.Map, latLng: google.maps.LatLngLiteral) => {
            const trail = trailRef.current;
            const ultimo = trail[trail.length - 1];

            // Solo agregamos el punto si la unidad se movió lo suficiente, para
            // no acumular ruido del GPS cuando está parada.
            const seMovio =
                !ultimo ||
                Math.abs(ultimo.lat - latLng.lat) > MIN_TRAIL_DELTA ||
                Math.abs(ultimo.lng - latLng.lng) > MIN_TRAIL_DELTA;
            if (!seMovio) return;

            if (ultimo) {
                recorridoKmRef.current += distanciaKm(ultimo, latLng);
                setRecorridoKm(recorridoKmRef.current);
            }

            trail.push(latLng);
            if (trail.length > MAX_TRAIL_POINTS) trail.shift();

            // Una sola línea con opacidad media y grosor suave: el marcador con
            // su halo marca "dónde está ahora", la línea marca "de dónde viene".
            // La opacidad evita la raya dura que se vería con una polilínea
            // sólida sobre los puntos crudos del GPS.
            if (!polylineRef.current) {
                polylineRef.current = new google.maps.Polyline({
                    map,
                    path: trail,
                    geodesic: true,
                    strokeColor: TRAIL_COLOR,
                    strokeOpacity: 0.55,
                    strokeWeight: 4,
                });
            } else {
                polylineRef.current.setPath(trail);
            }
        },
        [],
    );

    return { recorridoKm, registrarPosicion };
};