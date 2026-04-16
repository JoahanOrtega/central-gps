import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LoginFormValues } from "../types/auth.types";

interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => Promise<void> | void;
  isLoading?: boolean;
  error?: string;
}

export const LoginForm = ({
  onSubmit,
  isLoading = false,
  error = "",
}: LoginFormProps) => {
  const [form, setForm] = useState<LoginFormValues>({
    username: "",
    password: "",
    remember: false,
  });

  const [localError, setLocalError] = useState("");
  // Controla si el campo de contraseña muestra el texto en claro
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;

    setForm((prevState) => ({
      ...prevState,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (localError) setLocalError("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");

    if (!form.username.trim() || !form.password.trim()) {
      setLocalError("Captura usuario y contraseña");
      return;
    }

    await onSubmit(form);
  };

  const displayedError = localError || error;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col items-center gap-5"
    >
      {/* ── Campo de usuario ── */}
      <div className="flex w-full flex-col gap-2">
        <Label htmlFor="username">Usuario</Label>
        <Input
          id="username"
          name="username"
          type="text"
          value={form.username}
          onChange={handleChange}
          className="h-12 rounded-full bg-white/80"
          placeholder="Ingresa tu usuario"
          disabled={isLoading}
          autoComplete="username"
        />
      </div>

      {/* ── Campo de contraseña con botón show/hide ── */}
      <div className="flex w-full flex-col gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={handleChange}
            className="h-12 rounded-full bg-white/80 pr-12"
            placeholder="Ingresa tu contraseña"
            disabled={isLoading}
            autoComplete="current-password"
          />
          {/* Botón para mostrar u ocultar la contraseña.
              type="button" evita que dispare el submit del form. */}
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isLoading}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-40"
          >
            {showPassword
              ? <EyeOff className="h-5 w-5" />
              : <Eye className="h-5 w-5" />
            }
          </button>
        </div>
      </div>

      {/* ── Checkbox recordarme ── */}
      <div className="self-start flex items-center gap-2 text-sm text-gray-600">
        <input
          id="remember"
          name="remember"
          type="checkbox"
          checked={form.remember}
          onChange={handleChange}
          className="h-4 w-4"
          disabled={isLoading}
        />
        <Label htmlFor="remember">Recordarme</Label>
      </div>

      {/* ── Mensaje de error accesible ──
          role="alert" hace que lectores de pantalla lo anuncien
          inmediatamente sin que el usuario deba navegar hasta él. */}
      {displayedError && (
        <p
          role="alert"
          aria-live="assertive"
          className="w-full text-left text-sm text-red-500"
        >
          {displayedError}
        </p>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="h-11 w-44 rounded-lg bg-sky-600 hover:bg-sky-700"
      >
        {isLoading ? "Ingresando..." : "Ingresar"}
      </Button>
    </form>
  );
};