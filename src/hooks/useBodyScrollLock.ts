import { useEffect } from "react";

/**
 * Bloquea el scroll del body mientras `locked` sea true.

 * Restaura el valor original de overflow al desmontar, incluso si otro
 * componente lo había modificado antes.
 *
 * @param locked  si true, bloquea el scroll del body
 */
export const useBodyScrollLock = (locked: boolean) => {
    useEffect(() => {
        if (!locked) return;

        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previous;
        };
    }, [locked]);
};