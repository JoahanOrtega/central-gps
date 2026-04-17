// Guardia de ruta que protege todas las rutas privadas del sistema.
//
// Responsabilidades:
//   1. Llamar checkAndRefreshSession() al montar — expulsa silenciosamente
//      al usuario si su token guardado ya venció.
//   2. Redirigir a /login si no hay token válido, preservando la ruta
//      original en el estado para poder volver tras el login.
//   3. Pasar 'reason: expired' en el state cuando la sesión venció —
//      LoginPage lo lee para mostrar un mensaje explicativo al usuario.

import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

interface PrivateRouteProps {
  children: React.ReactNode;
}

// ── Tipos del state de navegación hacia /login ────────────────────────────────
// Exportado para que LoginPage pueda tiparlo sin duplicar la definición.
export interface LoginLocationState {
  from?: ReturnType<typeof useLocation>;
  // Motivo del redireccionamiento — usado por LoginPage para mostrar
  // feedback contextual al usuario en lugar de dejarlo sin explicación.
  reason?: "expired";
}

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const location = useLocation();
  const token = useAuthStore((state) => state.token);
  const isTokenExpired = useAuthStore((state) => state.isTokenExpired);
  const checkAndRefreshSession = useAuthStore((state) => state.checkAndRefreshSession);

  // Verificar expiración del token al montar el componente.
  // Cubre el caso: usuario que deja la sesión abierta y vuelve al día siguiente.
  useEffect(() => {
    checkAndRefreshSession();
  }, [checkAndRefreshSession]);

  if (!token) {
    // Detectar si había token pero ya expiró — en ese caso informar al usuario.
    // Si nunca hubo token (primera visita), no hay razón que comunicar.
    const reason = isTokenExpired() ? "expired" : undefined;

    const state: LoginLocationState = {
      from: location,
      ...(reason && { reason }),
    };

    return <Navigate to="/login" state={state} replace />;
  }

  return <>{children}</>;
};