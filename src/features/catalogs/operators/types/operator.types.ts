export interface OperatorPoi {
    tipo_poi: number;
    direccion: string | null;
    lat: number | null;
    lng: number | null;
    radio: number | null;
    bounds: string | null;
    area: string | null;
    polygon_path: string | null;
    polygon_color: string | null;
    radio_color: string | null;
}

export interface OperatorItem {
    id_operador: number;
    id_empresa: number;
    id_poi: number | null;
    id_unidad_operador: number | null;
    clave: string | null;
    nombre: string;
    imagen: string | null;
    direccion: string | null;
    telefono: string | null;
    fecha_nacimiento: string | null;
    licencia: string | null;
    tipo_licencia: string | null;
    vencimiento_licencia: string | null;
    erp_link: string | null;
    fecha_registro: string | null;
    fecha_cambio: string | null;
    id_usuario_registro: number | null;
    id_usuario_cambio: number | null;
    // IDs de los grupos a los que pertenece (relación N:M).
    id_grupo_operadores: number[];
    // Geocerca del domicilio (solo en el detalle getById; null si no tiene).
    poi?: OperatorPoi | null;
}

export interface CreateOperatorPayload {
    nombre: string;
    clave?: string | null;
    telefono?: string | null;
    direccion?: string | null;
    imagen?: string | null;
    fecha_nacimiento?: string | null;
    vencimiento_licencia?: string | null;
    licencia?: string | null;
    tipo_licencia?: string | null;
    erp_link?: string | null;
    id_poi?: number | null;
    id_unidad_operador?: number | null;
    id_grupo_operadores?: number[];
    // Domicilio (geocerca) anidado — el backend lo convierte en un registro t_pois.
    poi?: OperatorPoi | null;
}

// Update: todos opcionales. Si id_grupo_operadores viene, reemplaza la lista
// completa de grupos; si no viene, los grupos no se tocan.
export type UpdateOperatorPayload = Partial<CreateOperatorPayload>;

// ── Grupos de operadores ──────────────────────────────────────────────────────

export interface OperatorGroupItem {
    id_grupo_operadores: number;
    id_empresa: number;
    nombre: string;
    observaciones: string | null;
    total_operadores: number;
    fecha_registro: string | null;
    fecha_cambio: string | null;
    id_usuario_registro: number | null;
    id_usuario_cambio: number | null;
    // Solo presente en getById (no en el listado).
    id_operadores?: number[];
}

export interface CreateOperatorGroupPayload {
    nombre: string;
    observaciones?: string | null;
    id_operadores?: number[];
}

export type UpdateOperatorGroupPayload = Partial<CreateOperatorGroupPayload>;

// ── Asignación operador ↔ unidad ──────────────────────────────────────────────

export interface AssignOperatorPayload {
    id_unidad: number;
    fecha_asignacion?: string | null;
}

// Errores de validación por campo (forma que devuelve el backend en 422).
export interface OperatorFieldErrors {
    nombre?: string[];
    clave?: string[];
}