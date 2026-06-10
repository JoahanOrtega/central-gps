// ── Grupos ────────────────────────────────────────────────────────────────────
export interface ItineraryGroup {
    id_grupo_itinerarios: number;
    nombre: string;
    observaciones: string | null;
    id_cliente: number | null;
    cliente: string | null;
    status: number;
    total_itinerarios: number;
}

export interface ItineraryGroupDetail extends ItineraryGroup {
    id_itinerarios: number[];
}

export interface CreateGroupPayload {
    nombre: string;
    observaciones?: string | null;
    id_cliente?: number | null;
    id_itinerarios?: number[];
}

// ── Roles ─────────────────────────────────────────────────────────────────────
export interface DiaRol {
    dia_rol: number;
    orden: number;
    es_descanso: boolean;
    id_itinerario: number | null;
    // Campos de contexto del itinerario
    turno?: string;
    hora_inicio?: string;
    hora_fin?: string;
    nombre_ruta?: string;
    clave_ruta?: string;
    total_paradas?: number;
    tipo_logistica?: number;
}

export interface ItineraryRole {
    id_rol_itinerarios: number;
    clave: string | null;
    nombre: string;
    fecha_inicio_rol: string | null;
    dias_duracion: number;
    observaciones: string | null;
    status: number;
    total_itinerarios: number;
    total_asignaciones: number;
}

export interface ItineraryRoleDetail extends ItineraryRole {
    dias: DiaRol[];
}

export interface CreateRolePayload {
    clave?: string | null;
    nombre: string;
    fecha_inicio_rol?: string | null;
    dias_duracion: number;
    observaciones?: string | null;
    dias: {
        dia_rol: number;
        orden: number;
        es_descanso: boolean;
        id_itinerario?: number | null;
    }[];
}