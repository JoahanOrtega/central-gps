// Tipos y servicio del rastreo público por token.
//
// No usa apiFetch porque ese inyecta el JWT y maneja el refresh de sesión —
// aquí no hay sesión: el token de la URL ES la credencial. Fetch directo.

const API_URL = import.meta.env.VITE_API_URL ?? "";

// Posición que devuelve el endpoint público (subset de la telemetría).
export interface PublicTrackPosition {
    latitud: number | null;
    longitud: number | null;
    velocidad: number | null;
    fecha_hora_gps: string | null;
    engine_state?: string | null;
}

// Respuesta de GET /public/track/unit/<token>.
export interface PublicTrackResponse {
    unidad: {
        numero: string;
        marca: string;
        modelo: string | null;
    };
    posicion: PublicTrackPosition | null;
}

// Error tipado para distinguir "token inválido" (404) de un fallo de red.
export class PublicTrackError extends Error {
    readonly notFound: boolean;

    constructor(message: string, notFound: boolean) {
        super(message);
        this.name = "PublicTrackError";
        this.notFound = notFound;
    }
}

// Consulta la posición pública de una unidad por su token. Lanza
// PublicTrackError con notFound=true si el enlace no es válido (404).
export const fetchPublicTrack = async (
    token: string,
    signal?: AbortSignal,
): Promise<PublicTrackResponse> => {
    const response = await fetch(
        `${API_URL}/public/track/unit/${encodeURIComponent(token)}`,
        { signal },
    );

    if (!response.ok) {
        throw new PublicTrackError(
            "Enlace de rastreo no válido",
            response.status === 404,
        );
    }

    return response.json();
};