import type { LoginPayload, LoginResponse } from "../types/auth.types";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL no está definida");
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    let response: Response;

    try {
      response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error("No fue posible conectar con el servidor");
    }

    const rawText = await response.text();

    let data: any = null;

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      throw new Error("La respuesta del servidor no es JSON válido");
    }

    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error("Ocurrió un error interno. Intenta nuevamente.");
      }

      throw new Error(data?.error || "Error al iniciar sesión");
    }

    if (!data) {
      throw new Error("El servidor no devolvió información");
    }

    return data as LoginResponse;
  },
};
