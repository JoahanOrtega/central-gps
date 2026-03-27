import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginFormValues {
  username: string;
  password: string;
  remember: boolean;
}

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

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;

    setForm((prevState) => ({
      ...prevState,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (localError) {
      setLocalError("");
    }
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
        />
      </div>

      <div className="flex w-full flex-col gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          className="h-12 rounded-full bg-white/80"
          placeholder="Ingresa tu contraseña"
          disabled={isLoading}
        />
      </div>

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

      {displayedError && (
        <p className="w-full text-left text-sm text-red-500">
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
