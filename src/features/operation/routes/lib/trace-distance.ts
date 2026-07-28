import type { LatLng } from "../types/route.types";

// Calcula la distancia de un trazo (path) en kilómetros, sumando la distancia entre cada par de puntos consecutivos. 
// La distancia entre dos puntos se calcula con la fórmula del haversine.
const R_TIERRA_KM = 6371;

const tramoKm = (a: LatLng, b: LatLng): number => {
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R_TIERRA_KM * Math.asin(Math.sqrt(h));
};

export const distanciaTrazoKm = (path: LatLng[]): number => {
    let total = 0;
    for (let i = 1; i < path.length; i++) total += tramoKm(path[i - 1], path[i]);
    return total;
};