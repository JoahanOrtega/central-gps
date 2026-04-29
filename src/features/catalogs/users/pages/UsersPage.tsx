import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { UsersCatalogView } from "../components/UsersCatalogView";

/**
 * Página del módulo Catálogos > Usuarios.
 *
 * Wrapper delgado que solo:
 *   1. Define el title del navegador.
 *   2. Renderiza la vista principal.
 *
 * Mismo patrón que UnitsPage / PointsOfInterestPage del proyecto:
 * separar la página (con concerns globales como title) del componente
 * de vista (con la lógica de UI).
 *
 * Por qué este patrón:
 *   - Si en el futuro se decide dividir Users en sub-rutas (ej. /catalogs/users/audit),
 *     la página principal puede compartir el wrapper sin tocar la vista.
 *   - El testing de la vista no requiere lidiar con effects de title.
 */
export const UsersPage = () => {
    useDocumentTitle("Catálogo de Usuarios");
    return <UsersCatalogView />;
};