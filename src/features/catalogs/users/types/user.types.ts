// ─── Tipos del módulo Catálogos > Usuarios ────────────────────────────────────
//
// Cubre tres áreas:
//   1. UserListItem:   lo que devuelve GET /catalogs/users (listado de cards)
//   2. UserDetail:     lo que devuelve GET /catalogs/users/<id> (pre-llenar wizard)
//   3. WizardFormState + payloads: lo que el wizard maneja internamente y envía
//
// Diseño:
//   - Espejo del backend (CreateUserSchema / UpdateUserSchema) en los payloads.
//   - Form state en el frontend usa shapes UI-friendly (arrays, strings de hora
//     con "HH:MM" en lugar de Time, Set para permisos, etc.) que se traducen
//     al payload final con helpers en catalogUserHelpers.ts.

// ─── Roles permitidos para creación/edición desde el wizard ──────────────────
// Espejo de ROLES_CREABLES en el backend. sudo_erp NO se incluye
// intencionalmente — es un rol de sistema que NO se debe poder asignar
// desde la UI.
export type RolCreable = "admin_empresa" | "usuario";


// ─── Tipo de acceso (atajo del wizard, no se envía al backend) ────────────────
// Replica el toggle "Acceso Total / Solo Lectura" del legacy con una tercera
// opción "Personalizar" para combinaciones libres. Vive solo en el frontend
// y se traduce a la lista final de id_permisos al hacer submit.
export type TipoAcceso = "total" | "lectura" | "personalizar";


// ─── 1. UserListItem — fila del listado ──────────────────────────────────────
// Lo que devuelve GET /catalogs/users (un array de estos).
// Incluye nombres resueltos de grupo y cliente (vía LEFT JOIN en backend)
// para mostrar en la card sin necesidad de consultas adicionales.
export interface UserListItem {
    id: number;
    nombre: string;
    usuario: string;          // login (también funciona como email en este sistema)
    telefono: string | null;
    id_rol: number;
    rol: string;              // "admin_empresa" | "usuario" | "sudo_erp"
    dias_acceso: string;      // "L,M,X,J,V" o ""
    hora_inicio_acceso: string | null;   // "08:00:00" o null
    hora_fin_acceso: string | null;
    id_grupo_unidades: number | null;
    nombre_grupo_unidades: string | null;  // viene resuelto por JOIN
    id_cliente: number | null;
    nombre_cliente: string | null;          // viene resuelto por JOIN
    dias_consulta: number;
    fecha_registro: string | null;          // ISO 8601
}


// ─── 2. UserDetail — para pre-llenar el wizard de edición ────────────────────
// Lo que devuelve GET /catalogs/users/<id>. Estructura idéntica al shape
// que el wizard usa para pre-poblar el form sin transformaciones.
//
// Por qué replicamos las 3 secciones aquí (en lugar de usar UserListItem
// extendido):
//   El wizard piensa en términos de "datos / restricciones / permisos".
//   La lista piensa en términos de "fila plana con info para mostrar".
//   Forzar que ambos usen el mismo shape complica los dos.

export interface UserDetail {
    id: number;
    datos: {
        nombre: string;
        usuario: string;
        telefono: string | null;
        rol: string;
        // En este sistema "usuario" sirve como email. El backend lo
        // duplica en este campo para el UI del wizard de edición.
        email: string;
    };
    restricciones: {
        dias_acceso: string;            // "L,M,X,J,V"
        hora_inicio_acceso: string;     // "08:00:00" o ""
        hora_fin_acceso: string;
        id_grupo_unidades: number | null;
        id_cliente: number | null;
        dias_consulta: number;
    };
    permisos: {
        id_permisos: number[];
    };
    fecha_registro: string | null;
    fecha_cambio: string | null;
}


// ─── 3. WizardFormState — estado interno del wizard ──────────────────────────
// Diferencias respecto a los payloads del backend:
//   - dias_acceso es array (UI con checkboxes) en lugar de string.
//   - hora_inicio/fin como "HH:MM" (input nativo time) en lugar de "HH:MM:SS".
//   - confirm_clave existe solo para validar coincidencia (no se envía).
//   - permisosSeleccionados es Set<number> para toggle O(1).
//   - tipoAcceso vive solo aquí — se traduce a id_permisos al enviar.

export interface WizardFormState {
    // Step 1: Datos
    usuario: string;
    clave: string;
    confirm_clave: string;
    nombre: string;
    rol: RolCreable;
    email: string;
    telefono: string;

    // Step 2: Restricciones (todos opcionales, pueden estar vacíos)
    dias_acceso: string[];     // ["L", "M", "X", "J", "V"]
    hora_inicio: string;        // "08:00" (input time)
    hora_fin: string;
    id_grupo_unidades: number | null;
    id_cliente: number | null;
    dias_consulta: string;      // string en form, parseamos al enviar

    // Step 3: Permisos
    tipoAcceso: TipoAcceso;
    permisosSeleccionados: Set<number>;
}


// ─── Recursos auxiliares para el Step 2 ───────────────────────────────────────
// El backend ya tiene endpoints para listar grupos de unidades y clientes
// por empresa. Definimos los tipos para que TanStack Query los infiera bien.

export interface GrupoUnidadOption {
    id_grupo_unidades: number;
    nombre: string;
}

export interface ClienteOption {
    id_cliente: number;
    nombre: string;
}


// ─── Payloads de los endpoints ────────────────────────────────────────────────
// Espejo exacto de CreateUserSchema y UpdateUserSchema del backend.

export interface CreateUserPayload {
    datos: {
        usuario: string;
        clave: string;
        nombre: string;
        rol: RolCreable;
        email?: string | null;
        telefono?: string | null;
    };
    restricciones: {
        dias_acceso?: string;            // "L,M,X,J,V"
        hora_inicio_acceso?: string;     // "08:00:00"
        hora_fin_acceso?: string;
        id_grupo_unidades?: number | null;
        id_cliente?: number | null;
        dias_consulta?: number;
    };
    permisos: {
        id_permisos: number[];
    };
}

// Para PATCH: TODAS las secciones son opcionales.
// Si una sección no viene → el backend NO la toca.
// Si viene "permisos: { id_permisos: [] }" → desasigna TODOS los permisos.
export interface UpdateUserPayload {
    datos?: {
        nombre?: string;
        rol?: RolCreable;
        email?: string | null;
        telefono?: string | null;
    };
    restricciones?: CreateUserPayload["restricciones"];
    permisos?: CreateUserPayload["permisos"];
}


// ─── Respuestas del backend ───────────────────────────────────────────────────

export interface CreateUserResponse {
    message: string;
    usuario: {
        id_usuario: number;
        usuario: string;
        nombre: string;
        rol: string;
        id_empresa: number;
        permisos_asignados: number;
    };
}

export interface UpdateUserResponse {
    message: string;
    id_usuario: number;
    actualizado: boolean;
}

export interface InhabilitarUserResponse {
    message: string;
    id_usuario: number;
    inhabilitado: boolean;
}


// ─── Errores 422 con campos por sección ──────────────────────────────────────
// El backend devuelve errores anidados con la misma forma del schema.
// El frontend los extrae sección por sección para mostrarlos en cada step.
export interface UserFieldErrors {
    datos?: {
        usuario?: string[];
        clave?: string[];
        nombre?: string[];
        rol?: string[];
        email?: string[];
        telefono?: string[];
    };
    restricciones?: {
        dias_acceso?: string[];
        hora_inicio_acceso?: string[];
        hora_fin_acceso?: string[];
        id_grupo_unidades?: string[];
        id_cliente?: string[];
        dias_consulta?: string[];
    };
    permisos?: {
        id_permisos?: string[];
    };
}


// ─── Resultado discriminado para create/update ───────────────────────────────
// Obliga al consumidor (wizard) a chequear `kind` antes de acceder a campos
// específicos — evita estados imposibles tipo {success: true, error: "..."}.
export type UserMutationResult<TSuccess> =
    | { kind: "success"; data: TSuccess }
    | { kind: "validation"; fields: UserFieldErrors }
    | { kind: "error"; message: string };


// ─── Tipos de respuesta de los endpoints sudo_erp exclusivos ─────────────────
// Estos NO se llaman desde Catálogos > Usuarios. El frontend del catálogo
// solo los necesita TIPADOS porque podría haber un PR futuro de "Panel ERP
// avanzado" que los consuma. Los dejamos aquí para tenerlos centralizados.
//
// Los endpoints se llaman desde:
//   - Reactivar:           PATCH  /admin-erp/empresas/<idEmp>/usuarios/<idUsr>/reactivar
//   - Eliminar permanente: DELETE /admin-erp/empresas/<idEmp>/usuarios/<idUsr>
//   - Reset password:      POST   /admin-erp/empresas/<idEmp>/usuarios/<idUsr>/reset-password

export interface ReactivarUserResponse {
    message: string;
    id_usuario: number;
    reactivado: boolean;
}

export interface DeleteUserPermanentResponse {
    message: string;
    id_usuario: number;
    eliminado: boolean;
}

export interface ResetPasswordResponse {
    message: string;
    id_usuario: number;
    password_temporal: string;   // se devuelve en claro UNA SOLA VEZ
}