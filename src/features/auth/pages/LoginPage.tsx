import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { CustomLogo } from "@/components/shared/CustomLogo";
import { LoginForm } from "../components/LoginForm";
import type { LoginFormValues } from "../types/auth.types";
import { authService } from "../services/authService";
import { ApiError } from "@/lib/api";
import { ShieldAlert } from "lucide-react";
import type { LoginLocationState } from "@/router/PrivateRoute";
import { markSessionStarted } from "@/router/PrivateRoute";

// Imagen de fondo del login
const BG_IMAGE_URL = "/images/app/bg-1.jpg";

interface LoginPageProps extends React.ComponentProps<"div"> { }

export const LoginPage = ({ className }: LoginPageProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, setToken, user } = useAuthStore();
  const [error, setError] = useState("");
  // Aviso de suspensión de cuenta
  const [avisoSuspension, setAvisoSuspension] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const hasRedirected = useRef(false);

  // Si la página se abrió porque la sesión expiró, mostrar un aviso
  const locationState = location.state as LoginLocationState | null;
  const sessionExpired = locationState?.reason === "expired";

  // Si ya hay sesión activa al cargar, redirigir a /home.
  useEffect(() => {
    if (token && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate("/home", { replace: true });
    }
  }, [token, user, navigate]);

  const handleLogin = async (values: LoginFormValues) => {
    setError("");
    try {
      setIsLoading(true);
      const response = await authService.login({
        username: values.username,
        password: values.password,
      });
      setToken(response.token);
      markSessionStarted();   // Habilita el aviso de "sesión expirada" al vencer
      navigate("/home", { replace: true });
    } catch (err) {
      // Si la empresa del usuario está suspendida, mostrar un aviso
      if (err instanceof ApiError && err.status === 403) {
        setAvisoSuspension(err.message);
        setError("");
      } else {
        setAvisoSuspension("");
        setError(err instanceof Error ? err.message : "Error al iniciar sesión");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-dvh w-full flex-col items-center justify-start bg-slate-100 bg-cover bg-center px-4 pb-10 pt-20 sm:justify-center sm:pt-10",
        className
      )}
      style={{ backgroundImage: `url(${BG_IMAGE_URL})` }}
    >
      <div className="absolute inset-0 bg-white/45 backdrop-blur-[2px]" />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        {/* Logo + títulos */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="w-60">
            <CustomLogo />
          </div>
          <h1 className="mt-6 text-xl font-semibold text-slate-800">
            Acceder al sistema
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Aviso de sesión expirada */}
        {sessionExpired && (
          <div
            role="status"
            aria-live="polite"
            className="mb-5 w-full rounded-lg border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-center text-sm text-amber-700 shadow-sm"
          >
            Tu sesión expiró. Inicia sesión nuevamente para continuar.
          </div>
        )}

        {/* Cuenta suspendida */}
        {avisoSuspension && (
          <div
            role="status"
            className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
          >
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Cuenta suspendida
              </p>
              <p className="mt-1 text-sm text-amber-700">{avisoSuspension}</p>
            </div>
          </div>
        )}
        <LoginForm onSubmit={handleLogin} isLoading={isLoading} error={error} />
      </div>
    </div>
  );
};