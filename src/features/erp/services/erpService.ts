// Capa de servicio que conecta el panel ERP con los endpoints Flask /admin-erp/...
// Sigue el mismo patrón que los demás services del proyecto (apiFetch).

import { apiFetch } from "@/lib/api";
import type {
    EmpresaResumen,
    EmpresaFormData,
    UsuarioEmpresa,
    AdminEmpresaFormData,
    AdminEmpresaCreado,
    PermisoSistema,
    PermisoFormData,
    RegistroAuditoria,
    UsuarioAuditoria,
    FiltrosAuditoria,
} from "../types/erp.types";

// ── Empresas ──────────────────────────────────────────────

/** Obtiene el resumen de todas las empresas para el dashboard ERP */
export const getEmpresas = (): Promise<EmpresaResumen[]> =>
    apiFetch<EmpresaResumen[]>("/admin-erp/empresas");

/** Crea una nueva empresa */
export const createEmpresa = (data: EmpresaFormData): Promise<{ id_empresa: number }> =>
    apiFetch("/admin-erp/empresas", { method: "POST", body: data });

/** Actualiza los datos de una empresa */
export const updateEmpresa = (
    id: number,
    data: Partial<EmpresaFormData>
): Promise<{ actualizado: boolean }> =>
    apiFetch(`/admin-erp/empresas/${id}`, { method: "PUT", body: data });

/** Activa (status=1) o suspende (status=0) una empresa */
export const toggleEmpresaStatus = (
    id: number,
    status: 0 | 1
): Promise<{ actualizado: boolean }> =>
    apiFetch(`/admin-erp/empresas/${id}/status`, { method: "PATCH", body: { status } });

// ── Usuarios de empresa ───────────────────────────────────

/** Lista todos los usuarios de una empresa */
export const getUsuariosEmpresa = (idEmpresa: number): Promise<UsuarioEmpresa[]> =>
    apiFetch<UsuarioEmpresa[]>(`/admin-erp/empresas/${idEmpresa}/usuarios`);

/**
 * Crea un usuario admin para una empresa existente.
 *
 * El backend asegura la atomicidad de la operación:
 *   - Inserta en t_usuarios (con bcrypt)
 *   - Inserta en r_empresa_usuarios con es_admin=1
 *   - Registra auditoría
 * Si algo falla, rollback completo.
 *
 * Errores posibles (la función lanza apiFetchError con el mensaje):
 *   - 404: La empresa no existe o está inactiva
 *   - 409: El nombre de usuario ya está en uso
 *   - 422: Datos inválidos (fields con el detalle por campo)
 */
export const createAdminEmpresa = (
    idEmpresa: number,
    data: AdminEmpresaFormData,
): Promise<{ message: string; usuario: AdminEmpresaCreado }> =>
    apiFetch(`/admin-erp/empresas/${idEmpresa}/usuarios`, {
        method: "POST",
        body: data,
    });

/** Promueve o revoca el rol admin de empresa a un usuario */
export const setAdminEmpresa = (
    idEmpresa: number,
    idUsuario: number,
    esAdmin: boolean
): Promise<{ actualizado: boolean }> =>
    apiFetch(`/admin-erp/empresas/${idEmpresa}/usuarios/${idUsuario}/admin`, {
        method: "PATCH",
        body: { es_admin: esAdmin },
    });

// ── Permisos del sistema ──────────────────────────────────

/** Obtiene el catálogo completo de permisos con conteo de uso */
export const getPermisos = (): Promise<PermisoSistema[]> =>
    apiFetch<PermisoSistema[]>("/admin-erp/permisos");

/** Agrega un nuevo permiso al catálogo del sistema */
export const createPermiso = (data: PermisoFormData): Promise<{ id_permiso: number }> =>
    apiFetch("/admin-erp/permisos", { method: "POST", body: data });

// ── Auditoría ─────────────────────────────────────────────

/**
 * Obtiene el log de auditoría con filtros opcionales.
 *
 * Filtros todos opcionales y combinables. Solo se incluyen en el query
 * string los que el usuario aplicó — los `undefined` se omiten.
 */
export const getAuditoria = (
    params?: FiltrosAuditoria,
): Promise<RegistroAuditoria[]> => {
    const query = new URLSearchParams();

    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.entidad) query.set("entidad", params.entidad);
    if (params?.id_usuario)
        query.set("id_usuario", String(params.id_usuario));
    if (params?.accion) query.set("accion", params.accion);
    if (params?.fecha_desde) query.set("fecha_desde", params.fecha_desde);
    if (params?.fecha_hasta) query.set("fecha_hasta", params.fecha_hasta);

    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<RegistroAuditoria[]>(`/admin-erp/auditoria${qs}`);
};

/**
 * Obtiene la lista de usuarios que tienen al menos un evento en
 * la bitácora de auditoría.
 *
 * Sirve para popular el dropdown filtrable de la página de Auditoría.
 * Devuelve hasta 200 usuarios ordenados por total_eventos DESC.
 */
export const getAuditUsers = (): Promise<UsuarioAuditoria[]> =>
    apiFetch<UsuarioAuditoria[]>("/admin-erp/auditoria/usuarios");
