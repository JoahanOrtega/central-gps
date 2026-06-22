// Tipos del token de rastreo de unidad. Espejo de la respuesta del backend
// (services/unit_token_service.py → get_unit_token_config).

// Configuración del token de rastreo de una unidad.
export interface UnitTokenConfig {
    acceso_token_rastreo: boolean;
    token: string | null;
    token_requiere_clave_acceso: boolean;
    token_clave_acceso: string | null;
    // ISO 8601 o null. null = permanente (no expira).
    fecha_expiracion: string | null;
}

// Respuesta del POST /units/<id>/token/regenerar.
export interface RegenerateUnitTokenResponse {
    message: string;
    token: string;
}