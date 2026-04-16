import { useEffect, useState } from "react";

// ── Hook que retrasa el apagado del estado de carga ───────────
//
// Problema que resuelve:
//   Cuando isLoading pasa a false y los datos llegan al mismo tiempo,
//   el skeleton se desmonta y las cards se montan en el mismo render.
//   El cerebro percibe el cambio abrupto como un parpadeo feo.
//
// Solución:
//   Mantener showSkeleton en true un breve instante después de que
//   isLoading se apagó — suficiente para que las cards ya estén
//   pintadas en el DOM antes de que el skeleton desaparezca.
//
// Uso:
//   const showSkeleton = useDelayedLoading(isLoading);
//   {showSkeleton && <SkeletonGrid />}
//   {!showSkeleton && items.map(...)}
//
// El delay por defecto es 150ms — imperceptible para el usuario
// pero suficiente para evitar el parpadeo visual.

export const useDelayedLoading = (
    isLoading: boolean,
    delayMs = 150,
): boolean => {
    const [showSkeleton, setShowSkeleton] = useState(isLoading);

    useEffect(() => {
        if (isLoading) {
            // Activar inmediatamente cuando empieza a cargar
            setShowSkeleton(true);
            return;
        }

        // Desactivar con un pequeño delay para suavizar la transición
        const timeout = setTimeout(() => {
            setShowSkeleton(false);
        }, delayMs);

        return () => clearTimeout(timeout);
    }, [isLoading, delayMs]);

    return showSkeleton;
};