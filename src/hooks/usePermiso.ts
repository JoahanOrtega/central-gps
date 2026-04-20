// Capa de verificación de permisos en el frontend.
//
// IMPORTANTE — Principio de seguridad:
// Esta capa es UX, no seguridad real. Su propósito es ocultar elementos
// de la interfaz que el backend luego rechazaría con 403. La seguridad
// real vive en el backend (decoradores @permiso_required, etc.).
// Nunca confiar solo en el frontend.
//
// Semántica — alineada con backend utils/auth_guard.py desde Fase A:
//
//   1. sudo_erp   → bypass total (único rol con privilegios hardcodeados).
//   2. cualquier rol (incluido admin_empresa)
//                 → se valida contra la lista `permisos` del JWT.
//                   La lista viene calculada por backend al login como la
//                   UNIÓN de r_rol_permisos + r_usuario_permisos.
//
// Esto significa que admin_empresa YA NO tiene bypass automático — si no
// hereda un permiso desde r_rol_permisos, el frontend oculta el botón
// correspondiente y el backend rechaza la petición.

import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";

// ── Normalización del campo permisos del JWT ─────────────────────────────────
//
// El backend nuevo devuelve `permisos: string[]`. Por compatibilidad soportamos:
//   - Array de strings: ["on", "cund1"]          ← formato nuevo
//   - Wildcard legacy:  "*"                       ← string especial
//   - Lista legacy:     "on,cund1,cpoi1"          ← string separado por comas
//   - undefined/null:   sin permisos              ← usuario sin permisos cargados
//
// Retorna:
//   { isWildcard: true }              → todos los permisos
//   { isWildcard: false, list: [...] }→ lista explícita de claves
const parsePermisos = (
    permisos: string[] | string | null | undefined,
): { isWildcard: boolean; list: string[] } => {
    if (permisos === "*") return { isWildcard: true, list: [] };
    if (Array.isArray(permisos)) return { isWildcard: false, list: permisos };
    if (typeof permisos === "string") {
        return {
            isWildcard: false,
            list: permisos.split(",").map((p) => p.trim()).filter(Boolean),
        };
    }
    return { isWildcard: false, list: [] };
};


// ── Verificación de un solo permiso ───────────────────────────────────────────
//
// Uso:
//   const puedeCrearUnidad = usePermiso("cund3");
//   if (puedeCrearUnidad) { ...mostrar botón... }
//
// Pasar `null` significa "visible para cualquier usuario autenticado".
export const usePermiso = (clave: string | null): boolean => {
    const user = useAuthStore((state) => state.user);

    return useMemo(() => {
        if (!user) return false;
        if (clave === null) return true;

        // sudo_erp: único bypass (mirror del backend)
        if (user.rol === "sudo_erp") return true;

        const { isWildcard, list } = parsePermisos(user.permisos);
        if (isWildcard) return true;

        return list.includes(clave);
    }, [user, clave]);
};


// ── Verificación de múltiples permisos a la vez ───────────────────────────────
//
// Evita llamar usePermiso en un loop (rompería las reglas de hooks si
// las claves son dinámicas). Calcula un mapa completo en un solo useMemo.
//
// Uso:
//   const permisos = usePermisos(["cund1", "cund3", "cpoi1"]);
//   permisos["cund3"]  // → true | false
//
// Nota sobre memoización: pasar un array literal como argumento creará una
// nueva referencia en cada render y forzará el recálculo. Para callers que
// necesitan estabilidad máxima, definir las claves como constante fuera del
// componente o envolverlas con useMemo.
export const usePermisos = (
    claves: (string | null)[],
): Record<string, boolean> => {
    const user = useAuthStore((state) => state.user);

    return useMemo(() => {
        const result: Record<string, boolean> = {};

        if (!user) {
            // Sin sesión → todo falso (excepto las claves null que son públicas)
            claves.forEach((clave) => {
                result[clave ?? "__public__"] = clave === null ? false : false;
            });
            return result;
        }

        const esSudoErp = user.rol === "sudo_erp";
        const { isWildcard, list } = parsePermisos(user.permisos);

        claves.forEach((clave) => {
            const key = clave ?? "__public__";

            if (clave === null) { result[key] = true; return; }
            if (esSudoErp) { result[key] = true; return; }
            if (isWildcard) { result[key] = true; return; }

            result[key] = list.includes(clave);
        });

        return result;
    }, [user, claves]);
};