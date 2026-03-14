import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CustomLogo } from "@/components/shared/CustomLogo"

import { authService } from "../services/authService"
import { hasActiveSession, saveAuthSession } from "../utils/auth-storage"


import bgImage from "@/assets/images/login-bg.jpg"

interface LoginPageProps extends React.ComponentProps<"div"> { }

interface LoginFormState {
  username: string
  password: string
  remember: boolean
}

export const LoginPage = ({ className }: LoginPageProps) => {
  const navigate = useNavigate()

  const [form, setForm] = useState<LoginFormState>({
    username: "",
    password: "",
    remember: false,
  })

  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // si ya hay una sesión activa, redirigir al home
  useEffect(() => {
    if (hasActiveSession()) {
      navigate("/home", { replace: true })
    }
  }, [navigate])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target

    setForm((prevState) => ({
      ...prevState,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!form.username.trim() || !form.password.trim()) {
      setError("Captura usuario y contraseña")
      return
    }

    try {
      setIsLoading(true)

      const response = await authService.login({
        username: form.username,
        password: form.password,
      })

      saveAuthSession("session-active", response.user, form.remember)
      navigate("/home", { replace: true })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al iniciar sesión"

      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

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

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6">
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
            />
            <Label htmlFor="remember">Recordarme</Label>
          </div>

          {error && (
            <p className="w-full text-left text-sm text-red-500">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="h-11 w-44 rounded-lg bg-sky-600 hover:bg-sky-700"
          >
            {isLoading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  )
}