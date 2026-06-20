const API_URL = import.meta.env.VITE_API_URL ?? "";

// El backend guarda una ruta relativa ("/units/images/abc.jpg"). Para el <img>
// hay que anteponer el origen de la API. Las rutas absolutas (http) o data URIs
// se dejan tal cual.
export const resolveUnitImageSrc = (ruta?: string | null): string | null => {
    if (!ruta) return null;
    if (ruta.startsWith("http") || ruta.startsWith("data:")) return ruta;
    return `${API_URL}${ruta}`;
};