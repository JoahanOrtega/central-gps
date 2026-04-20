// ── Query keys centralizadas ──────────────────────────────────────────────────
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
    },
    erp: {
        all: ["erp"] as const,
        empresas: () => ["erp", "empresas"] as const,
        permisos: () => ["erp", "permisos"] as const,
        auditoria: (entidad: string, limit: number) =>
            ["erp", "auditoria", entidad, limit] as const,
    },
} as const;