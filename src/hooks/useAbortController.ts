import { useEffect, useRef } from "react";

// ── Hook para abortar peticiones fetch al desmontar ───────────
//
// Problema que resuelve:
//   Si el usuario navega a otra página mientras una petición está
//   en vuelo, el callback intenta actualizar estado de un componente
//   ya desmontado → memory leak + warning de React en desarrollo.
//
// Uso:
//   const { signal, abort } = useAbortController();
//
//   const loadData = async () => {
//     const data = await apiFetch("/units", { signal });
//   };
//
//   // Al desmontar el componente, abort() se llama automáticamente.
//   // Si quieres cancelar manualmente (ej: al cambiar empresa):
//   abort();
//
// Nota: apiFetch ya acepta `signal` a través de RequestInit,
// por eso no necesita modificarse.

export const useAbortController = () => {
    const controllerRef = useRef<AbortController | null>(null);

    // Crea un nuevo AbortController y retorna su signal
    const getSignal = (): AbortSignal => {
        // Abortar el anterior si existe antes de crear uno nuevo
        controllerRef.current?.abort();
        controllerRef.current = new AbortController();
        return controllerRef.current.signal;
    };

    const abort = () => {
        controllerRef.current?.abort();
        controllerRef.current = null;
    };

    // Abortar automáticamente al desmontar el componente
    useEffect(() => {
        return () => {
            controllerRef.current?.abort();
        };
    }, []);

    return { getSignal, abort };
};