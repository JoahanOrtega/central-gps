import { useEffect, type RefObject } from "react";

/**
 * Ejecuta un callback cuando se hace click fuera del elemento referenciado.
 *
 * @param ref       referencia al elemento contenedor
 * @param callback  función a ejecutar al hacer click fuera
 * @param enabled   solo escucha cuando es true (ej: cuando el menú está abierto)
 */
export const useClickOutside = (
    ref: RefObject<HTMLElement | null>,
    callback: () => void,
    enabled = true,
) => {
    useEffect(() => {
        if (!enabled) return;

        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                callback();
            }
        };

        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [ref, callback, enabled]);
};