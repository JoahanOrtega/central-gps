// Guardia de ruta que protege todas las rutas privadas del sistema.
//
// Responsabilidades:
//   1. Al montar, intentar restaurar la sesión via refresh token (cookie HttpOnly).
//      Si la cookie existe y es válida → renueva el access token silenciosamente.
//   2. Mostrar un spinner mientras se verifica — evita el flash de /login.
//   3. Redirigir a /login si no hay sesión válida, preservando la ruta original.
//   4. Pasar 'reason: expired' SOLO cuando había sesión previa — no en la primera visita.

import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

interface PrivateRouteProps {
  children: React.ReactNode;
}

export interface LoginLocationState {
  from?: ReturnType<typeof useLocation>;
  reason?: "expired";
}

// ── Marca de sesión previa ────────────────────────────────────────────────────
// Bandera simple en localStorage que indica si el usuario tuvo sesión activa.
// Solo se usa para mostrar "Tu sesión expiró" — no almacena datos sensibles.
//
// Se activa en LoginPage tras un login exitoso (markSessionStarted).
// Se borra cuando PrivateRoute detecta que la sesión ya no es válida.
const HAD_SESSION_KEY = "cgps_had_session";

export const markSessionStarted = () =>
  localStorage.setItem(HAD_SESSION_KEY, "1");

export const clearSessionMark = () =>
  localStorage.removeItem(HAD_SESSION_KEY);

const hadSessionBefore = (): boolean =>
  localStorage.getItem(HAD_SESSION_KEY) === "1";

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const location = useLocation();
  const token = useAuthStore((state) => state.token);
  const tryRestoreSession = useAuthStore((state) => state.tryRestoreSession);

  // null  → verificación en curso (mostrar spinner)
  // true  → sesión válida (mostrar la app)
  // false → sin sesión (redirigir a /login)
  const [sessionState, setSessionState] = useState<boolean | null>(null);

  useEffect(() => {
    // Si ya hay access token en memoria no hay que consultar al servidor
    if (token) {
      setSessionState(true);
      return;
    }

    // Sin token → intentar restaurar desde la cookie del refresh token
    tryRestoreSession().then((restored) => {
      setSessionState(restored);
    });
  }, [token, tryRestoreSession]);

  // Spinner mientras se verifica — evita flash de la página de login
  if (sessionState === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (!sessionState) {
    // Solo mostrar "sesión expirada" si el usuario realmente tuvo sesión antes.
    // En la primera visita no había sesión — el mensaje confundiría al usuario.
    const reason = hadSessionBefore() ? "expired" : undefined;
    clearSessionMark();

    const state: LoginLocationState = {
      from: location,
      ...(reason && { reason }),
    };
    return <Navigate to="/login" state={state} replace />;
  }

  return <>{children}</>;
};