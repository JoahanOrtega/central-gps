// ─────────────────────────────────────────────────────────────────────────────
// Tipos para el flujo de edición de una unidad (GET /units/:id + PATCH /units/:id)
//
// Diseño:
//   - UnitDetailBase      → campos que TODO rol puede ver/editar
//   - UnitTechnicalFields → bloque "Equipo instalado" (solo sudo_erp)
//   - UnitDetail          → respuesta del GET: base + (opcional) equipo
//   - UpdateUnitPayload   → body del PATCH: todos los campos opcionales
//
// Principio clave: los campos técnicos son OPCIONALES en el tipo del detalle.
// Para un admin_empresa el backend los omite del JSON, así que TypeScript
// refleja esa realidad — si intentas leer `unit.imei` sin verificar, el
// compilador te obliga a manejar el caso undefined.
// ─────────────────────────────────────────────────────────────────────────────

// ── Campos base (siempre presentes, para todos los roles) ────────────────────
export interface UnitDetailBase {
    id_unidad: number;

    // Identidad
    numero: string;
    marca: string;
    modelo: string | null;
    anio: string | null;
    matricula: string | null;
    no_serie: string | null;
    tipo: number;
    odometro_inicial: number;
    imagen: string | null;

    // Asignaciones (N:N con operador y grupos)
    id_operador: number | null;
    fecha_asignacion_operador: string | null;
    nombre_operador: string | null;
    id_grupo_unidades: number[];

    // Datos adicionales: combustible
    tipo_combustible: string | null;
    capacidad_tanque: number | null;
    rendimiento_establecido: number | null;

    // Datos adicionales: seguro
    nombre_aseguradora: string | null;
    telefono_aseguradora: string | null;
    no_poliza_seguro: string | null;
    vigencia_poliza_seguro: string | null;

    // Verificación vehicular
    vigencia_verificacion_vehicular: string | null;

    // Operativos (informativos, no editables desde este modal)
    vel_max: number;
    status: number;
}

// ── Campos técnicos (solo sudo_erp recibe estos del backend) ─────────────────
// El backend los omite del JSON si el rol es admin_empresa o usuario.
// Por eso todos son opcionales aquí: su presencia indica "el que pidió
// es sudo_erp". El frontend usa esta señal para decidir si muestra la
// sección "Equipo instalado".
export interface UnitTechnicalFields {
    id_modelo_avl?: number | null;
    imei?: string;
    chip?: string;
    fecha_instalacion?: string;
    input1?: number;
    input2?: number;
    output1?: number;
    output2?: number;
}

// ── Detalle unificado ────────────────────────────────────────────────────────
// Lo que retorna GET /units/:id. El consumidor puede usar `hasTechnicalFields`
// (ver abajo) como narrowing helper si quiere leer campos técnicos con
// seguridad de tipos.
export type UnitDetail = UnitDetailBase & UnitTechnicalFields;

// ── Type guard: ¿este detalle incluye campos técnicos? ───────────────────────
// Utilidad opcional para el consumidor. No es estrictamente necesaria
// porque se puede chequear con `"imei" in unit`, pero hace el intent claro.
export const hasTechnicalFields = (
    unit: UnitDetail,
): unit is UnitDetail & Required<Pick<UnitTechnicalFields, "imei" | "chip">> => {
    return "imei" in unit && typeof unit.imei === "string";
};

// ── Payload del PATCH ────────────────────────────────────────────────────────
// TODOS los campos opcionales: patch parcial. El backend solo actualiza
// las columnas presentes. Si no mandas `id_operador`, la asignación actual
// no se toca (sentinela __UNSET__ en el servicio).
//
// Convención: enviar `null` en un campo OPCIONAL significa "limpiar el
// valor". No enviar el campo significa "dejarlo como estaba".
//
// Importante: el backend RECHAZA con 403 si un admin_empresa manda
// campos técnicos (imei, chip, id_modelo_avl, fecha_instalacion, inputs,
// outputs). El frontend no los enviará porque el modal no los muestra,
// pero esa protección existe como defensa en profundidad.
export interface UpdateUnitPayload {
    // Identidad
    numero?: string;
    marca?: string;
    modelo?: string | null;
    anio?: string | null;
    matricula?: string | null;
    no_serie?: string | null;
    tipo?: number;
    odometro_inicial?: number;
    imagen?: string | null;

    // Asignaciones
    id_operador?: number | null;
    fecha_asignacion_operador?: string | null;
    id_grupo_unidades?: number[];

    // Combustible
    tipo_combustible?: string | null;
    capacidad_tanque?: number | null;
    rendimiento_establecido?: number | null;

    // Seguro y verificación
    nombre_aseguradora?: string | null;
    telefono_aseguradora?: string | null;
    no_poliza_seguro?: string | null;
    vigencia_poliza_seguro?: string | null;
    vigencia_verificacion_vehicular?: string | null;

    // Equipo instalado (solo sudo_erp puede enviarlos — backend valida)
    id_modelo_avl?: number | null;
    imei?: string;
    chip?: string;
    fecha_instalacion?: string;
    input1?: number;
    input2?: number;
    output1?: number;
    output2?: number;
}

// ── Respuestas del servidor ──────────────────────────────────────────────────
export interface UpdateUnitResponse {
    message: string;
    actualizado: boolean;
}

// Error semántico del backend cuando se viola la matriz de acceso
// o la unidad no existe. Útil para que la UI muestre mensajes específicos.
export interface UnitEditErrorPayload {
    code: "FIELDS_NOT_ALLOWED" | "UNIT_NOT_FOUND" | "DATABASE_ERROR";
    message: string;
}