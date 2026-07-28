import { lazy } from "react";
import type { ComponentType } from "react";

// Flag en sessionStorage para recargar UNA sola vez. Sin él, un error
// que no sea de chunk viejo (p. ej. red caída) provocaría un loop
// infinito de recargas.
const CLAVE_RECARGA = "cgps_chunk_recargado";

/**
 * lazy() con recuperación automática ante chunks viejos.
 *
 * Por qué existe: Vite genera nombres con hash por build
 * (DashboardPage-By-hbcYy.js). Tras un deploy, los usuarios con la app
 * abierta conservan en memoria el index.html anterior, cuyos imports
 * dinámicos apuntan a hashes que ya no existen en el servidor → 404 →
 * "Failed to fetch dynamically imported module" y pantalla de error al
 * navegar. Le pasaría a TODOS los usuarios activos en cada deploy.
 *
 * La recarga trae el index.html nuevo con los hashes correctos — es
 * exactamente lo que el usuario haría a mano, pero automático e invisible.
 */
export const lazyConRecarga = <T extends ComponentType<unknown>>(
    importar: () => Promise<{ default: T }>,
) =>
    lazy(async () => {
        try {
            const modulo = await importar();
            // Import exitoso: limpiar el flag para que un futuro deploy
            // pueda volver a recargar si hace falta.
            sessionStorage.removeItem(CLAVE_RECARGA);
            return modulo;
        } catch (error) {
            if (!sessionStorage.getItem(CLAVE_RECARGA)) {
                sessionStorage.setItem(CLAVE_RECARGA, "1");
                window.location.reload();
                // Promesa que nunca resuelve: la recarga ya está en curso
                // y no queremos que React pinte el error un instante.
                return new Promise(() => { }) as never;
            }
            // Segunda falla consecutiva: el problema no es un chunk viejo.
            // Propagar para que el errorElement de la ruta lo muestre.
            throw error;
        }
    });