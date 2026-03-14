import type { LoginPayload, LoginResponse } from "../types/auth.types"

const API_URL = "http://127.0.0.1:5000"

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Error al iniciar sesión")
    }

    return data
  },
}