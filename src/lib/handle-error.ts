import { notify } from "@/stores/notificationStore";

// ── Política unificada de manejo de errores ───────────────────
//
// Reglas:
//   AbortError  → ignorar silenciosamente (cancelación intencional)
//   Error known → mostrar mensaje al usuario via toast
//   Error 5xx   → mensaje genérico + log en consola
//   Unknown     → mensaje genérico + log en consola
//
// Uso en componentes:
//   catch (error) {
//     handleError(error, "No fue posible cargar las unidades");
//   }
//
// Uso con setter de error local (para errores de carga de datos):
//   catch (error) {
//     handleError(error, "Error al cargar", setError);
//   }

export const handleError = (
    error: unknown,
    fallbackMessage: string,
    // Setter opcional para mostrar el error inline en lugar de toast
    setError?: (msg: string) => void,
): void => {
    // Cancelaciones intencionales — no mostrar nada al usuario
    if (error instanceof Error && error.name === "AbortError") return;

    const message =
        error instanceof Error ? error.message : fallbackMessage;

    if (setError) {
        // Error de carga de datos → mostrar inline en la vista
        setError(message);
    } else {
        // Error de acción (guardar, eliminar) → toast de error
        notify.error(message);
    }

    // Log estructurado solo en desarrollo
    if (import.meta.env.DEV) {
        console.error(`[handleError] ${fallbackMessage}:`, error);
    }
};