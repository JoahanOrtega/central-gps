export interface GeocodeResult {
    lat: number;
    lng: number;
    formattedAddress: string;
}

// Cache de geocodificación para no saturar la API de Google Maps con peticiones repetidas.
const MAX_ENTRADAS = 500;

const cacheDirecto = new Map<string, GeocodeResult | null>();
const cacheInverso = new Map<string, string | null>();

const acotar = (cache: Map<string, unknown>) => {
    if (cache.size <= MAX_ENTRADAS) return;
    const primera = cache.keys().next().value;
    if (primera !== undefined) cache.delete(primera);
};

// Normaliza la dirección para usarla como clave de caché: minúsculas, sin espacios extra.
const claveDireccion = (address: string): string =>
    address.trim().toLowerCase().replace(/\s+/g, " ");

// Normaliza la coordenada para usarla como clave de caché: lat y lng con 5 decimales.
const claveCoordenada = (lat: number, lng: number): string =>
    `${lat.toFixed(5)},${lng.toFixed(5)}`;

// Dirección legible: coordenada (geocodificación directa), con caché.
export const geocodeAddressCached = (
    geocoder: google.maps.Geocoder,
    address: string,
): Promise<GeocodeResult | null> => {
    const clave = claveDireccion(address);
    if (!clave) return Promise.resolve(null);
    if (cacheDirecto.has(clave)) {
        return Promise.resolve(cacheDirecto.get(clave) ?? null);
    }

    return new Promise((resolve) => {
        geocoder.geocode({ address }, (results, status) => {
            let resultado: GeocodeResult | null = null;
            if (status === "OK" && results?.[0]?.geometry.location) {
                const loc = results[0].geometry.location;
                resultado = {
                    lat: loc.lat(),
                    lng: loc.lng(),
                    formattedAddress: results[0].formatted_address,
                };
            }
            cacheDirecto.set(clave, resultado);
            acotar(cacheDirecto);
            resolve(resultado);
        });
    });
};

// Coordenada → dirección legible (geocodificación inversa), con caché.
export const reverseGeocodeCached = (
    geocoder: google.maps.Geocoder,
    lat: number,
    lng: number,
): Promise<string | null> => {
    const clave = claveCoordenada(lat, lng);
    if (cacheInverso.has(clave)) {
        return Promise.resolve(cacheInverso.get(clave) ?? null);
    }

    return new Promise((resolve) => {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            const direccion =
                status === "OK" && results?.[0]
                    ? results[0].formatted_address
                    : null;
            cacheInverso.set(clave, direccion);
            acotar(cacheInverso);
            resolve(direccion);
        });
    });
};