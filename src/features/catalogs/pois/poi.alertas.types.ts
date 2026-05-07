// features/catalogs/pois/poi.alertas.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tipos para la configuracion de alertas de geocerca por POI.
// Espejo del schema del backend (UpsertAlertaPoiSchema).

// Respuesta del GET /pois/:id/alertas
// Si el POI no tiene alerta configurada, el backend retorna este objeto
// con todos los toggles en 0 e id_alerta_poi: null.
export interface AlertaPoi {
    id_alerta_poi: number | null;
    id_poi: number;
    id_empresa: number;
    // Toggle entrada/salida: 1=activa, 0=inactiva
    in_out: 0 | 1;
    // Toggle permanencia: 1=activa, 0=inactiva
    permanencia: 0 | 1;
    // 1=excede tiempo maximo, 2=no cumple tiempo minimo
    tipo_permanencia: 1 | 2 | null;
    minutos_permanencia: number | null;
    // Toggle velocidad maxima: 1=activa, 0=inactiva
    vel_max: 0 | 1;
    vel_max_permitida: number | null;
    // 1=solo grupo de unidades, 2=todas las unidades de la empresa
    alcance: 1 | 2;
    id_grupo_unidades: number | null;
    status: 0 | 1;
}

// Payload del POST /pois/:id/alertas (todos opcionales)
export interface UpsertAlertaPoiPayload {
    in_out?: 0 | 1;
    permanencia?: 0 | 1;
    tipo_permanencia?: 1 | 2 | null;
    minutos_permanencia?: number | null;
    vel_max?: 0 | 1;
    vel_max_permitida?: number | null;
    alcance?: 1 | 2;
    id_grupo_unidades?: number | null;
}

// Respuesta del POST
export interface UpsertAlertaPoiResponse {
    message: string;
    alerta: AlertaPoi;
}