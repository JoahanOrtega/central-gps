// Configuración del token de rastreo de una unidad (ambos tipos).
export interface UnitTokenConfig {
    // Token permanente
    acceso_token_rastreo: boolean;
    token: string | null;
    token_requiere_clave_acceso: boolean;
    token_clave_acceso: string | null;
    fecha_expiracion: string | null;
    // Token temporal
    token_temporal: string | null;
    acceso_temporal: boolean;
    fecha_expiracion_temporal: string | null;
}

// Respuesta del POST regenerar (ambos tipos devuelven lo mismo).
export interface RegenerateUnitTokenResponse {
    message: string;
    token: string;
}