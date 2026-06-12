// ══════════════════════════════════════════════════════════════════════════════
// geocoding-cache.ts — Reverse geocoding con caché en memoria
// ══════════════════════════════════════════════════════════════════════════════
//
// Responsabilidad única: convertir coordenadas GPS a una dirección legible,
// evitando llamadas repetidas a la API de Google para el mismo punto.
//
// ── Estrategia de caché ───────────────────────────────────────────────────────
// Las coordenadas se redondean a 4 decimales antes de usarse como clave.
// Con 4 decimales, la precisión es ~11 metros — suficiente para que dos
// clics en marcadores cercanos del mismo evento compartan resultado, sin
// perder granularidad entre calles distintas.
//
// La caché vive en memoria (Map) durante la sesión. No se persiste en
// localStorage porque los datos GPS cambian cada día y el tamaño podría
// crecer sin control.
//
// ── Costo de la API ───────────────────────────────────────────────────────────
// google.maps.Geocoder es la misma key que ya usa el mapa. El geocoding
// inverso tiene cuota generosa (≈ 40 000 llamadas/mes gratis).
// Con la caché, el número real de llamadas ≈ número de marcadores únicos
// visitados en la sesión — típicamente < 20 en uso normal.
// ══════════════════════════════════════════════════════════════════════════════

// ── Caché en memoria: clave = "lat,lng" redondeados a 4 dec. ─────────────────
const _cache = new Map<string, string>();

/**
 * Redondea lat y lng a 4 decimales y los concatena como clave de caché.
 * Precisión resultante: ~11 m — suficiente para distinguir calles.
 */
const toCacheKey = (lat: number, lng: number): string =>
    `${lat.toFixed(4)},${lng.toFixed(4)}`;

/**
 * Extrae la parte útil de un resultado de geocoding de Google:
 * intenta "Nombre de calle + número", fallback a formatted_address completo.
 *
 * Google devuelve componentes en este orden (de más específico a más general):
 *   street_number → route → sublocality → locality → ...
 * Nos quedamos con route + street_number cuando existen porque es lo que
 * el usuario reconoce (Ley de Jakob: convención de Google Maps / Waze).
 */
const extractReadableAddress = (
    results: google.maps.GeocoderResult[],
): string => {
    if (!results.length) return "Dirección no disponible";

    const first = results[0];
    const components = first.address_components;

    const get = (type: string): string =>
        components.find((c) => c.types.includes(type))?.long_name ?? "";

    const route = get("route");
    const number = get("street_number");
    const sublocality = get("sublocality_level_1") || get("sublocality");

    if (route) {
        const partes = [route, number].filter(Boolean).join(" ");
        return sublocality ? `${partes}, ${sublocality}` : partes;
    }

    // Fallback: dirección formateada completa (sin el país para ahorrar espacio)
    return first.formatted_address.replace(/, México$/, "").trim();
};

/**
 * Convierte coordenadas GPS a una dirección legible usando el Geocoder de
 * Google Maps con caché en memoria para la sesión.
 *
 * @param lat Latitud del punto GPS
 * @param lng Longitud del punto GPS
 * @returns Promesa con la dirección como string
 *
 * @example
 * const dir = await resolveAddress(21.8853, -102.2916);
 * // → "Av. Convención 1914 Nte., Fraccionamiento Estrella"
 */
export const resolveAddress = async (
    lat: number,
    lng: number,
): Promise<string> => {
    // 1. Verificar caché primero (evita llamada a la API)
    const key = toCacheKey(lat, lng);
    const cached = _cache.get(key);
    if (cached !== undefined) return cached;

    // 2. Verificar que el SDK de Google Maps esté disponible
    if (!window.google?.maps?.Geocoder) {
        return "Dirección no disponible";
    }

    // 3. Llamar al Geocoder de Google (una sola vez por coordenada)
    try {
        const geocoder = new window.google.maps.Geocoder();
        const response = await geocoder.geocode({
            location: { lat, lng },
        });

        const address = extractReadableAddress(response.results);

        // 4. Guardar en caché antes de retornar
        _cache.set(key, address);
        return address;
    } catch {
        // El Geocoder puede fallar por cuota, red o coordenadas inválidas.
        // Retornamos un fallback en lugar de propagar el error — la carta
        // sigue siendo útil aunque no muestre la dirección.
        const fallback = "Dirección no disponible";
        _cache.set(key, fallback);
        return fallback;
    }
};

/**
 * Limpia la caché manualmente.
 * Útil en tests unitarios o si el usuario cambia de empresa/zona.
 */
export const clearGeocodingCache = (): void => {
    _cache.clear();
};