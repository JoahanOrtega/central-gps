// Guardia de ruta exclusiva para el panel admin ERP.
// Solo permite acceso si el usuario tiene rol 'sudo_erp'.
// Cualquier otro rol redirige a /home/dashboard.

import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

interface ErpRouteProps {
    children: React.ReactNode;
}

export const ErpRoute = ({ children }: ErpRouteProps) => {
    const location = useLocation();
    const token = useAuthStore((state) => state.token);
    const isSudoErp = useAuthStore((state) => state.isSudoErp);

    // Sin sesión → login
    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Con sesión pero sin rol sudo_erp → dashboard normal
    if (!isSudoErp()) {
        return <Navigate to="/home/dashboard" replace />;
    }

    return <>{children}</>;
};