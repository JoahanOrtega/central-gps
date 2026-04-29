// ─── Service del módulo Catálogos > Usuarios ─────────────────────────────────
//
// Wraps los 5 endpoints públicos de /catalogs/users + 3 endpoints
// exclusivos del sudo_erp en /admin-erp/empresas/<idEmp>/usuarios/...
//
// Patrón de retorno:
//   - list, getDetail, inhabilitar: usan apiFetch (lanzan Error en fallo)
//   - create, update: NO usan apiFetch porque necesitamos preservar el
//     shape `fields` de los errores 422 para que el wizard pueda saltar
//     al step correcto. Devuelven UserMutationResult discriminado.
//
// Mismo patrón que ya hicimos en authService.changePassword y en
// erpService.createUsuarioCompleto del mensaje 3 — consistencia con el
// resto del proyecto.

import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type {
    UserListItem,
    UserDetail,
    CreateUserPayload,
    CreateUserResponse,
    UpdateUserPayload,
    UpdateUserResponse,
    InhabilitarUserResponse,
    UserMutationResult,
    UserFieldErrors,
    GrupoUnidadOption,
    ClienteOption,
    ReactivarUserResponse,
    DeleteUserPermanentResponse,
    ResetPasswordResponse,
} from "../types/user.types";

const API_URL = import.meta.env.VITE_API_URL ?? "";


// ─── Helper interno: parseo de respuesta con shape `fields` ──────────────────
// Centraliza el patrón de:
//   1. Hacer fetch con token y manejo de error de red
//   2. Parsear body con tolerancia a respuestas no-JSON (502, 504)
//   3. Distinguir success / 422 / otros errores
//
// Recibe una función `parseSuccess` para tipar correctamente el éxito en
// cada endpoint sin duplicar todo el boilerplate.
async function fetchWithFieldErrors<TSuccess>(
    url: string,
    method: "POST" | "PATCH",
    body: unknown,
): Promise<UserMutationResult<TSuccess>> {
    const token = useAuthStore.getState().token;

    if (!token) {
        return {
            kind: "error",
            message: "No hay sesión activa. Vuelve a iniciar sesión.",
        };
    }

    let response: Response;

    try {
        response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            credentials: "include",
            body: JSON.stringify(body),
        });
    } catch {
        return {
            kind: "error",
            message: "No fue posible conectar con el servidor",
        };
    }

    // Parseo defensivo: si nginx devuelve HTML (502/504) o body corrupto,
    // no queremos que JSON.parse explote y rompa la UI.
    let data: unknown = null;
    const rawText = await response.text();

    try {
        data = rawText ? JSON.parse(rawText) : null;
    } catch {
        return {
            kind: "error",
            message: "Respuesta inválida del servidor",
        };
    }

    // ── 2xx: éxito ──────────────────────────────────────────────────────
    if (response.ok) {
        return { kind: "success", data: data as TSuccess };
    }

    // ── 422: validación falló — extraer errores por sección ─────────────
    if (response.status === 422) {
        const validation = data as {
            error?: string;
            fields?: UserFieldErrors;
        } | null;

        if (validation?.fields) {
            return { kind: "validation", fields: validation.fields };
        }
        // 422 sin `fields` → tratar como error genérico
        return {
            kind: "error",
            message: validation?.error ?? "Datos inválidos",
        };
    }

    // ── Otros: 400, 403, 404, 409, 500 — error genérico ────────────────
    const errorData = data as { error?: string; code?: string } | null;

    // Mapeo de códigos del backend a mensajes en español más amigables.
    // El backend ya manda mensajes claros, pero algunos códigos pueden
    // beneficiarse de una traducción específica.
    const codeMessages: Record<string, string> = {
        USERNAME_TAKEN: "Ese nombre de usuario ya está en uso",
        USER_NOT_FOUND: "El usuario no existe o no pertenece a tu empresa",
        EMPRESA_NOT_FOUND: "La empresa no existe o está inactiva",
        INVALID_PERMISSIONS: "Algunos de los permisos seleccionados no son válidos",
        CANNOT_INHABILITAR_SELF: "No puedes inhabilitarte a ti mismo",
        CANNOT_INHABILITAR_SUDO: "No se puede inhabilitar al administrador del sistema",
    };

    const code = errorData?.code;
    const friendly = code ? codeMessages[code] : undefined;

    return {
        kind: "error",
        message: friendly ?? errorData?.error ?? "Ocurrió un error",
    };
}


// ─────────────────────────────────────────────────────────────────────────────
// API PÚBLICA — Catálogos > Usuarios (todos los roles con permiso)
// ─────────────────────────────────────────────────────────────────────────────

export const userService = {
    /**
     * Lista usuarios activos de la empresa actual.
     *
     * El backend toma id_empresa del JWT — no necesitamos pasarlo.
     * Como esta es una operación de lectura simple sin manejo de
     * errores 422 con campos, usamos apiFetch directamente.
     */
    list: (signal?: AbortSignal): Promise<UserListItem[]> =>
        apiFetch<UserListItem[]>("/catalogs/users", { method: "GET", signal }),

    /**
     * Obtiene el detalle de un usuario para edición.
     *
     * Estructura espeja el shape del wizard (datos / restricciones / permisos)
     * para pre-llenar el form sin transformaciones.
     *
     * Si el usuario no existe o no pertenece a la empresa del que llama,
     * lanza Error (apiFetch traduce el 404 en throw).
     */
    getDetail: (idUsuario: number, signal?: AbortSignal): Promise<UserDetail> =>
        apiFetch<UserDetail>(`/catalogs/users/${idUsuario}`, {
            method: "GET",
            signal,
        }),

    /**
     * Crea un usuario nuevo.
     *
     * Devuelve UserMutationResult discriminado para que el wizard
     * pueda distinguir entre éxito, error de validación (con fields
     * por sección) y otros errores genéricos.
     */
    create: (payload: CreateUserPayload) =>
        fetchWithFieldErrors<CreateUserResponse>(
            `${API_URL}/catalogs/users`,
            "POST",
            payload,
        ),

    /**
     * Actualiza parcialmente un usuario.
     *
     * El payload acepta secciones opcionales (datos / restricciones /
     * permisos). Si una sección no viene, el backend no la toca.
     *
     * Para desasignar todos los permisos: enviar
     *   { permisos: { id_permisos: [] } }
     */
    update: (idUsuario: number, payload: UpdateUserPayload) =>
        fetchWithFieldErrors<UpdateUserResponse>(
            `${API_URL}/catalogs/users/${idUsuario}`,
            "PATCH",
            payload,
        ),

    /**
     * Inhabilita (soft-delete) un usuario activo.
     *
     * Reglas (validadas en backend):
     *   - No puedes inhabilitarte a ti mismo
     *   - No se puede inhabilitar a un sudo_erp
     *
     * Reactivar (status 0 → 1) NO se hace desde aquí — es exclusivo
     * del Panel ERP. Si el usuario intenta enviar status=1, el backend
     * responde 403 con un mensaje que dirige al lugar correcto.
     */
    inhabilitar: (idUsuario: number): Promise<InhabilitarUserResponse> =>
        apiFetch<InhabilitarUserResponse>(
            `/catalogs/users/${idUsuario}/status`,
            {
                method: "PATCH",
                body: { status: 0 },
            },
        ),
};


// ─────────────────────────────────────────────────────────────────────────────
// API EXCLUSIVA — Operaciones del sudo_erp (Panel ERP avanzado)
// ─────────────────────────────────────────────────────────────────────────────
// Estas funciones se exportan aparte porque NO se consumen desde el módulo
// Catálogos > Usuarios. Se mantienen aquí (en lugar de erpService.ts) porque
// son operaciones SOBRE usuarios — temáticamente pertenecen al dominio.
//
// El frontend que las consuma (futuro Panel ERP) las importará selectivamente:
//   import { sudoUserService } from "@/features/catalogs/users/services/userService";

export const sudoUserService = {
    /**
     * Reactiva un usuario inhabilitado (status 0 → 1).
     *
     * Solo el sudo_erp puede ejecutar esta operación. Conserva todos los
     * permisos y restricciones que el usuario tenía antes — al inhabilitar
     * no se borraron, solo se "ocultaron" del listado.
     */
    reactivar: (
        idEmpresa: number,
        idUsuario: number,
    ): Promise<ReactivarUserResponse> =>
        apiFetch<ReactivarUserResponse>(
            `/admin-erp/empresas/${idEmpresa}/usuarios/${idUsuario}/reactivar`,
            { method: "PATCH" },
        ),

    /**
     * Elimina PERMANENTEMENTE a un usuario (DELETE FROM t_usuarios).
     *
     * OPERACIÓN IRREVERSIBLE. Casos de uso:
     *   - GDPR / derecho al olvido
     *   - Limpieza de cuentas de prueba
     *
     * Reglas (validadas en backend):
     *   - El sudo_erp NO puede eliminarse a sí mismo
     *   - No se puede eliminar a otro sudo_erp
     */
    deletePermanent: (
        idEmpresa: number,
        idUsuario: number,
    ): Promise<DeleteUserPermanentResponse> =>
        apiFetch<DeleteUserPermanentResponse>(
            `/admin-erp/empresas/${idEmpresa}/usuarios/${idUsuario}`,
            { method: "DELETE" },
        ),

    /**
     * Resetea la contraseña a una temporal generada por el backend.
     *
     * La password se devuelve EN CLARO en la respuesta UNA SOLA VEZ.
     * El sudo_erp es responsable de comunicarla por canal seguro
     * (no email plano).
     *
     * IMPORTANTE: NO loguear la response.password_temporal en consola
     * ni guardarla en estado persistente. Solo mostrarla en un modal
     * "copia esta contraseña ahora, no la verás de nuevo".
     */
    resetPassword: (
        idEmpresa: number,
        idUsuario: number,
    ): Promise<ResetPasswordResponse> =>
        apiFetch<ResetPasswordResponse>(
            `/admin-erp/empresas/${idEmpresa}/usuarios/${idUsuario}/reset-password`,
            { method: "POST" },
        ),
};


// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — Recursos auxiliares para el wizard (Step 2)
// ─────────────────────────────────────────────────────────────────────────────
// Lista grupos de unidades y clientes de una empresa para poblar los
// selectores del Step 2 (Restricciones). El backend ya tiene estos
// endpoints listos para reutilizar — no creamos nada nuevo.

/**
 * Lista grupos de unidades disponibles en una empresa.
 *
 * Reusa el endpoint /unit-groups del módulo de catálogos. Pasamos
 * id_empresa explícitamente porque el sudo_erp puede estar creando
 * un usuario para una empresa distinta a su contexto activo.
 */
export const getUnitGroupsByEmpresa = (
    idEmpresa: number,
    signal?: AbortSignal,
): Promise<GrupoUnidadOption[]> =>
    apiFetch<GrupoUnidadOption[]>(
        `/unit-groups?id_empresa=${idEmpresa}`,
        { method: "GET", signal },
    );


/**
 * Lista clientes de una empresa.
 *
 * Reusa el endpoint /clients del módulo POIs (devuelve {id_cliente, nombre}).
 */
export const getClientsByEmpresa = (
    idEmpresa: number,
    signal?: AbortSignal,
): Promise<ClienteOption[]> =>
    apiFetch<ClienteOption[]>(
        `/clients?id_empresa=${idEmpresa}`,
        { method: "GET", signal },
    );