import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { CustomLogo } from "@/components/shared/CustomLogo";
import { LoginForm } from "../components/LoginForm";
import type { LoginFormValues } from "../types/auth.types";
import { authService } from "../services/authService";
import bgImage from "@/assets/images/login-bg.jpg";

interface LoginPageProps extends React.ComponentProps<"div"> { }

export const LoginPage = ({ className }: LoginPageProps) => {
  const navigate = useNavigate();
  const { token, setToken, user } = useAuthStore();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const hasRedirected = useRef(false);

  // Si ya hay sesión activa al cargar, siempre ir a /home
  // El sudo_erp accede al panel ERP desde el botón en el navbar
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
      // Todos los roles aterrizan en /home
      // El sudo_erp tiene el botón del panel ERP en el navbar
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center bg-cover bg-center",
        className
      )}
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="absolute inset-0 bg-white/35 backdrop-blur-[1px]" />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6">
        <div className="mb-8 flex flex-col items-center">
          <div className="w-64 md:w-80">
            <CustomLogo />
          </div>
          <h2 className="mt-4 text-lg font-medium text-gray-700">
            Accesar al sistema
          </h2>
        </div>
        <LoginForm onSubmit={handleLogin} isLoading={isLoading} error={error} />
      </div>
    </div>
  );
};