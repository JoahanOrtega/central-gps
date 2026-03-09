import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomLogo } from "@/components/shared/CustomLogo";

import bgImage from "../../assets/images/login-bg.jpg";

interface LoginPageProps extends React.ComponentProps<"div"> {}

interface LoginFormState {
  username: string;
  password: string;
  remember: boolean;
}

export const LoginPage = ({ className }: LoginPageProps) => {
  const navigate = useNavigate();

  const [form, setForm] = useState<LoginFormState>({
    username: "",
    password: "",
    remember: false,
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;

    setForm((prevState) => ({
      ...prevState,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.username.trim() || !form.password.trim()) {
      alert("Captura usuario y contraseña");
      return;
    }

    localStorage.setItem("token", "mock-token");
    navigate("/home");
  };

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center bg-cover bg-center",
        className,
      )}
      style={{
        backgroundImage: `url(${bgImage})`,
      }}
    >
      <div className="absolute inset-0 bg-white/35 backdrop-blur-[1px]" />

      <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center">
        <div className="mb-8 flex flex-col items-center">
          <div className="w-64 md:w-80">
            <CustomLogo />
          </div>

          <h2 className="mt-4 text-lg font-medium text-gray-700">
            Accesar al sistema
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 w-full items-center"
        >
          <div className="flex flex-col gap-2 w-full">
            <Label htmlFor="username">Usuario</Label>
            <Input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              className="h-12 rounded-full bg-white/80"
              placeholder="Ingresa tu usuario"
            />
          </div>

          <div className="flex flex-col gap-2 w-full">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="h-12 rounded-full bg-white/80"
              placeholder="Ingresa tu contraseña"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 self-start">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              checked={form.remember}
              onChange={handleChange}
              className="h-4 w-4"
            />
            <Label htmlFor="remember">Recordarme</Label>
          </div>

          <Button
            type="submit"
            className="h-11 w-44 rounded-lg bg-sky-600 hover:bg-sky-700"
          >
            Ingresar
          </Button>
        </form>
      </div>
    </div>
  );
};
