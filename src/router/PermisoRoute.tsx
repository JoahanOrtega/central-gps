// Guardia de ruta que verifica permisos antes de renderizar una página.
//
// A diferencia de ocultar items en el navbar (que es solo UX),
// esta capa impide el acceso directo por URL aunque el usuario
// conozca la ruta de memoria o la escriba en la barra del navegador.
//
// Si el usuario no tiene el permiso requerido → redirige a /home/dashboard
// Si no hay sesión → redirige a /login
//
// Uso en AppRouter:
//   { path: "catalogs/units", element: (
//       <PermisoRoute permiso="cund1">
//         <UnitsPage />
//       </PermisoRoute>
//   )}

import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { usePermiso } from "@/hooks/usePermiso";

interface PermisoRouteProps {
    children: React.ReactNode;
    // Permiso requerido para acceder a esta ruta.
    // null = cualquier usuario autenticado puede acceder.
    permiso: string | null;
}

export const PermisoRoute = ({ children, permiso }: PermisoRouteProps) => {
    const location = useLocation();
    const token = useAuthStore((state) => state.token);
    const tiene = usePermiso(permiso);

    // Sin sesión → login
    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Sin permiso → dashboard (no revelar que la ruta existe con un 403)
    if (!tiene) {
        return <Navigate to="/home/dashboard" replace />;
    }

    return <>{children}</>;
};