import { useEffect, useState } from "react";

/**
 * Retrasa la actualización de un valor hasta que el usuario deja
 * de cambiar el input por `delayMs` milisegundos.
 *
 * El valor 350ms es suficientemente rápido
 * para sentirse responsivo y suficientemente lento para no disparar
 * una petición por cada tecla presionada.
 */
export const useDebounce = <T>(value: T, delayMs = 350): T => {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
};