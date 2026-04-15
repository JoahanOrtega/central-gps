// Capa de verificación de permisos en el frontend.
//
// IMPORTANTE — Principio de seguridad:
// Esta capa es UX, no seguridad real. Su propósito es ocultar
// elementos de la interfaz que el usuario no debería ver.
// La seguridad real vive en el backend (decoradores @jwt_required,
// @sudo_erp_required, etc.). Nunca confiar solo en el frontend.
//
// Jerarquía de acceso:
//   sudo_erp      → acceso total, sin restricciones
//   admin_empresa → acceso total dentro de su empresa
//   usuario       → solo permisos explícitamente asignados

import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";

// ── Verificación de un solo permiso ──────────────────────
export const usePermiso = (clave: string | null): boolean => {
    const user = useAuthStore((state) => state.user);

    return useMemo(() => {
        // Sin sesión → sin acceso
        if (!user) return false;

        // null significa "visible para todos los autenticados"
        if (clave === null) return true;

        // sudo_erp tiene acceso total al sistema
        if (user.rol === "sudo_erp") return true;

        // admin_empresa tiene acceso total dentro de su empresa
        if (user.rol === "admin_empresa" || user.es_admin_empresa) return true;

        // Usuario normal: verificar en el campo permisos del JWT
        // Soporta formato legacy ("on,cund1,cund2") y wildcard ("*")
        const permisosRaw =
            (user as unknown as { permisos?: string }).permisos ?? "";

        if (permisosRaw === "*") return true;

        return permisosRaw
            .split(",")
            .map((p) => p.trim())
            .includes(clave);
    }, [user, clave]);
};


// ── Verificación de múltiples permisos a la vez ───────────
// Evita llamar usePermiso en un loop (viola las reglas de hooks).
//
// Uso:
//   const permisos = usePermisos(["cund1", "cclt1", "cpoi1"]);
//   permisos["cund1"] → true | false

export const usePermisos = (claves: (string | null)[]): Record<string, boolean> => {
    const user = useAuthStore((state) => state.user);

    return useMemo(() => {
        // Construir el mapa de permisos de una sola vez
        const esSudoErp = user?.rol === "sudo_erp";
        const esAdminEmpresa = user?.rol === "admin_empresa" || user?.es_admin_empresa;
        const permisosRaw = (user as unknown as { permisos?: string })?.permisos ?? "";
        const esWildcard = permisosRaw === "*";
        const lista = permisosRaw.split(",").map((p) => p.trim());

        return claves.reduce<Record<string, boolean>>((acc, clave) => {
            const key = clave ?? "__public__";

            if (!user) { acc[key] = false; return acc; }
            if (clave === null) { acc[key] = true; return acc; }
            if (esSudoErp) { acc[key] = true; return acc; }
            if (esAdminEmpresa) { acc[key] = true; return acc; }
            if (esWildcard) { acc[key] = true; return acc; }

            acc[key] = lista.includes(clave);
            return acc;
        }, {});
    }, [user, claves]);
};