// Helper puro (sin React, sin Google Maps) del rastreo público.

// Formatea "hace X" a partir de un ISO. Más amable que un timestamp crudo
// para quien abre el enlace y solo quiere saber qué tan fresca es la señal.
export const tiempoRelativo = (iso: string | null): string => {
    if (!iso) return "sin datos";
    const fecha = new Date(iso);
    const segs = Math.floor((Date.now() - fecha.getTime()) / 1000);
    if (segs < 60) return "hace unos segundos";
    if (segs < 3600) return `hace ${Math.floor(segs / 60)} min`;
    if (segs < 86400) return `hace ${Math.floor(segs / 3600)} h`;
    return `hace ${Math.floor(segs / 86400)} d`;
};