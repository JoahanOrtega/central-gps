import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type {
  LoginPayload,
  LoginResponse,
  ChangePasswordPayload,
  ChangePasswordResponse,
  ChangePasswordResult,
  ChangePasswordFieldErrors,
} from "../types/auth.types";

const API_URL = import.meta.env.VITE_API_URL ?? "";

// ── Tipo del body de error 422 que retorna marshmallow del backend ────────────
// Coincide exactamente con la respuesta de validate_payload() en el backend
// cuando un schema falla:
//   { error: "Datos invalidos", fields: { current_password: ["..."] } }
interface ValidationErrorBody {
  error?: string;
  fields?: ChangePasswordFieldErrors;
}

export const authService = {
  login(payload: LoginPayload): Promise<LoginResponse> {
    return apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: payload,
      requiresAuth: false,
    });
  },

  /**
   * Cambia la contraseña del usuario autenticado.
   *
   * Por qué no usa apiFetch:
   *   apiFetch tiene un contrato muy claro — devuelve T en éxito o
   *   throw Error en cualquier fallo. Para este endpoint necesitamos
   *   distinguir 3 estados (éxito / errores por campo / error genérico)
   *   y procesar el cuerpo del 422 sin perderlo. Hacer fetch directo
   *   aquí es más limpio que ensuciar apiFetch con un caso especial
   *   que solo este endpoint usa.
   *
   * Por qué NO se hace logout aquí en caso de 401:
   *   Un 401 en /auth/change-password significa "contraseña actual
   *   incorrecta", NO "sesión expirada". El access token sigue siendo
   *   válido. Si forzamos logout, el usuario que se equivocó al
   *   escribir su password actual perdería su sesión completa —
   *   pésima UX. Solo mostramos el error y dejamos que reintente.
   *
   * Estados retornados:
   *   - "success"    → cambio aplicado, el caller debe hacer logout y
   *                    redirigir a /login (los refresh tokens fueron
   *                    revocados en el backend).
   *   - "validation" → 422 con errores por campo, mostrar inline.
   *   - "error"      → cualquier otro fallo (401, 429, 500, red).
   *                    Mostrar como mensaje global del modal.
   */
  async changePassword(
    payload: ChangePasswordPayload,
  ): Promise<ChangePasswordResult> {
    // Token actual del store. Si no hay token, no debería llegar
    // aquí (el modal solo se monta dentro de /home protegido por
    // PrivateRoute), pero validamos por defensa en profundidad.
    const token = useAuthStore.getState().token;

    if (!token) {
      return {
        kind: "error",
        message: "No hay sesión activa. Vuelve a iniciar sesión.",
      };
    }

    let response: Response;

    try {
      response = await fetch(`${API_URL}/auth/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // credentials: "include" es necesario para que el navegador
        // reciba el Set-Cookie que limpia el refresh_token actual.
        credentials: "include",
        body: JSON.stringify(payload),
      });
    } catch {
      // Error de red — sin response. Tratar como error genérico.
      return {
        kind: "error",
        message: "No fue posible conectar con el servidor",
      };
    }

    // Parseo defensivo del body. Si el backend devolviera HTML por
    // error de infraestructura (ej. nginx 502), JSON.parse explotaría.
    let data: unknown = null;
    const rawText = await response.text();

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      return {
        kind: "error",
        message: "Respuesta inválida del servidor",
      };
    }

    // ── 200: éxito ───────────────────────────────────────────────────────────
    if (response.ok) {
      const successData = data as ChangePasswordResponse | null;
      return {
        kind: "success",
        message: successData?.message ?? "Contraseña actualizada correctamente",
      };
    }

    // ── 422: validación falló — extraer errores por campo ────────────────────
    if (response.status === 422) {
      const validation = data as ValidationErrorBody | null;

      // Si por alguna razón el backend devolvió 422 sin `fields`,
      // degradamos a error genérico con el mensaje principal.
      if (!validation?.fields) {
        return {
          kind: "error",
          message: validation?.error ?? "Datos inválidos",
        };
      }

      return { kind: "validation", fields: validation.fields };
    }

    // ── 429: rate limit ──────────────────────────────────────────────────────
    // El handler global del backend retorna un mensaje específico para 429,
    // pero por si llega vacío caemos a un mensaje claro.
    if (response.status === 429) {
      const errorData = data as { error?: string } | null;
      return {
        kind: "error",
        message:
          errorData?.error ??
          "Demasiados intentos. Espera un momento e intenta de nuevo.",
      };
    }

    // ── 401, 500, otros: error genérico ──────────────────────────────────────
    const errorData = data as { error?: string; message?: string } | null;
    return {
      kind: "error",
      message:
        errorData?.error ??
        errorData?.message ??
        "Ocurrió un error al cambiar la contraseña",
    };
  },
};