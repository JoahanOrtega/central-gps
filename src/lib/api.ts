import { useAuthStore } from "@/stores/authStore";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL no está definida. Revisa tu archivo .env");
}

// ── Tipo para las respuestas de error del backend ─────────────
// El backend devuelve { error: string } en respuestas no exitosas.
interface ApiErrorResponse {
  error?: string;
  message?: string;
}

// ── Opciones extendidas para apiFetch ─────────────────────────
interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  requiresAuth?: boolean;
}

// ── Extrae el mensaje de error de una respuesta del backend ───
// Soporta tanto { error: "..." } como { message: "..." } para
// mayor compatibilidad con diferentes versiones del backend.
const parseErrorMessage = (data: unknown, fallback: string): string => {
  if (data && typeof data === "object") {
    const errorData = data as ApiErrorResponse;
    return errorData.error ?? errorData.message ?? fallback;
  }
  return fallback;
};

// ── Cliente HTTP centralizado ─────────────────────────────────
// Todas las peticiones al backend pasan por aquí.
// Responsabilidades:
//   - Adjuntar el token JWT en el header Authorization
//   - Parsear la respuesta como JSON
//   - Manejar errores 401 (sesión expirada) y 5xx (errores del servidor)
//   - Hacer logout automático ante un 401
export const apiFetch = async <T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> => {
  const { body, requiresAuth = true, headers, ...rest } = options;

  // Obtener el token directamente del store Zustand (fuera de un componente)
  const token = useAuthStore.getState().token;

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Content-Type", "application/json");

  if (requiresAuth && token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...rest,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // Re-lanzar AbortError tal cual — handleError lo ignora silenciosamente.
    // Envolverlo en un nuevo Error perdería el name="AbortError" y el filtro fallaría.
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new Error("No fue posible conectar con el servidor");
  }

  const rawText = await response.text();

  // Usar `unknown` en lugar de `any` — obliga a verificar el tipo antes de usar el valor.
  // El cast final a `T` está justificado: en ese punto ya validamos
  // que response.ok es true y que data no es null.
  let data: unknown = null;

  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error("La respuesta del servidor no es JSON válido");
  }

  if (!response.ok) {
    // 401 — sesión inválida o expirada → cerrar sesión automáticamente
    if (response.status === 401 && requiresAuth) {
      useAuthStore.getState().logout();
      throw new Error(parseErrorMessage(data, "Sesión no válida"));
    }

    // 5xx — error interno del servidor
    if (response.status >= 500) {
      throw new Error(parseErrorMessage(data, "Ocurrió un error interno. Intenta nuevamente."));
    }

    // Cualquier otro error HTTP (400, 403, 404, etc.)
    throw new Error(parseErrorMessage(data, "Ocurrió un error en la petición"));
  }

  if (!data) {
    throw new Error("El servidor no devolvió información");
  }

  return data as T;
};