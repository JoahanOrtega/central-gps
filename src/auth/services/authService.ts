import { apiFetch } from "@/lib/api";
import type { LoginPayload, LoginResponse } from "../types/auth.types";

export const authService = {
  login(payload: LoginPayload): Promise<LoginResponse> {
    return apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: payload,
      requiresAuth: false,
    });
  },
};
