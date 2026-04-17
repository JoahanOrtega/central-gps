import { notify } from "@/stores/notificationStore";

// ── Política única de manejo de errores del frontend ─────────
//
// Toda la app debe pasar por aquí. Nunca hacer catch manuales
// con lógica propia — eso produce inconsistencia entre módulos.
//
// REGLAS:
//
//   AbortError        → ignorar silenciosamente (cancelación intencional)
//   Error de carga    → mostrar inline con retry (usa setError)
//   Error de acción   → toast de error (sin setError)
//   Error inesperado  → mensaje genérico, log en consola (solo DEV)
//
// CUÁNDO USAR QUÉ:
//
//   Error de formulario      → validación inline por campo (NO usar handleError)
//   Error de carga principal → handleError(error, msg, setError)
//   Error de acción rápida  → handleError(error, msg)
//   Error inesperado         → handleError(error, msg)
//
// EJEMPLOS:
//
//   // Carga de datos — aparece inline con retry
//   catch (error) {
//     handleError(error, "No fue posible cargar las unidades", setError);
//   }
//
//   // Acción (guardar, eliminar) — aparece como toast
//   catch (error) {
//     handleError(error, "No fue posible guardar la unidad");
//   }

export const handleError = (
    error: unknown,
    fallbackMessage: string,
    // Con setter → error inline (carga de datos con retry visible)
    // Sin setter → toast    (acciones rápidas sin bloque en la UI)
    setError?: (msg: string) => void,
): void => {
    // Cancelaciones de AbortController — nunca mostrar al usuario
    if (error instanceof Error && error.name === "AbortError") return;

    const message = error instanceof Error ? error.message : fallbackMessage;

    if (setError) {
        setError(message);
    } else {
        notify.error(message);
    }

    // Log solo en desarrollo — nunca en producción
    if (import.meta.env.DEV) {
        console.error(`[handleError] ${fallbackMessage}:`, error);
    }
};