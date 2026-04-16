// Guardia de ruta que protege todas las rutas privadas del sistema.
//
// Responsabilidades:
//   1. Llamar checkAndRefreshSession() al montar — expulsa silenciosamente
//      al usuario si su token guardado en localStorage ya venció.
//   2. Redirigir a /login si no hay token válido, preservando la ruta
//      original en el estado para poder volver tras el login.

import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const location = useLocation();
  const token = useAuthStore((state) => state.token);
  const checkAndRefreshSession = useAuthStore((state) => state.checkAndRefreshSession);

  // Verificar expiración del token al montar el componente.
  // Cubre el caso: usuario que deja la sesión abierta y vuelve al día siguiente.
  useEffect(() => {
    checkAndRefreshSession();
  }, [checkAndRefreshSession]);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
