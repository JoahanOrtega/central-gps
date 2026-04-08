// lib/map-geometry.ts

/** Convierte grados a radianes. */
export const toRadians = (value: number) => (value * Math.PI) / 180;

/** Convierte radianes a grados. */
export const toDegrees = (value: number) => (value * 180) / Math.PI;

/** Calcula la distancia en kilómetros entre dos puntos geográficos (fórmula Haversine). */
export const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

/** Calcula el rumbo (bearing) entre dos puntos en grados (0-360). */
export const getHeadingBetweenPoints = (
  start: google.maps.LatLngLiteral,
  end: google.maps.LatLngLiteral
): number => {
  const lat1 = toRadians(start.lat);
  const lng1 = toRadians(start.lng);
  const lat2 = toRadians(end.lat);
  const lng2 = toRadians(end.lng);
  const dLng = lng2 - lng1;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const heading = toDegrees(Math.atan2(y, x));
  return (heading + 360) % 360;
};