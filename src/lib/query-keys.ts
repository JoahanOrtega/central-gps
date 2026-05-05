// ── Query keys centralizadas ──────────────────────────────────────────────────
//
// Convenciones:
//   - <recurso>.all: invalidar TODAS las queries del recurso
//     Ej: invalidar catalogs.users.all tras crear/editar uno → refetch de
//     listado, detalle, etc.
//   - <recurso>.list(...args): listado paginado/filtrado
//   - <recurso>.detail(id): detalle individual
//
// El orden y nesting refleja el dominio del proyecto:
//   - units / pois / catalogs:  módulos del catálogo del usuario
//   - erp:                       módulo del Panel ERP (sudo_erp)
//   - catalogs.users:            ← nuevo, Catálogos > Usuarios

export const queryKeys = {
    units: {
        all: ["units"] as const,
        list: (idEmpresa: number | null | undefined, search = "") =>
            ["units", "list", idEmpresa, search] as const,
        // Detalle completo de una unidad (para el modal de edición).
        // Incluye id_empresa en la key porque el backend filtra campos
        // según el contexto de empresa del JWT — si el sudo_erp cambia
        // de empresa, el detalle es otro y el caché no debe cruzarse.
        detail: (idUnidad: number, idEmpresa: number | null | undefined) =>
            ["units", "detail", idUnidad, idEmpresa] as const,
    },
    pois: {
        all: ["pois"] as const,
        list: (idEmpresa: number | null | undefined, search = "") =>
            ["pois", "list", idEmpresa, search] as const,
        groups: (idEmpresa: number | null | undefined) =>
            ["pois", "groups", idEmpresa] as const,
        alerta: (idPoi: number, idEmpresa?: number | null) =>
            ["pois", "alerta", idPoi, idEmpresa] as const,

    },
    catalogs: {
        all: ["catalogs"] as const,
        operators: (idEmpresa: number | null | undefined) =>
            ["catalogs", "operators", idEmpresa] as const,
        unitGroups: (idEmpresa: number | null | undefined) =>
            ["catalogs", "unit-groups", idEmpresa] as const,
        avlModels: () => ["catalogs", "avl-models"] as const,
        clients: (idEmpresa: number | null | undefined) =>
            ["catalogs", "clients", idEmpresa] as const,

        // ─── Catálogos > Usuarios ───────────────────────────────────
        // El módulo nuevo del PR 4. La key incluye solo "users" como
        // segundo nivel — TanStack Query usa subcoincidencia de prefix,
        // así invalidar `["catalogs", "users"]` borra list + detail
        // automáticamente.
        //
        // No incluimos id_empresa en las keys porque el backend ya lo
        // toma del JWT y devuelve solo usuarios de la empresa actual.
        // Si el sudo_erp cambia de empresa via switch-company, el JWT
        // se renueva — TanStack Query refetcha tras un invalidate manual
        // que el switch-company ya hace.
        users: {
            all: ["catalogs", "users"] as const,
            list: () => ["catalogs", "users", "list"] as const,
            detail: (idUsuario: number) =>
                ["catalogs", "users", "detail", idUsuario] as const,
        },
    },
    erp: {
        all: ["erp"] as const,
        empresas: () => ["erp", "empresas"] as const,
        permisos: () => ["erp", "permisos"] as const,

        /**
         * QueryKey para el log de auditoría con filtros.
         *
         * Recibe los filtros como un objeto opaco para que TanStack Query
         * detecte automáticamente cualquier cambio (entidad, usuario,
         * acción, fechas) y refetche.
         *
         * El objeto se serializa como parte de la queryKey usando deep
         * equality — distintos valores generan distintos caches, mismos
         * valores reutilizan caché.
         */
        auditoria: (entidad: string, limit: number) =>
            ["erp", "auditoria", entidad, limit] as const,

        /**
         * QueryKey para la lista de usuarios con conteo de permisos.
         * Sin parámetros — la lista es global (todos los usuarios + empresas).
         * Se invalida después de un PUT exitoso para refrescar los conteos.
         */
        usersPermissions: () => ["erp", "users-permissions"] as const,

        /**
         * QueryKey para el detalle de permisos de un usuario en una empresa.
         *
         * La key incluye idUsuario e idEmpresa porque cada par tiene su
         * propio set de permisos. Cambiar de usuario o de empresa fuerza
         * un refetch automático.
         */
        userPermissionsDetail: (idUsuario: number, idEmpresa: number) =>
            ["erp", "user-permissions-detail", idUsuario, idEmpresa] as const,


        /**
         * QueryKey para la lista de usuarios con eventos en auditoría.
         * No tiene parámetros — la lista es la misma para cualquier sudo_erp.
         */
        auditUsers: () => ["erp", "auditUsers"] as const,

        // ── Recursos auxiliares para el wizard de creación de usuario ──
        // Se usan en Step2Restricciones para poblar los selectores de
        // grupos de unidades y clientes. La key incluye id_empresa porque
        // los recursos son específicos de cada empresa — al cambiar de
        // empresa (sudo_erp via switch) se invalida automáticamente.
        unitGroupsByEmpresa: (idEmpresa: number) =>
            ["erp", "unit-groups", idEmpresa] as const,
        clientsByEmpresa: (idEmpresa: number) =>
            ["erp", "clients", idEmpresa] as const,
    },
} as const;