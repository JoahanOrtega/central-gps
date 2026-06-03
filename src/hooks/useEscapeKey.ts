import { useEffect } from "react";

/**
 * @param callback  función a ejecutar cuando se presiona Escape
 * @param enabled   solo escucha cuando es true (ej: cuando el menú está abierto)
 */
export const useEscapeKey = (callback: () => void, enabled = true) => {
    useEffect(() => {
        if (!enabled) return;

        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") callback();
        };

        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [callback, enabled]);
};